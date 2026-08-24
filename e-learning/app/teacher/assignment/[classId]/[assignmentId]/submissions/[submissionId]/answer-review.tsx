'use client';

import { Check, X } from 'lucide-react';

import { TextField, TextareaField } from '@/components/form/field';
import { Pill } from '@/components/dashboard/pill';
import { questionKindLabel } from '@/lib/choices';
import { formatScore, pluralize } from '@/lib/format';
import type { GradeSectionProps } from '@/lib/grade-form';
import { cn } from '@/lib/utils';
import type { AnswerDetail } from '@/lib/assignments';

import { SubmissionFiles } from './submission-files';

/** The options of a choice question, with the key and the student's pick. */
function ChoiceAnswer({ answer }: { answer: AnswerDetail }) {
  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {answer.choices.map((choice) => (
        <li
          key={choice.id}
          className={cn(
            'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
            choice.chosen && choice.isCorrect
              ? 'border-accent-primary bg-accent-primary-soft text-accent-primary-strong'
              : choice.chosen
                ? 'border-destructive/40 bg-destructive/5 text-destructive'
                : choice.isCorrect
                  ? 'border-accent-primary/40 bg-transparent text-ink'
                  : 'border-border text-ink-muted',
          )}
        >
          <span className="mt-0.5 shrink-0">
            {choice.chosen ? (
              choice.isCorrect ? (
                <Check aria-hidden="true" className="size-4" />
              ) : (
                <X aria-hidden="true" className="size-4" />
              )
            ) : (
              <span
                aria-hidden="true"
                className="block size-4 rounded-full border border-current opacity-40"
              />
            )}
          </span>
          <span className="min-w-0 flex-1 break-words">{choice.text}</span>
          {choice.isCorrect ? (
            <span className="shrink-0 text-xs font-semibold uppercase">Key</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** What the API made of a choice answer when the attempt came in. */
function AutoResult({ answer }: { answer: AnswerDetail }) {
  if (answer.answerId === null) {
    return <span className="text-xs font-semibold text-ink-subtle">Unanswered</span>;
  }
  if (answer.isCorrect === null) {
    return (
      <span className="text-xs font-semibold text-ink-subtle">
        Not scored — no answer key set
      </span>
    );
  }
  return (
    <span
      className={cn(
        'text-xs font-semibold',
        answer.isCorrect ? 'text-accent-primary' : 'text-destructive',
      )}
    >
      {answer.isCorrect ? 'Correct' : 'Incorrect'}
      {answer.awardedPoints !== null
        ? ` · ${formatScore(answer.awardedPoints)} of ${formatScore(answer.points)}`
        : ''}
    </span>
  );
}

/** The points and comment a teacher gives one answer. */
function AnswerMarks({
  form: {
    register,
    formState: { errors },
  },
  disabled,
  answer,
  fieldIndex,
}: GradeSectionProps & { answer: AnswerDetail; fieldIndex: number }) {
  const fieldErrors = errors.answers?.[fieldIndex];

  return (
    <div className="mt-3 grid gap-3 border-t border-shell-divider pt-3 sm:grid-cols-[8rem_1fr]">
      <TextField
        id={`awarded-${answer.questionId}`}
        label="Points"
        inputMode="decimal"
        disabled={disabled}
        placeholder={`0 – ${formatScore(answer.points)}`}
        error={fieldErrors?.awardedPoints?.message}
        {...register(`answers.${fieldIndex}.awardedPoints`)}
      />

      <TextareaField
        id={`answer-feedback-${answer.questionId}`}
        label="Comment"
        rows={2}
        disabled={disabled}
        placeholder="Optional comment for this answer..."
        error={fieldErrors?.feedback?.message}
        {...register(`answers.${fieldIndex}.feedback`)}
      />
    </div>
  );
}

type AnswerReviewProps = GradeSectionProps & {
  answer: AnswerDetail;
  submissionId: number;
  /** Where this answer sits in the form array, if it is marked by hand. */
  fieldIndex?: number;
};

/** One question: what the student answered and, where needed, its marks. */
export function AnswerReview({
  form,
  disabled,
  answer,
  submissionId,
  fieldIndex,
}: AnswerReviewProps) {
  return (
    <div className="rounded-xl border border-border bg-background p-3.5 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold break-words text-ink-strong">
          {answer.order}. {answer.prompt}
        </p>
        <Pill className="shrink-0 bg-shell text-ink-soft">
          {questionKindLabel(answer.kind)} ·{' '}
          {pluralize(Number(answer.points), 'pt')}
        </Pill>
      </div>

      {answer.audioUrl ? (
        <audio controls preload="metadata" src={answer.audioUrl} className="mt-2 w-full" />
      ) : null}

      {answer.autoGradable ? (
        <>
          <ChoiceAnswer answer={answer} />
          <p className="mt-2">
            <AutoResult answer={answer} />
          </p>
        </>
      ) : answer.answerId === null ? (
        <p className="mt-2 text-sm text-ink-subtle italic">Not answered.</p>
      ) : (
        <div className="mt-2 rounded-lg border border-border bg-white px-3 py-2.5 text-sm whitespace-pre-line text-ink">
          {answer.textAnswer.trim() || (
            <span className="text-ink-subtle italic">No written answer.</span>
          )}
        </div>
      )}

      <SubmissionFiles
        submissionId={submissionId}
        files={answer.files}
        inlineAudio={answer.kind === 'audio_recording'}
      />

      {fieldIndex === undefined ? null : (
        <AnswerMarks
          form={form}
          disabled={disabled}
          answer={answer}
          fieldIndex={fieldIndex}
        />
      )}

      {answer.explanation ? (
        <p className="mt-2 text-xs text-ink-subtle">
          <span className="font-semibold uppercase">Explanation: </span>
          {answer.explanation}
        </p>
      ) : null}
    </div>
  );
}
