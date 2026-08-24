'use client';

import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useWatch } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import {
  CheckboxField,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/form/field';
import { Button } from '@/components/ui/button';
import { QUESTION_KINDS, questionHasChoices } from '@/lib/choices';
import { defaultChoices, type AssignmentSectionProps } from '@/lib/assignment-form';

import { ChoiceOptions } from './assignment-choice-options';

type QuestionEditorProps = AssignmentSectionProps & {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  storageReady: boolean;
};

function IconAction({
  label,
  icon: Icon,
  ...props
}: React.ComponentProps<typeof Button> & {
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Button type="button" variant="ghost" size="icon-sm" aria-label={label} {...props}>
      <Icon aria-hidden="true" />
    </Button>
  );
}

function QuestionToolbar({
  index,
  disabled,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
}: Omit<QuestionEditorProps, 'form' | 'storageReady'>) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <IconAction
        icon={ChevronUp}
        label={`Move question ${index + 1} up`}
        disabled={disabled || isFirst}
        onClick={onMoveUp}
      />
      <IconAction
        icon={ChevronDown}
        label={`Move question ${index + 1} down`}
        disabled={disabled || isLast}
        onClick={onMoveDown}
      />
      <IconAction
        icon={Trash2}
        label={`Remove question ${index + 1}`}
        disabled={disabled}
        onClick={onRemove}
        className="text-destructive hover:bg-destructive/10"
      />
    </div>
  );
}

export function QuestionEditor({ form, disabled, ...toolbar }: QuestionEditorProps) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form;
  const { index } = toolbar;
  const kind = useWatch({ control, name: `questions.${index}.kind` });
  const audio = useWatch({ control, name: `questions.${index}.audio` });
  const audioUrl = useWatch({ control, name: `questions.${index}.audioUrl` });
  const questionErrors = errors.questions?.[index];

  return (
    <div className="rounded-xl border border-border bg-background p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-bold text-ink-strong">
          <GripVertical aria-hidden="true" className="size-4 text-ink-subtle" />
          Question {index + 1}
        </span>
        <QuestionToolbar disabled={disabled} {...toolbar} />
      </div>

      {/*
        `id` is not rendered: `useFieldArray` keeps it in form state, and putting
        it in an input would turn the number into a string.
      */}

      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <SelectField
          id={`question-kind-${index}`}
          label="Answer type"
          className="sm:col-span-2"
          options={QUESTION_KINDS}
          disabled={disabled}
          {...register(`questions.${index}.kind`, {
            onChange: (event) => {
              // switching to or from a choice kind changes what options mean,
              // so start it off with a sensible set rather than a stale one
              setValue(`questions.${index}.choices`, defaultChoices(event.target.value));
            },
          })}
        />

        <TextField
          id={`question-points-${index}`}
          label="Points"
          inputMode="decimal"
          disabled={disabled}
          error={questionErrors?.points?.message}
          {...register(`questions.${index}.points`)}
        />

        <CheckboxField
          id={`question-required-${index}`}
          label="Required"
          className="flex items-end pb-2"
          disabled={disabled}
          {...register(`questions.${index}.isRequired`)}
        />

        <TextareaField
          id={`question-prompt-${index}`}
          label="Question"
          className="sm:col-span-4"
          rows={2}
          disabled={disabled}
          placeholder="What are you asking?"
          error={questionErrors?.prompt?.message}
          {...register(`questions.${index}.prompt`)}
        />

        <div className="sm:col-span-4">
          <label
            htmlFor={`question-audio-${index}`}
            className="mb-1.5 block text-sm font-semibold text-ink"
          >
            Listening audio (optional)
          </label>
          <Controller
            control={control}
            name={`questions.${index}.audio`}
            render={({ field: { onChange, onBlur, name, ref } }) => (
              <input
                ref={ref}
                id={`question-audio-${index}`}
                name={name}
                type="file"
                accept=".mp3,audio/mpeg"
                disabled={disabled || !toolbar.storageReady}
                onBlur={onBlur}
                onChange={(event) => onChange(event.target.files?.[0] ?? null)}
                className="block w-full cursor-pointer rounded-lg border border-border bg-background p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent-warm-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-accent-warm-strong disabled:opacity-50"
              />
            )}
          />
          {questionErrors?.audio?.message ? (
            <p className="mt-1.5 text-xs font-semibold text-destructive">
              {questionErrors.audio.message}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-ink-subtle">
              {audio
                ? `${audio.name} selected`
                : audioUrl
                  ? 'The current MP3 will be kept unless you choose another.'
                  : toolbar.storageReady
                    ? 'MP3 only, up to 25MB.'
                    : 'File storage is not configured.'}
            </p>
          )}
          {!audio && audioUrl ? (
            <audio controls preload="metadata" src={audioUrl} className="mt-2 w-full" />
          ) : null}
        </div>

        {questionHasChoices(kind) ? (
          <ChoiceOptions
            form={form}
            disabled={disabled}
            questionIndex={index}
            kind={kind}
          />
        ) : (
          <p className="text-xs text-ink-subtle sm:col-span-4">
            {kind === 'file_upload'
              ? 'Students answer this by uploading a file. You mark it by hand.'
              : 'You mark this answer by hand from the submission page.'}
          </p>
        )}

        <TextareaField
          id={`question-explanation-${index}`}
          label="Explanation"
          className="sm:col-span-4"
          rows={2}
          disabled={disabled}
          placeholder="Optional. Shown after submitting when answers are revealed."
          error={questionErrors?.explanation?.message}
          {...register(`questions.${index}.explanation`)}
        />
      </div>
    </div>
  );
}
