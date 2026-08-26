'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
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
import type { ScoreConfigSnapshot } from '@/lib/score-config';

import { AssignmentDetailsSection } from './assignment-details-section';
import { AssignmentQuestionsSection } from './assignment-questions-section';
import { AssignmentScheduleSection } from './assignment-schedule-section';

type AssignmentFormProps = {
  classId: number;
  suggestedLevel: string | null;
  materials: MaterialOption[];
  storageReady: boolean;
  scoreConfigs: ScoreConfigSnapshot[];
  initialAssignment?: EditableAssignment;
};

export function AssignmentForm({
  classId,
  suggestedLevel,
  materials,
  storageReady,
  scoreConfigs,
  initialAssignment,
}: AssignmentFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialAssignment);
  const isPublished = initialAssignment?.status === 'published';
  const [saving, setSaving] = useState(false);
  const disabled = saving || isPublished;
  const [requestError, setRequestError] = useState<string | null>(null);
  const [pendingPublication, setPendingPublication] =
    useState<AssignmentFormValues | null>(null);

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: toAssignmentFormValues(initialAssignment, suggestedLevel),
  });

  async function saveAssignment(values: AssignmentFormValues) {
    if (disabled) return;
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
  }

  const onSubmit = form.handleSubmit((values) => {
    if (!isPublished && values.status === 'published') {
      setPendingPublication(values);
      return;
    }

    return saveAssignment(values);
  });

  function confirmPublication() {
    if (!pendingPublication) return;
    const values = pendingPublication;
    setPendingPublication(null);
    void saveAssignment(values);
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 sm:gap-6">
        <AssignmentDetailsSection
          form={form}
          disabled={disabled}
          suggestedLevel={suggestedLevel}
          materials={materials}
        />
        <AssignmentScheduleSection
          form={form}
          disabled={disabled}
          scoreConfigs={scoreConfigs}
        />
        <AssignmentQuestionsSection
          form={form}
          disabled={disabled}
          storageReady={storageReady}
        />

        <FormAlert message={requestError} />

        <FormSubmitRow busy={disabled}>
          <Save aria-hidden="true" />
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create assignment'}
        </FormSubmitRow>
      </form>

      <ConfirmDialog
        open={pendingPublication !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPublication(null);
        }}
        title="Publish this assignment?"
        description="Once published, this assignment cannot be edited. Check the details and questions before continuing."
        confirmLabel="Publish assignment"
        onConfirm={confirmPublication}
      />
    </>
  );
}
