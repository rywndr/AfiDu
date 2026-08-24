import { Check, CircleCheck, Hourglass, Paperclip, X } from 'lucide-react';

import { QuestionShell } from '@/components/assignments/question-shell';
import { ScoreTotal } from '@/components/assignments/score';
import { SubmissionStatusPill } from '@/components/assignments/submission-status-pill';
import { Fact, FactGrid, FactValue } from '@/components/dashboard/facts';
import { FileActions, FileMeta } from '@/components/dashboard/file-links';
import { SectionHeading } from '@/components/form/form-shell';
import { formatDateTime, formatDuration, formatScore } from '@/lib/format';
import { questionHasChoices } from '@/lib/choices';
import type { SubmissionFileRef } from '@/lib/assignments';
import { recordingQuestionIdFromFilename } from '@/lib/recordings';
import type { AttemptAnswer, AttemptDetail } from '@/lib/student-attempts';
import type { StudentAssignment, StudentQuestion } from '@/lib/student-assignments';
import { cn } from '@/lib/utils';

type AttemptResultProps = {
  assignment: StudentAssignment;
  questions: StudentQuestion[];
  attempt: AttemptDetail;
};

const GRADED = ['graded', 'returned'];

/** What one option shows: the student's pick, and the key once it is revealed. */
function ChoiceRow({
  text,
  chosen,
  isCorrect,
}: {
  text: string;
  chosen: boolean;
  isCorrect: boolean | null;
}) {
  return (
    <li
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
        chosen && isCorrect
          ? 'border-accent-primary bg-accent-primary-soft text-accent-primary-strong'
          : chosen && isCorrect === false
            ? 'border-destructive/40 bg-destructive/5 text-destructive'
            : chosen
              ? 'border-accent-cool/40 bg-accent-cool-soft/50 text-ink'
              : isCorrect
                ? 'border-accent-primary/40 text-ink'
                : 'border-border text-ink-muted',
      )}
    >
      <span className="mt-0.5 shrink-0">
        {chosen && isCorrect === false ? (
          <X aria-hidden="true" className="size-4" />
        ) : chosen || isCorrect ? (
          <Check aria-hidden="true" className="size-4" />
        ) : (
          <span
            aria-hidden="true"
            className="block size-4 rounded-full border border-current opacity-40"
          />
        )}
      </span>
      <span className="min-w-0 flex-1 break-words">{text}</span>
      {isCorrect && !chosen ? (
        <span className="shrink-0 text-xs font-semibold uppercase">Answer</span>
      ) : null}
      {chosen ? (
        <span className="shrink-0 text-xs font-semibold uppercase">You</span>
      ) : null}
    </li>
  );
}

function AnswerSummary({
  question,
  answer,
  files,
  submissionId,
}: {
  question: StudentQuestion;
  answer: AttemptAnswer | undefined;
  files: SubmissionFileRef[];
  submissionId: number;
}) {
  if (questionHasChoices(question.kind)) {
    const chosen = new Set(
      answer
        ? [
            ...(answer.selectedChoiceId === null ? [] : [answer.selectedChoiceId]),
            ...answer.selectedChoiceIds,
          ]
        : [],
    );

    return (
      <ul className="flex flex-col gap-1.5">
        {question.choices.map((choice) => (
          <ChoiceRow
            key={choice.id}
            text={choice.text}
            chosen={chosen.has(choice.id)}
            isCorrect={choice.isCorrect}
          />
        ))}
      </ul>
    );
  }

  if (question.kind === 'audio_recording') {
    if (files.length === 0) {
      return <p className="text-sm text-ink-subtle italic">No recording found.</p>;
    }
    return (
      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase text-ink-soft">
          Your recording
        </p>
        {files.map((file) =>
          file.hasFile ? (
            <div key={file.id}>
              <audio
                controls
                preload="metadata"
                src={`/api/submissions/${submissionId}/files/${file.id}`}
                className="w-full"
              />
              <FileMeta
                filename={file.originalFilename}
                sizeBytes={file.sizeBytes}
              />
            </div>
          ) : (
            <p key={file.id} className="text-sm text-ink-subtle">
              Recording file missing.
            </p>
          ),
        )}
      </div>
    );
  }

  if (question.kind === 'file_upload') {
    return (
      <p className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Paperclip aria-hidden="true" className="size-3.5 shrink-0" />
        Answered with the files below.
      </p>
    );
  }

  return answer?.textAnswer.trim() ? (
    <div className="rounded-lg border border-border bg-white px-3 py-2.5 text-sm whitespace-pre-line text-ink">
      {answer.textAnswer}
    </div>
  ) : (
    <p className="text-sm text-ink-subtle italic">You left this blank.</p>
  );
}

/** Marks and comment on one answer, if there are any */
function AnswerMarks({ answer }: { answer: AttemptAnswer | undefined }) {
  if (!answer || (answer.awardedPoints === null && !answer.feedback)) return null;

  return (
    <div className="mt-2 flex flex-col gap-1 text-xs">
      {answer.awardedPoints !== null ? (
        <span
          className={cn(
            'font-semibold',
            answer.isCorrect === false ? 'text-destructive' : 'text-accent-primary',
          )}
        >
          {formatScore(answer.awardedPoints)} awarded
        </span>
      ) : null}
      {answer.feedback ? (
        <span className="text-ink-muted">
          <span className="font-semibold uppercase">Comment: </span>
          {answer.feedback}
        </span>
      ) : null}
    </div>
  );
}

/**
 * An attempt that has been handed in.
 *
 * The answer key is only in `questions` when the assignment reveals it, so this
 * renders whatever it is given without deciding that itself.
 */
export function AttemptResult({ assignment, questions, attempt }: AttemptResultProps) {
  const answers = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
  const isGraded = GRADED.includes(attempt.status);
  const validQuestionIds = new Set(questions.map((question) => question.id));
  const filesByQuestion = new Map<number, SubmissionFileRef[]>();
  const unattachedFiles: SubmissionFileRef[] = [];

  for (const file of attempt.files) {
    const inferredQuestionId = recordingQuestionIdFromFilename(
      file.originalFilename,
    );
    const questionId =
      file.questionId ??
      (inferredQuestionId !== null && validQuestionIds.has(inferredQuestionId)
        ? inferredQuestionId
        : null);
    if (questionId === null) {
      unattachedFiles.push(file);
      continue;
    }
    const linked = filesByQuestion.get(questionId);
    if (linked) linked.push(file);
    else filesByQuestion.set(questionId, [file]);
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <section className="rounded-2xl bg-white p-4 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionHeading>Attempt {attempt.attemptNumber}</SectionHeading>
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              <SubmissionStatusPill status={attempt.status} />
              {attempt.isLate ? (
                <span className="text-xs font-semibold text-accent-warm-strong">
                  Handed in late
                </span>
              ) : null}
            </p>
          </div>
          <ScoreTotal score={attempt.totalScore} maxPoints={assignment.maxPoints} />
        </div>

        <FactGrid>
          <Fact label="Handed in">
            <FactValue className="text-sm">
              {formatDateTime(attempt.submittedAt) || '-'}
            </FactValue>
          </Fact>
          <Fact label="Time taken">
            <FactValue className="text-sm">
              {formatDuration(attempt.timeSpentSeconds) || '-'}
            </FactValue>
          </Fact>
          <Fact label="Marked">
            <FactValue className="flex items-center gap-1.5 text-sm">
              {isGraded ? (
                <>
                  <CircleCheck aria-hidden="true" className="size-3.5 text-accent-primary" />
                  {formatDateTime(attempt.gradedAt) || 'Yes'}
                </>
              ) : (
                <>
                  <Hourglass aria-hidden="true" className="size-3.5 text-accent-warm" />
                  Waiting to be graded.
                </>
              )}
            </FactValue>
          </Fact>
        </FactGrid>

        {attempt.feedback ? (
          <p className="mt-4 rounded-xl bg-accent-primary-soft/60 px-3.5 py-3 text-sm whitespace-pre-line text-ink">
            <span className="font-semibold">Teacher’s comment: </span>
            {attempt.feedback}
          </p>
        ) : null}
      </section>

      {unattachedFiles.length > 0 ? (
        <section className="rounded-2xl bg-white p-4 shadow-card sm:p-6">
          <SectionHeading>Files you handed in</SectionHeading>
          <ul className="mt-4 flex flex-col gap-1.5">
            {unattachedFiles.map((file) => (
              <li
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <FileMeta filename={file.originalFilename} sizeBytes={file.sizeBytes} />
                {file.hasFile ? (
                  <FileActions href={`/api/submissions/${attempt.id}/files/${file.id}`} />
                ) : (
                  <span className="text-xs text-ink-subtle">File missing</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {questions.length > 0 ? (
        <section className="rounded-2xl bg-white p-4 shadow-card sm:p-6">
          <SectionHeading>Your answers</SectionHeading>
          <ol className="mt-4 flex flex-col gap-3">
            {questions.map((question) => {
              const answer = answers.get(question.id);
              return (
                <li key={question.id}>
                  <QuestionShell
                    questionId={question.id}
                    order={question.order}
                    prompt={question.prompt}
                    kind={question.kind}
                    points={question.points}
                    isRequired={false}
                  >
                    {question.audioUrl ? (
                      <div className="mb-3">
                        <p className="mb-1 text-xs font-semibold uppercase text-ink-soft">
                          Question audio
                        </p>
                        <audio
                          controls
                          preload="metadata"
                          src={question.audioUrl}
                          className="w-full"
                        />
                      </div>
                    ) : null}
                    <AnswerSummary
                      question={question}
                      answer={answer}
                      files={filesByQuestion.get(question.id) ?? []}
                      submissionId={attempt.id}
                    />
                    <AnswerMarks answer={answer} />
                    {question.explanation ? (
                      <p className="mt-2 text-xs text-ink-subtle">
                        <span className="font-semibold uppercase">Explanation: </span>
                        {question.explanation}
                      </p>
                    ) : null}
                  </QuestionShell>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
