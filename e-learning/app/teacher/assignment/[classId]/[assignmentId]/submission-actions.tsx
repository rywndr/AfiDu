'use client';

import { useState, useTransition } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api-client';
import { pluralize } from '@/lib/format';

type ResetSubmissionButtonProps = {
  classId: number;
  assignmentId: number;
  studentId: number;
  studentName: string;
  attemptCount: number;
};

/** Deletes every attempt this student made, letting them hand in again. */
export function ResetSubmissionButton({
  classId,
  assignmentId,
  studentId,
  studentName,
  attemptCount,
}: ResetSubmissionButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    startTransition(async () => {
      setError(null);
      try {
        await apiRequest(`/api/assignments/${assignmentId}/submissions`, {
          method: 'DELETE',
          body: JSON.stringify({ classId, studentId }),
        });
        setConfirming(false);
        router.refresh();
      } catch (requestError) {
        setConfirming(false);
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Could not reset the submission.',
        );
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => setConfirming(true)}
        aria-label={`Reset ${studentName}'s submission`}
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : (
          <RotateCcw aria-hidden="true" />
        )}
        Reset
      </Button>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        icon={RotateCcw}
        title={`Reset ${studentName}'s submission?`}
        description={`This deletes ${pluralize(
          attemptCount,
          'attempt',
        )}, along with the marks and any uploaded files, so ${studentName} can start again. It cannot be undone.`}
        confirmLabel="Reset submission"
        pending={pending}
        onConfirm={reset}
      />

      {error ? (
        <span
          role="alert"
          className="max-w-56 text-right text-xs font-semibold text-destructive"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
