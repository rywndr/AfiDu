'use client';

import { ExternalLink } from 'lucide-react';
import { useWatch } from 'react-hook-form';

import {
  CheckboxField,
  SelectField,
  TextField,
} from '@/components/form/field';
import { FormGrid, FormSection } from '@/components/form/form-shell';
import { SCORE_YEARS, SEMESTERS, scoreTargetLabel } from '@/lib/choices';
import type { AssignmentSectionProps } from '@/lib/assignment-form';
import { scoreListUrl } from '@/lib/management-links';
import {
  resolvedExerciseCount,
  scoreTargetFitsConfig,
  scoreTargetOptions,
  type ScoreConfigSnapshot,
} from '@/lib/score-config';

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
  scoreConfigs,
}: AssignmentSectionProps & { scoreConfigs: ScoreConfigSnapshot[] }) {
  const watchedQuestions = useWatch({ control, name: 'questions' }) ?? [];
  const scoreYear = useWatch({ control, name: 'year' });
  const scoreSemester = useWatch({ control, name: 'semester' });
  const scoreCategory = useWatch({ control, name: 'category' });
  const scoreTarget = useWatch({ control, name: 'scoreTarget' });
  const exerciseCount = resolvedExerciseCount(scoreConfigs, {
    year: scoreYear ? Number(scoreYear) : null,
    semester: scoreSemester || null,
    category: scoreCategory,
  });
  const configuredTargets = scoreTargetOptions(exerciseCount);
  const targetOptions =
    scoreTarget && !scoreTargetFitsConfig(scoreTarget, exerciseCount)
      ? [
          ...configuredTargets,
          {
            value: scoreTarget,
            label: `${scoreTargetLabel(scoreTarget)} (not configured)`,
            disabled: true,
          },
        ]
      : configuredTargets;
  const scoreHref = scoreListUrl({
    year: scoreYear,
    semester: scoreSemester,
    category: scoreCategory,
  });

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
          max={100}
          disabled={disabled}
          error={errors.maxPoints?.message}
          hint={
            <span className="flex flex-wrap items-center gap-2">
              <span>Maximum points: 100.</span>
              {watchedQuestions.length > 0 ? (
                <>
                  <span>The questions add up to {questionTotal}.</span>
                  <button
                    type="button"
                    className="font-semibold text-accent-primary hover:underline"
                    onClick={() => setValue('maxPoints', String(questionTotal))}
                  >
                    Use that
                  </button>
                </>
              ) : null}
            </span>
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

        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
          <SelectField
            id="year"
            label="Score year"
            options={SCORE_YEARS}
            placeholder="None"
            disabled={disabled}
            error={errors.year?.message}
            {...register('year')}
          />

          <SelectField
            id="semester"
            label="Semester"
            labelAction={
              scoreHref ? (
                <a
                  href={scoreHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent-primary hover:underline"
                >
                  Open score list
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              ) : undefined
            }
            options={SEMESTERS}
            placeholder="None"
            disabled={disabled}
            error={errors.semester?.message}
            hint="Choose a year and semester to connect this assignment to the matching score period."
            {...register('semester')}
          />

          <SelectField
            id="scoreTarget"
            label="Score field"
            options={targetOptions}
            placeholder="Not linked"
            disabled={disabled}
            error={errors.scoreTarget?.message}
            hint={`This score period has ${exerciseCount} exercise ${exerciseCount === 1 ? 'field' : 'fields'}. Marked results are converted to a percentage.`}
            {...register('scoreTarget')}
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
