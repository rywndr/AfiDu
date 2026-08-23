'use client';

import { useWatch } from 'react-hook-form';

import { SelectField, TextField, TextareaField } from '@/components/form/field';
import { FormGrid, FormSection } from '@/components/form/form-shell';
import { formatScore } from '@/lib/format';
import type { GradeSectionProps } from '@/lib/grade-form';

const STATUS_OPTIONS = [
  { value: 'graded', label: 'Graded' },
  { value: 'returned', label: 'Returned to student' },
  { value: 'submitted', label: 'Leave as submitted' },
] as const;

type ResultSectionProps = GradeSectionProps & {
  maxPoints: string;
  /** How many answers carry marks of their own, which the score defaults to. */
  markableCount: number;
};

/** The status, the score and the feedback the whole submission gets. */
export function GradeResultSection({
  form: {
    control,
    register,
    formState: { errors },
  },
  disabled,
  maxPoints,
  markableCount,
}: ResultSectionProps) {
  const watchedAnswers = useWatch({ control, name: 'answers' }) ?? [];
  const manualOverride = useWatch({ control, name: 'manualScore' });

  const awardedTotal = watchedAnswers.reduce(
    (total, answer) => total + (Number(answer?.awardedPoints) || 0),
    0,
  );

  return (
    <FormSection title="Result">
      <FormGrid>
        <SelectField
          id="grade-status"
          label="Status"
          options={STATUS_OPTIONS}
          disabled={disabled}
          error={errors.status?.message}
          {...register('status')}
        />

        <TextField
          id="grade-manual-score"
          label="Manual score"
          inputMode="decimal"
          disabled={disabled}
          placeholder={
            markableCount > 0 ? `Defaults to ${awardedTotal}` : 'Enter the score'
          }
          error={errors.manualScore?.message}
          hint={
            markableCount > 0
              ? `Leave empty to use the ${awardedTotal} awarded above. Objective questions are scored separately and added on top.`
              : 'The whole mark for this submission.'
          }
          {...register('manualScore')}
        />

        <TextareaField
          id="grade-feedback"
          label="Feedback to the student"
          className="sm:col-span-2"
          rows={4}
          disabled={disabled}
          placeholder="What went well and what to work on..."
          error={errors.feedback?.message}
          {...register('feedback')}
        />
      </FormGrid>

      <p className="mt-4 text-sm text-ink-muted">
        Out of {formatScore(maxPoints)} points.
        {manualOverride
          ? ` Manual score set to ${manualOverride}.`
          : markableCount > 0
            ? ` Manual score will be ${awardedTotal}.`
            : ''}
      </p>
    </FormSection>
  );
}
