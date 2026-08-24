'use client';

import { useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { FocusGuardDialog } from '@/components/assignments/focus-guard-dialog';
import { QuestionShell } from '@/components/assignments/question-shell';
import {
  FormAlert,
  FormEmptyNote,
  FormNotice,
  FormSection,
} from '@/components/form/form-shell';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api-client';
import {
  missingRequiredAnswers,
  toAttemptAnswers,
  toAttemptFormValues,
} from '@/lib/attempt-form';
import { attemptFormSchema, type AttemptFormValues } from '@/lib/form-schemas';
import { pluralize } from '@/lib/format';
import type { AttemptDetail } from '@/lib/student-attempts';
import type { StudentAssignment, StudentQuestion } from '@/lib/student-assignments';
import type { UploadedSubmissionFile } from '@/lib/submission-upload';
import { deletePendingSubmissionFile } from '@/lib/submission-upload';

import { AnswerControl } from './answer-control';
import { AttemptTimer, TimeUpDialog } from './attempt-timer';
import { AttemptUploads } from './attempt-uploads';

type AttemptFormProps = {
  assignment: StudentAssignment;
  questions: StudentQuestion[];
  attempt: AttemptDetail;
  /** False if object storage not setup, disables attachments. */
  storageReady: boolean;
  /** Seconds left on the assignment, null if no time limit. */
  secondsRemaining: number | null;
};

type Phase = 'idle' | 'saving' | 'submitting';

/**
 * The assignment as the student works on it.
 */
export function AttemptForm({
  assignment,
  questions,
  attempt,
  storageReady,
  secondsRemaining,
}: AttemptFormProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  // the countdown and a second press read the phase without waiting for a render
  const phaseRef = useRef<Phase>('idle');
  const [requestError, setRequestError] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedSubmissionFile[]>([]);
  // the same list as `files`, but readable the instant an upload finishes, when
  // the state a handler captured is still a render behind
  const filesRef = useRef<UploadedSubmissionFile[]>([]);
  const uploadsRef = useRef<Set<Promise<void>>>(new Set());
  const [timedOut, setTimedOut] = useState(false);
  // read after an await, where the captured state would be a render behind
  const timedOutRef = useRef(false);
  const [timeoutError, setTimeoutError] = useState<string | null>(null);
  const [handedIn, setHandedIn] = useState(false);

  const form = useForm<AttemptFormValues>({
    resolver: zodResolver(attemptFormSchema),
    defaultValues: toAttemptFormValues(questions, attempt.answers),
  });

  const busy = phase !== 'idle';
  const takesFiles =
    assignment.allowFileUpload ||
    questions.some((question) => question.kind === 'file_upload');
  const attemptsLeft = assignment.maxAttempts - assignment.attemptsUsed;

  const updateFiles = (
    update: (current: UploadedSubmissionFile[]) => UploadedSubmissionFile[],
  ) => {
    filesRef.current = update(filesRef.current);
    setFiles(filesRef.current);
  };

  /** Hold on to an upload so a hand-in can wait for it instead of losing it. */
  const trackUpload = (run: Promise<void>) => {
    // the children report their own upload failures, so this only has to settle
    const settled = run.catch(() => undefined);
    uploadsRef.current.add(settled);
    void settled.finally(() => uploadsRef.current.delete(settled));
  };

  const waitForUploads = async (): Promise<void> => {
    if (uploadsRef.current.size === 0) return;
    await Promise.all([...uploadsRef.current]);
  };

  const markTimedOut = () => {
    timedOutRef.current = true;
    setTimedOut(true);
  };

  const changePhase = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const save = async (
    values: AttemptFormValues,
    finalize: boolean,
  ): Promise<void> => {
    await apiRequest<{ success: true }>(`/api/submissions/${attempt.id}/attempt`, {
      method: 'PATCH',
      body: JSON.stringify({
        finalize,
        answers: toAttemptAnswers(questions, values),
        files: filesRef.current,
      }),
    });
  };

  const send = (finalize: boolean) =>
    form.handleSubmit(async (values) => {
      if (phaseRef.current !== 'idle') return;
      setRequestError(null);
      // the button goes busy first and the waiting happens under it, so a slow
      // upload delays the hand-in rather than the press
      changePhase(finalize ? 'submitting' : 'saving');
      await waitForUploads();

      if (finalize) {
        const missing = missingRequiredAnswers(
          questions,
          toAttemptAnswers(questions, values),
          [...attempt.files, ...filesRef.current].map((file) => file.questionId),
        );
        if (missing.length > 0) {
          changePhase('idle');
          setRequestError(
            `Answer question ${missing.join(', ')} before handing this in.`,
          );
          return;
        }
      }

      try {
        await save(values, finalize);

        updateFiles(() => []);
        // the clock ran out while this was in flight, so this request is the
        // hand-in the dialog is waiting on
        if (finalize && timedOutRef.current) setHandedIn(true);
        router.refresh();
        if (!finalize) changePhase('idle');
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Your answers could not be saved. Please try again.';
        changePhase('idle');
        // the dialog covers the page, so the inline alert would go unread
        if (finalize && timedOutRef.current) setTimeoutError(message);
        else setRequestError(message);
      }

      // the clock ran out during a draft save, which the server will not accept
      // once the time is up: hand in now that the write has finished
      if (!finalize && timedOutRef.current) void handOverToClock();
    })();

  /**
   * Auto hand-in if time's up
   */
  const handOverToClock = async () => {
    markTimedOut();
    setTimeoutError(null);
    changePhase('submitting');

    try {
      await waitForUploads();
      await save(form.getValues(), true);
      setHandedIn(true);
    } catch (error) {
      setTimeoutError(
        error instanceof Error
          ? error.message
          : 'Your answers could not be handed in. Please try again.',
      );
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void send(true);
      }}
      className="flex flex-col gap-4 sm:gap-5"
    >
      <FocusGuardDialog enabled={!timedOut} />

      <AttemptTimer
        secondsRemaining={secondsRemaining}
        onElapsed={() => {
          // a write already in flight is left to finish: a second finalize would
          // race it and the loser would report a failure that never happened
          if (phaseRef.current !== 'idle') markTimedOut();
          else void handOverToClock();
        }}
      />

      <TimeUpDialog
        open={timedOut}
        handedIn={handedIn}
        error={timeoutError}
        onRetry={() => void handOverToClock()}
        onLeave={() => router.refresh()}
      />

      <FormSection title={`Attempt ${attempt.attemptNumber} of ${assignment.maxAttempts}`}>
        {questions.length === 0 ? (
          <FormEmptyNote>
            This has no questions. Attach your work below and hand it in.
          </FormEmptyNote>
        ) : (
          <ol className="mt-4 flex flex-col gap-3">
            {questions.map((question, index) => (
              <li key={question.id}>
                <QuestionShell
                  questionId={question.id}
                  order={question.order}
                  prompt={question.prompt}
                  kind={question.kind}
                  points={question.points}
                  isRequired={question.isRequired}
                >
                  {question.audioUrl ? (
                    <audio
                      controls
                      preload="metadata"
                      src={question.audioUrl}
                      className="mb-3 w-full"
                    />
                  ) : null}
                  <AnswerControl
                    form={form}
                    disabled={busy}
                    question={question}
                    index={index}
                    submissionId={attempt.id}
                    storageReady={storageReady}
                    recordedFiles={attempt.files.filter(
                      (file) => file.questionId === question.id,
                    )}
                    pendingFiles={files.filter(
                      (file) => file.questionId === question.id,
                    )}
                    onRecorded={(file) =>
                      updateFiles((current) => [
                        ...current.filter(
                          (item) => item.questionId !== question.id,
                        ),
                        file,
                      ])
                    }
                    onRemovePendingRecording={async (file) => {
                      await deletePendingSubmissionFile(attempt.id, file);
                      updateFiles((current) =>
                        current.filter((item) => item.key !== file.key),
                      );
                    }}
                    onRemoveRecordedRecording={async (fileId) => {
                      await apiRequest<{ success: true }>(
                        `/api/submissions/${attempt.id}/files/${fileId}`,
                        { method: 'DELETE' },
                      );
                      router.refresh();
                    }}
                    onRecordingUpload={trackUpload}
                  />
                </QuestionShell>
              </li>
            ))}
          </ol>
        )}
      </FormSection>

      {takesFiles ? (
        <FormSection title="Files to hand in">
          {storageReady ? (
            <div className="mt-4">
              <AttemptUploads
                submissionId={attempt.id}
                recorded={attempt.files.filter((file) => file.questionId === null)}
                pending={files.filter((file) => file.questionId === null)}
                disabled={busy}
                onUploaded={(file) => updateFiles((current) => [...current, file])}
                onRemove={(key) =>
                  updateFiles((current) =>
                    current.filter((file) => file.key !== key),
                  )
                }
                onUploading={trackUpload}
              />
            </div>
          ) : (
            <FormNotice className="mt-4">
              <span>
                Something went wrong, please tell your teacher.
              </span>
            </FormNotice>
          )}
        </FormSection>
      ) : null}

      <FormAlert message={requestError} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <p className="text-xs text-ink-subtle sm:mr-auto">
          Handing in closes this attempt.{' '}
          {attemptsLeft > 1
            ? `You would have ${pluralize(attemptsLeft - 1, 'attempt')} left.`
            : 'It is your last attempt.'}
        </p>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={busy}
          onClick={() => void send(false)}
        >
          <Save aria-hidden="true" />
          {phase === 'saving' ? 'Saving…' : 'Save draft'}
        </Button>
        <Button type="submit" size="lg" disabled={busy}>
          <Send aria-hidden="true" />
          {phase === 'submitting' ? 'Handing in…' : 'Hand in'}
        </Button>
      </div>
    </form>
  );
}
