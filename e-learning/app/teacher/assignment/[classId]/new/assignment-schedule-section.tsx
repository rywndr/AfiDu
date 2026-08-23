'use client';

import { useWatch } from 'react-hook-form';

import {
  CheckboxField,
  SelectField,
  TextField,
} from '@/components/form/field';
import { FormGrid, FormSection } from '@/components/form/form-shell';
import { SEMESTERS } from '@/lib/choices';
import type { AssignmentSectionProps } from '@/lib/assignment-form';

/** The booleans of the form, which are all the same shape of control. */
const TOGGLES = [
  {
    name: 'allowLate',
    label: 'Accept late submissions',
    hint: 'Students can still submit after the due date.',
  },
  {
    name: 'allowFileUpload',
    label: 'Allow file uploads',
    hint: 'Students may attach a file to their submission.',
  },
  {
    name: 'autoGrade',
    label: 'Mark objective questions on submit',
    hint: 'Choice questions are scored from their answer key.',
  },
  {
    name: 'shuffleQuestions',
    label: 'Shuffle the question order',
  },
  {
    name: 'revealAnswersAfterSubmit',
    label: 'Reveal answers after submitting',
    hint: 'Shows the answer key and explanations once an attempt is handed in.',
  },
] as const;

export function AssignmentScheduleSection({
  form: {
    control,
    register,
    setValue,
    formState: { errors },
  },
  disabled,
}: AssignmentSectionProps) {
  const watchedQuestions = useWatch({ control, name: 'questions' }) ?? [];

  /** What the questions add up to, which is not necessarily `maxPoints`. */
  const questionTotal = watchedQuestions.reduce(
    (total, item) => total + (Number(item?.points) || 0),
    0,
  );

  return (
    <FormSection title="Schedule and marks">
      <FormGrid>
        <TextField
          id="openAt"
          label="Opens"
          type="datetime-local"
          disabled={disabled}
          error={errors.openAt?.message}
          {...register('openAt')}
        />

        <TextField
          id="dueAt"
          label="Due"
          type="datetime-local"
          disabled={disabled}
          error={errors.dueAt?.message}
          hint="Times are Asia/Jakarta, the same as the internal app."
          {...register('dueAt')}
        />

        <TextField
          id="maxPoints"
          label="Total points"
          inputMode="decimal"
          disabled={disabled}
          error={errors.maxPoints?.message}
          hint={
            watchedQuestions.length > 0 ? (
              <span className="flex flex-wrap items-center gap-2">
                <span>The questions add up to {questionTotal}.</span>
                <button
                  type="button"
                  className="font-semibold text-accent-primary hover:underline"
                  onClick={() => setValue('maxPoints', String(questionTotal))}
                >
                  Use that
                </button>
              </span>
            ) : undefined
          }
          {...register('maxPoints')}
        />

        <TextField
          id="maxAttempts"
          label="Attempts allowed"
          inputMode="numeric"
          disabled={disabled}
          error={errors.maxAttempts?.message}
          {...register('maxAttempts')}
        />

        <TextField
          id="timeLimitMinutes"
          label="Time limit (minutes)"
          inputMode="numeric"
          disabled={disabled}
          placeholder="Leave empty for untimed"
          error={errors.timeLimitMinutes?.message}
          {...register('timeLimitMinutes')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="year"
            label="Score year"
            inputMode="numeric"
            disabled={disabled}
            placeholder="Optional"
            error={errors.year?.message}
            {...register('year')}
          />

          <SelectField
            id="semester"
            label="Semester"
            options={SEMESTERS}
            placeholder="None"
            disabled={disabled}
            error={errors.semester?.message}
            {...register('semester')}
          />
        </div>
      </FormGrid>

      <div className="mt-5 grid gap-3 border-t border-shell-divider pt-5 sm:grid-cols-2">
        {TOGGLES.map((toggle) => (
          <CheckboxField
            key={toggle.name}
            id={toggle.name}
            label={toggle.label}
            hint={'hint' in toggle ? toggle.hint : undefined}
            disabled={disabled}
            error={errors[toggle.name]?.message}
            {...register(toggle.name)}
          />
        ))}
      </div>
    </FormSection>
  );
}
