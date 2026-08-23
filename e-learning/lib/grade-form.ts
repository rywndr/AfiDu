/**
 * The mapping either side of the grading form, and the rule for which answers a
 * teacher marks by hand. Choice answers are scored from their key by the API
 * when the form is saved, so they carry no fields.
 */
import type { UseFormReturn } from 'react-hook-form';

import { formatScore } from '@/lib/format';
import type { GradeFormValues, GradeSubmissionInput } from '@/lib/form-schemas';
import type { AnswerDetail, SubmissionDetail } from '@/lib/assignments';

/** What the sections of the form need from their parent. */
export type GradeSectionProps = {
  form: UseFormReturn<GradeFormValues>;
  disabled: boolean;
};

/** Free-text and upload answers that the student actually gave. */
export function markableAnswers(submission: SubmissionDetail): AnswerDetail[] {
  return submission.answers.filter(
    (answer) => !answer.autoGradable && answer.answerId !== null,
  );
}

export function toGradeFormValues(
  submission: SubmissionDetail,
  markable: AnswerDetail[],
): GradeFormValues {
  return {
    status: submission.status === 'returned' ? 'returned' : 'graded',
    feedback: submission.feedback,
    manualScore: formatScore(submission.manualScore),
    answers: markable.map((answer) => ({
      answerId: answer.answerId as number,
      awardedPoints: formatScore(answer.awardedPoints),
      feedback: answer.feedback,
    })),
  };
}

export function toGradeInput(
  assignmentId: number,
  values: GradeFormValues,
): GradeSubmissionInput {
  return {
    assignmentId,
    status: values.status,
    feedback: values.feedback,
    manualScore: values.manualScore ? Number(values.manualScore) : null,
    answers: values.answers.map((answer) => ({
      answerId: answer.answerId,
      awardedPoints: answer.awardedPoints ? Number(answer.awardedPoints) : null,
      feedback: answer.feedback,
    })),
  };
}
