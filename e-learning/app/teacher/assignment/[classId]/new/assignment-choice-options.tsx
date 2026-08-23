'use client';

import { Plus, Trash2, Wand2 } from 'lucide-react';
import { useFieldArray } from 'react-hook-form';

import {
  FieldError,
  InlineCheckbox,
  labelClass,
} from '@/components/form/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AssignmentSectionProps } from '@/lib/assignment-form';

type ChoiceOptionsProps = AssignmentSectionProps & {
  questionIndex: number;
  kind: string;
};

/**
 * The answer key of a choice question. Only mounted for the kinds that carry
 * choices; the values themselves are kept in form state either way.
 */
export function ChoiceOptions({
  form,
  disabled,
  questionIndex,
  kind,
}: ChoiceOptionsProps) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form;
  const choices = useFieldArray({
    control,
    name: `questions.${questionIndex}.choices`,
  });

  const choiceErrors = errors.questions?.[questionIndex]?.choices;
  // an issue on the array itself lands on `root`, not on `message`
  const arrayMessage =
    choiceErrors && 'root' in choiceErrors
      ? choiceErrors.root?.message
      : choiceErrors?.message;

  return (
    <div className="flex flex-col gap-2 sm:col-span-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={labelClass}>
          Options{' '}
          {kind === 'multi_select'
            ? '(tick every correct one)'
            : '(tick the correct one)'}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={disabled}
          onClick={() => choices.append({ text: '', isCorrect: false })}
        >
          <Plus aria-hidden="true" />
          Add option
        </Button>
      </div>

      <ul className="flex flex-col gap-2">
        {choices.fields.map((choice, choiceIndex) => (
          <li key={choice.id} className="flex items-start gap-2">
            <InlineCheckbox
              className="mt-3"
              aria-label={`Option ${choiceIndex + 1} is correct`}
              disabled={disabled}
              {...register(
                `questions.${questionIndex}.choices.${choiceIndex}.isCorrect`,
                {
                  onChange: (event) => {
                    // one answer only, unless the question is multi-select
                    if (kind === 'multi_select' || !event.target.checked) return;
                    choices.fields.forEach((_, other) => {
                      if (other !== choiceIndex) {
                        setValue(
                          `questions.${questionIndex}.choices.${other}.isCorrect`,
                          false,
                        );
                      }
                    });
                  },
                },
              )}
            />
            <div className="min-w-0 flex-1">
              <Input
                aria-label={`Option ${choiceIndex + 1}`}
                maxLength={500}
                disabled={disabled}
                placeholder={`Option ${choiceIndex + 1}`}
                aria-invalid={Boolean(choiceErrors?.[choiceIndex]?.text)}
                {...register(
                  `questions.${questionIndex}.choices.${choiceIndex}.text`,
                )}
              />
              <FieldError message={choiceErrors?.[choiceIndex]?.text?.message} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove option ${choiceIndex + 1}`}
              disabled={disabled || choices.fields.length <= 2}
              onClick={() => choices.remove(choiceIndex)}
              className="mt-0.5 text-destructive hover:bg-destructive/10"
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>

      <FieldError message={arrayMessage} />

      {kind === 'true_false' && choices.fields.length !== 2 ? (
        <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
          <Wand2 aria-hidden="true" className="size-3.5" />
          True / false questions usually have exactly two options.
        </p>
      ) : null}
    </div>
  );
}
