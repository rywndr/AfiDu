'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { FormAlert, FormSubmitRow } from '@/components/form/form-shell';
import { apiRequest } from '@/lib/api-client';
import {
  toAssignmentFormValues,
  toAssignmentInput,
} from '@/lib/assignment-form';
import {
  assignmentFormSchema,
  type AssignmentFormValues,
} from '@/lib/form-schemas';
import type { EditableAssignment, MaterialOption } from '@/lib/assignments';
import { uploadQuestionAudio } from '@/lib/question-audio-upload';

import { AssignmentDetailsSection } from './assignment-details-section';
import { AssignmentQuestionsSection } from './assignment-questions-section';
import { AssignmentScheduleSection } from './assignment-schedule-section';

type AssignmentFormProps = {
  classId: number;
  suggestedLevel: string | null;
  materials: MaterialOption[];
  storageReady: boolean;
  initialAssignment?: EditableAssignment;
};

export function AssignmentForm({
  classId,
  suggestedLevel,
  materials,
  storageReady,
  initialAssignment,
}: AssignmentFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialAssignment);
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: toAssignmentFormValues(initialAssignment, suggestedLevel),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (saving) return;
    setSaving(true);
    setRequestError(null);

    try {
      const uploadedAudio = await Promise.all(
        values.questions.map((question) =>
          question.audio
            ? uploadQuestionAudio(classId, question.audio)
            : Promise.resolve(null),
        ),
      );

      await apiRequest<{ success: true }>(
        initialAssignment
          ? `/api/assignments/${initialAssignment.id}`
          : '/api/assignments',
        {
          method: initialAssignment ? 'PATCH' : 'POST',
          body: JSON.stringify(
            toAssignmentInput(classId, values, uploadedAudio),
          ),
        },
      );

      router.push(`/teacher/assignment/${classId}`);
      router.refresh();
    } catch (error) {
      setSaving(false);
      setRequestError(
        error instanceof Error
          ? error.message
          : `Could not ${isEditing ? 'update' : 'create'} the assignment. Please try again.`,
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 sm:gap-6">
      <AssignmentDetailsSection
        form={form}
        disabled={saving}
        suggestedLevel={suggestedLevel}
        materials={materials}
      />
      <AssignmentScheduleSection form={form} disabled={saving} />
      <AssignmentQuestionsSection
        form={form}
        disabled={saving}
        storageReady={storageReady}
      />

      <FormAlert message={requestError} />

      <FormSubmitRow busy={saving}>
        <Save aria-hidden="true" />
        {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create assignment'}
      </FormSubmitRow>
    </form>
  );
}
