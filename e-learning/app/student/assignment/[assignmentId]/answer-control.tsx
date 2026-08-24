'use client';

import { useController } from 'react-hook-form';
import { Paperclip } from 'lucide-react';

import { questionPromptId } from '@/components/assignments/question-shell';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type { AttemptSectionProps } from '@/lib/attempt-form';
import type { StudentQuestion } from '@/lib/student-assignments';
import type { SubmissionFileRef } from '@/lib/assignments';
import type { UploadedSubmissionFile } from '@/lib/submission-upload';

import { AudioRecorder } from './audio-recorder';

type ControlProps = AttemptSectionProps & {
  question: StudentQuestion;
  /** Question index in form array. */
  index: number;
  submissionId: number;
  storageReady: boolean;
  recordedFiles: SubmissionFileRef[];
  pendingFiles: UploadedSubmissionFile[];
  onRecorded: (file: UploadedSubmissionFile) => void;
  onRemovePendingRecording: (file: UploadedSubmissionFile) => Promise<void>;
  onRemoveRecordedRecording: (fileId: number) => Promise<void>;
  onRecordingUpload: (upload: Promise<void>) => void;
};

const optionClass =
  'flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm font-normal text-ink transition-colors hover:bg-shell has-data-checked:border-accent-primary has-data-checked:bg-accent-primary-soft';

/** Multiple choice and true/false. */
function SingleChoiceAnswer({ form, disabled, question, index }: ControlProps) {
  const { field } = useController({
    control: form.control,
    name: `answers.${index}.choiceId`,
  });

  return (
    <RadioGroup
      name={field.name}
      value={field.value}
      onValueChange={(value) => field.onChange(String(value))}
      disabled={disabled}
      aria-labelledby={questionPromptId(question.id)}
    >
      {question.choices.map((choice) => {
        const id = `q${question.id}-c${choice.id}`;
        return (
          <div key={choice.id} className={optionClass} data-slot="option">
            <RadioGroupItem id={id} value={String(choice.id)} className="mt-0.5" />
            <Label htmlFor={id} className="min-w-0 flex-1 cursor-pointer font-normal">
              {choice.text}
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
}

/** Multi select any number of the options. */
function MultiChoiceAnswer({ form, disabled, question, index }: ControlProps) {
  const { field } = useController({
    control: form.control,
    name: `answers.${index}.choiceIds`,
  });
  const chosen: string[] = field.value ?? [];

  const toggle = (value: string, checked: boolean) => {
    field.onChange(
      checked ? [...chosen, value] : chosen.filter((entry) => entry !== value),
    );
  };

  return (
    <div
      role="group"
      aria-labelledby={questionPromptId(question.id)}
      className="grid gap-2"
    >
      {question.choices.map((choice) => {
        const id = `q${question.id}-c${choice.id}`;
        const value = String(choice.id);
        return (
          <div key={choice.id} className={optionClass}>
            <Checkbox
              id={id}
              className="mt-0.5"
              disabled={disabled}
              checked={chosen.includes(value)}
              onCheckedChange={(checked) => toggle(value, checked)}
            />
            <Label htmlFor={id} className="min-w-0 flex-1 cursor-pointer font-normal">
              {choice.text}
            </Label>
          </div>
        );
      })}
    </div>
  );
}

/** Short text and essays. */
function WrittenAnswer({ form, disabled, question, index }: ControlProps) {
  const registration = form.register(`answers.${index}.textAnswer`);
  const error = form.formState.errors.answers?.[index]?.textAnswer?.message;
  const id = `q${question.id}-text`;

  return (
    <>
      {question.kind === 'essay' ? (
        <Textarea
          id={id}
          rows={6}
          disabled={disabled}
          placeholder="Write your answer here..."
          aria-invalid={Boolean(error)}
          {...registration}
        />
      ) : (
        <Input
          id={id}
          disabled={disabled}
          placeholder="Your answer"
          aria-invalid={Boolean(error)}
          {...registration}
        />
      )}
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : null}
    </>
  );
}

/**
 * The control a question is answered with.
 */
export function AnswerControl(props: ControlProps) {
  const { kind } = props.question;

  if (kind === 'multi_select') return <MultiChoiceAnswer {...props} />;
  if (kind === 'multiple_choice' || kind === 'true_false') {
    return <SingleChoiceAnswer {...props} />;
  }
  if (kind === 'file_upload') {
    return (
      <p className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Paperclip aria-hidden="true" className="size-3.5 shrink-0" />
        Answer this by attaching a file under “Files to hand in”.
      </p>
    );
  }
  if (kind === 'audio_recording') {
    return (
      <AudioRecorder
        submissionId={props.submissionId}
        questionId={props.question.id}
        disabled={props.disabled}
        storageReady={props.storageReady}
        recordedFiles={props.recordedFiles}
        pendingFiles={props.pendingFiles}
        onRecorded={props.onRecorded}
        onRemovePending={props.onRemovePendingRecording}
        onRemoveRecorded={props.onRemoveRecordedRecording}
        onUploading={props.onRecordingUpload}
      />
    );
  }

  return <WrittenAnswer {...props} />;
}
