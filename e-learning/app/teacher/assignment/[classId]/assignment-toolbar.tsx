'use client';

import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { SearchBar } from '@/components/dashboard/search-bar';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  ASSIGNMENT_STATUSES,
  SUBJECT_CATEGORIES,
  type AssignmentStatus,
  type SubjectCategory,
} from '@/lib/choices';

type AssignmentToolbarProps = {
  classId: number;
  query: string;
  category?: SubjectCategory;
  status?: AssignmentStatus;
};

const selectClass =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 lg:w-44';

export function AssignmentToolbar({
  classId,
  query,
  category,
  status,
}: AssignmentToolbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeFilters: { key: string; label: string | undefined }[] = [
    {
      key: 'category',
      label: SUBJECT_CATEGORIES.find((option) => option.value === category)?.label,
    },
    {
      key: 'status',
      label: ASSIGNMENT_STATUSES.find((option) => option.value === status)?.label,
    },
  ];
  const filters = activeFilters.filter(
    (filter): filter is { key: string; label: string } => Boolean(filter.label),
  );

  /** An empty string drops the param, which is how a default is expressed. */
  function updateParams(changes: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    const suffix = next.toString();
    router.push(suffix ? `${pathname}?${suffix}` : pathname);
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-start">
        <SearchBar
          defaultValue={query}
          label="Search assignments"
          placeholder="Search title or description…"
        />

        <label className="sr-only" htmlFor="assignment-category-filter">
          Filter assignments by category
        </label>
        <select
          id="assignment-category-filter"
          value={category ?? ''}
          onChange={(event) => updateParams({ category: event.target.value })}
          className={selectClass}
        >
          <option value="">All categories</option>
          {SUBJECT_CATEGORIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="assignment-status-filter">
          Filter assignments by status
        </label>
        <select
          id="assignment-status-filter"
          value={status ?? ''}
          onChange={(event) => updateParams({ status: event.target.value })}
          className={selectClass}
        >
          <option value="">All statuses</option>
          {ASSIGNMENT_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <Link
          href={`/teacher/assignment/${classId}/new`}
          className={buttonVariants({
            size: 'lg',
            className: 'w-full shrink-0 lg:w-auto',
          })}
        >
          <Plus aria-hidden="true" />
          New assignment
        </Link>
      </div>

      {filters.length > 0 ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
            Filtered by
          </span>
          {filters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="h-6 gap-1 pr-1 pl-2.5"
            >
              <span className="max-w-40 truncate">{filter.label}</span>
              <button
                type="button"
                aria-label={`Clear the ${filter.label} filter`}
                className="flex size-4 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-shell-outline hover:text-ink"
                onClick={() => updateParams({ [filter.key]: '' })}
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
