'use client';

import { useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ellipsis, Link2, Loader2, Pencil, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';

import { SearchablePicker } from '@/components/form/searchable-picker';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiRequest } from '@/lib/api-client';
import {
  assignmentLinkFormSchema,
  type AssignmentLinkFormValues,
} from '@/lib/form-schemas';
import type { LinkableAssignment, LinkedAssignment } from '@/lib/study-materials';

/**
 * The assignment side of a module.
 *
 * `Assignment.material` is a FK on the assignment, so linking is really "point
 * this assignment at this module" -- and an assignment that already references
 * another module gets repointed. The option labels say so.
 */
export function AssignmentLinks({
  classId,
  materialId,
  linked,
  options,
}: {
  classId: number;
  materialId: number;
  linked: LinkedAssignment[];
  options: LinkableAssignment[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignmentLinkFormValues>({
    resolver: zodResolver(assignmentLinkFormSchema),
    defaultValues: { assignmentId: 0 },
  });

  const linkable = options.filter((option) => option.materialId !== materialId);

  function run(action: () => Promise<unknown>, onSuccess?: () => void) {
    startTransition(async () => {
      setError(null);
      try {
        await action();
        onSuccess?.();
        router.refresh();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'The request failed. Please try again.',
        );
      }
    });
  }

  const submitLink = handleSubmit(({ assignmentId }) => {
    run(
      () =>
        apiRequest(`/api/study-materials/${materialId}/assignments`, {
          method: 'POST',
          body: JSON.stringify({ classId, assignmentId }),
        }),
      () => reset(),
    );
  });

  return (
    <div className="mt-3 border-t border-shell-divider pt-3">
      <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
        Linked assignments
      </p>

      {linked.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {linked.map((assignment) => (
            <li
              key={assignment.id}
              className="flex items-center gap-1 rounded-full bg-accent-cool-soft py-1 pr-1 pl-2.5 text-xs font-semibold text-accent-cool"
            >
              <span className="max-w-50 truncate">{assignment.title}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Unlink ${assignment.title}`}
                disabled={pending}
                onClick={() =>
                  run(() =>
                    apiRequest(
                      `/api/study-materials/${materialId}/assignments/${assignment.id}`,
                      {
                        method: 'DELETE',
                        body: JSON.stringify({ classId }),
                      },
                    ),
                  )
                }
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-xs text-ink-subtle">
          Not used by any assignment yet.
        </p>
      )}

      {linkable.length > 0 ? (
        <form
          onSubmit={submitLink}
          noValidate
          className="mt-2.5 flex flex-col items-stretch gap-2 sm:flex-row sm:items-start"
        >
          <Controller
            name="assignmentId"
            control={control}
            render={({ field }) => (
              <SearchablePicker
                id={`assignment-${materialId}`}
                aria-label="Assignment to link"
                aria-invalid={Boolean(errors.assignmentId)}
                aria-describedby={
                  errors.assignmentId ? `assignment-${materialId}-error` : undefined
                }
                value={field.value}
                onValueChange={field.onChange}
                options={linkable.map((option) => ({
                  value: option.id,
                  label: `${option.title}${option.classScoped ? '' : ' (whole level)'}${
                    option.materialId !== null ? ' (replaces its module)' : ''
                  }`,
                }))}
                title="Link an assignment"
                placeholder="Choose an assignment…"
                searchPlaceholder="Search assignments…"
                emptyMessage="No assignments match your search."
                disabled={pending}
                className="h-9 flex-1"
              />
            )}
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={pending}
            className="w-full sm:w-auto"
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Link2 aria-hidden="true" />
            )}
            Link
          </Button>
          {errors.assignmentId ? (
            <p
              id={`assignment-${materialId}-error`}
              role="alert"
              className="text-xs font-semibold text-destructive sm:self-center"
            >
              {errors.assignmentId.message}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="mt-2 text-xs text-ink-subtle">
          No other assignments are available for this class.
        </p>
      )}

      {error ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function DeleteMaterialButton({
  classId,
  materialId,
  title,
}: {
  classId: number;
  materialId: number;
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Delete "${title}"? This also removes its file.`)) return;
          startTransition(async () => {
            setError(null);
            try {
              await apiRequest(`/api/study-materials/${materialId}`, {
                method: 'DELETE',
                body: JSON.stringify({ classId }),
              });
              router.refresh();
            } catch (requestError) {
              setError(
                requestError instanceof Error
                  ? requestError.message
                  : 'Could not delete the material.',
              );
            }
          });
        }}
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

export function MaterialActionMenu({
  classId,
  materialId,
  title,
}: {
  classId: number;
  materialId: number;
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!window.confirm(`Delete "${title}"? This also removes its file.`)) return;

    startTransition(async () => {
      setError(null);
      try {
        await apiRequest(`/api/study-materials/${materialId}`, {
          method: 'DELETE',
          body: JSON.stringify({ classId }),
        });
        router.refresh();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Could not delete the material.',
        );
      }
    });
  }

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

        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem
            render={
              <Link href={`/teacher/module/${classId}/${materialId}/edit`} />
            }
          >
            <Pencil aria-hidden="true" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            nativeButton
            variant="destructive"
            disabled={pending}
            render={<button type="button" onClick={handleDelete} />}
          >
            <Trash2 aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {error ? (
        <span role="alert" className="max-w-56 text-right text-xs font-semibold text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
