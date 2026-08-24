/**
 * The answers a students holds in the browser, on their way to and from the
 * database.
 */

import type { UseFormReturn } from 'react-hook-form';

import { questionHasChoices } from '@/lib/choices';
import type { AttemptAnswerInput, AttemptFormValues } from '@/lib/form-schemas';
import type { AttemptAnswer } from '@/lib/student-attempts';
import type { StudentQuestion } from '@/lib/student-assignments';

/** What the sections of the attempt form need from their parent. */
export type AttemptSectionProps = {
  form: UseFormReturn<AttemptFormValues>;
  disabled: boolean;
};

/** The three ways an answer can carry a value, whichever the question uses. */
export type AnswerValue = {
  selectedChoiceId: number | null;
  selectedChoiceIds: number[];
  textAnswer: string;
};

/**
 * Whether a question has been answered at all.
 */

export function isAnswered(kind: string, answer: AnswerValue): boolean {
  if (questionHasChoices(kind)) {
    return kind === 'multi_select'
      ? answer.selectedChoiceIds.length > 0
      : answer.selectedChoiceId !== null;
  }
  if (kind === 'file_upload' || kind === 'audio_recording') return false;
  return answer.textAnswer.trim().length > 0;
}

/**
 * The numbers of the required questions still to do, in the order they are
 * asked. Empty means the attempt may be handed in.
 */

export function missingRequiredAnswers(
  questions: { id: number; order: number; kind: string; isRequired: boolean }[],
  answers: (AnswerValue & { questionId: number })[],
  fileQuestionIds: Iterable<number | null>,
): number[] {
  const byQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  const files = new Set(fileQuestionIds);

  return questions
    .filter((item) => {
      if (!item.isRequired) return false;
      if (item.kind === 'file_upload') {
        return !(files.has(null) || files.has(item.id));
      }
      if (item.kind === 'audio_recording') return !files.has(item.id);
      const answer = byQuestion.get(item.id);
      return !answer || !isAnswered(item.kind, answer);
    })
    .map((item) => item.order);
}

/** Fill the form from what was last saved, so a resumed attempt looks unchanged. */
export function toAttemptFormValues(
  questions: StudentQuestion[],
  answers: AttemptAnswer[],
): AttemptFormValues {
  const byQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));

  return {
    answers: questions.map((item) => {
      const answer = byQuestion.get(item.id);
      return {
        questionId: item.id,
        choiceId: answer?.selectedChoiceId ? String(answer.selectedChoiceId) : '',
        choiceIds: (answer?.selectedChoiceIds ?? []).map(String),
        textAnswer: answer?.textAnswer ?? '',
      };
    }),
  };
}

/**
 * The payload the API takes. Which field carries the answer follows the question
 * kind rather than what the form happens to hold, and the API checks the same
 * thing again against the stored question.
 */
export function toAttemptAnswers(
  questions: StudentQuestion[],
  values: AttemptFormValues,
): AttemptAnswerInput[] {
  const byQuestion = new Map(questions.map((item) => [item.id, item]));

  return values.answers.flatMap((answer) => {
    const item = byQuestion.get(answer.questionId);
    if (!item) return [];

    const single = answer.choiceId ? Number(answer.choiceId) : null;
    return [
      {
        questionId: answer.questionId,
        selectedChoiceId:
          questionHasChoices(item.kind) && item.kind !== 'multi_select' ? single : null,
        selectedChoiceIds:
          item.kind === 'multi_select' ? answer.choiceIds.map(Number) : [],
        textAnswer:
          questionHasChoices(item.kind) ||
          item.kind === 'file_upload' ||
          item.kind === 'audio_recording'
            ? ''
            : answer.textAnswer,
      },
    ];
  });
}
