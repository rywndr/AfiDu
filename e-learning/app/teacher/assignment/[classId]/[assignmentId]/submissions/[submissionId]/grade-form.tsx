'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { labelClass } from '@/components/form/field';
import {
  FormAlert,
  FormEmptyNote,
  FormSection,
  FormSubmitRow,
} from '@/components/form/form-shell';
import { apiRequest } from '@/lib/api-client';
import { gradeFormSchema, type GradeFormValues } from '@/lib/form-schemas';
import { markableAnswers, toGradeFormValues, toGradeInput } from '@/lib/grade-form';
import type { SubmissionDetail } from '@/lib/assignments';

import { AnswerReview } from './answer-review';
import { GradeResultSection } from './grade-result-section';
import { SubmissionFiles } from './submission-files';

type GradeFormProps = {
  classId: number;
  assignmentId: number;
  submission: SubmissionDetail;
};

export function GradeForm({ classId, assignmentId, submission }: GradeFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const markable = markableAnswers(submission);
  const fieldIndexByAnswerId = new Map(
    markable.map((answer, index) => [answer.answerId as number, index]),
  );

  const form = useForm<GradeFormValues>({
    resolver: zodResolver(gradeFormSchema),
    defaultValues: toGradeFormValues(submission, markable),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (saving) return;
    setSaving(true);
    setRequestError(null);

    try {
      await apiRequest<{ success: true }>(`/api/submissions/${submission.id}/grade`, {
        method: 'PATCH',
        body: JSON.stringify(toGradeInput(assignmentId, values)),
      });

      router.push(`/teacher/assignment/${classId}/${assignmentId}`);
      router.refresh();
    } catch (error) {
      setSaving(false);
      setRequestError(
        error instanceof Error
          ? error.message
          : 'Could not save the marks. Please try again.',
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 sm:gap-6">
      <FormSection title="Answers">
        {submission.answers.length === 0 ? (
          <FormEmptyNote>
            This assignment has no questions. Mark it with the score below.
          </FormEmptyNote>
        ) : (
          <ol className="mt-4 flex flex-col gap-4">
            {submission.answers.map((answer) => (
              <li key={answer.questionId}>
                <AnswerReview
                  form={form}
                  disabled={saving}
                  answer={answer}
                  submissionId={submission.id}
                  fieldIndex={
                    answer.answerId === null
                      ? undefined
                      : fieldIndexByAnswerId.get(answer.answerId)
                  }
                />
              </li>
            ))}
          </ol>
        )}

        {submission.unattachedFiles.length > 0 ? (
          <div className="mt-4 border-t border-shell-divider pt-4">
            <p className={labelClass}>Files handed in</p>
            <SubmissionFiles
              submissionId={submission.id}
              files={submission.unattachedFiles}
            />
          </div>
        ) : null}
      </FormSection>

      <GradeResultSection
        form={form}
        disabled={saving}
        maxPoints={submission.maxPoints}
        markableCount={markable.length}
      />

      <FormAlert message={requestError} />

      <FormSubmitRow busy={saving}>
        <Save aria-hidden="true" />
        {saving ? 'Saving…' : 'Save marks'}
      </FormSubmitRow>
    </form>
  );
}
