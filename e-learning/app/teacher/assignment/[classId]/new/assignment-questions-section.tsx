'use client';

import { Plus } from 'lucide-react';
import { useFieldArray } from 'react-hook-form';

import { FormEmptyNote, FormSection } from '@/components/form/form-shell';
import { Button } from '@/components/ui/button';
import { emptyQuestion, type AssignmentSectionProps } from '@/lib/assignment-form';

import { QuestionEditor } from './assignment-question-editor';

export function AssignmentQuestionsSection({
  form,
  disabled,
  storageReady,
}: AssignmentSectionProps & { storageReady: boolean }) {
  const questions = useFieldArray({ control: form.control, name: 'questions' });

  return (
    <FormSection
      title={`Questions${questions.fields.length > 0 ? ` (${questions.fields.length})` : ''}`}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => questions.append(emptyQuestion())}
        >
          <Plus aria-hidden="true" />
          Add question
        </Button>
      }
    >
      {questions.fields.length === 0 ? (
        <FormEmptyNote>
          No questions yet. An assignment can be handed in as a file upload without
          them, or add questions for students to answer here.
        </FormEmptyNote>
      ) : (
        <ol className="mt-4 flex flex-col gap-4">
          {questions.fields.map((field, index) => (
            <li key={field.id}>
              <QuestionEditor
                form={form}
                disabled={disabled}
                storageReady={storageReady}
                index={index}
                isFirst={index === 0}
                isLast={index === questions.fields.length - 1}
                onMoveUp={() => questions.swap(index, index - 1)}
                onMoveDown={() => questions.swap(index, index + 1)}
                onRemove={() => questions.remove(index)}
              />
            </li>
          ))}
        </ol>
      )}
    </FormSection>
  );
}
