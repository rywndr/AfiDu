'use client';

import { useState, useTransition } from 'react';
import { Ellipsis, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiRequest } from '@/lib/api-client';

type AssignmentActionProps = {
  classId: number;
  assignmentId: number;
  title: string;
  submissionCount: number;
};

/** What deleting takes with it, spelled out before the teacher confirms. */
function confirmMessage(title: string, submissionCount: number): string {
  const submissions =
    submissionCount > 0
      ? ` This also deletes ${submissionCount} submission${
          submissionCount === 1 ? '' : 's'
        } and the marks on ${submissionCount === 1 ? 'it' : 'them'}.`
      : '';
  return `Delete "${title}"?${submissions}`;
}

function useDeleteAssignment({
  classId,
  assignmentId,
  title,
  submissionCount,
}: AssignmentActionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (!window.confirm(confirmMessage(title, submissionCount))) return;

    startTransition(async () => {
      setError(null);
      try {
        await apiRequest(`/api/assignments/${assignmentId}`, {
          method: 'DELETE',
          body: JSON.stringify({ classId }),
        });
        router.refresh();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Could not delete the assignment.',
        );
      }
    });
  }

  return { pending, error, remove };
}

export function DeleteAssignmentButton(props: AssignmentActionProps) {
  const { pending, error, remove } = useDeleteAssignment(props);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={remove}
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : (
          <Trash2 aria-hidden="true" />
        )}
        Delete
      </Button>
      {error ? (
        <span role="alert" className="text-xs font-semibold text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function DeleteAssignmentMenu(props: AssignmentActionProps) {
  const { title } = props;
  const { pending, error, remove } = useDeleteAssignment(props);

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Open actions for ${title}`}
              disabled={pending}
            />
          }
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Ellipsis aria-hidden="true" />
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            nativeButton
            variant="destructive"
            className="w-full"
            disabled={pending}
            render={<button type="button" onClick={remove} />}
          >
            <Trash2 aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
