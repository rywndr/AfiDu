import type { ReactNode } from 'react';

import { Pill } from '@/components/dashboard/pill';
import { questionKindLabel } from '@/lib/choices';
import { formatScore } from '@/lib/format';

/** The id of a question's prompt, so a control can point its label at it. */
export function questionPromptId(questionId: number): string {
  return `question-${questionId}-prompt`;
}

/**
 * The frame every question is shown in, whether it is being answered or read
 * back afterwards: its number, prompt, type and what it is worth.
 */
export function QuestionShell({
  questionId,
  order,
  prompt,
  kind,
  points,
  isRequired,
  aside,
  children,
}: {
  questionId: number;
  order: number;
  prompt: string;
  kind: string;
  points: string;
  isRequired: boolean;
  /** Shown under the prompt, for a result or a per-question notice. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3.5 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p
          id={questionPromptId(questionId)}
          className="min-w-0 flex-1 text-sm font-semibold break-words text-ink-strong"
        >
          {order}. {prompt}
          {isRequired ? (
            <span aria-label="required" className="ml-1 text-destructive">
              *
            </span>
          ) : null}
        </p>
        <Pill className="shrink-0 bg-shell text-ink-soft">
          {questionKindLabel(kind)} · {formatScore(points)} pt
        </Pill>
      </div>

      {aside}
      <div className="mt-3">{children}</div>
    </div>
  );
}
