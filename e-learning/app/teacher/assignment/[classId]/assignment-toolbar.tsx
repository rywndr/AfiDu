import Link from 'next/link';
import { Plus } from 'lucide-react';

import { FilterToolbar } from '@/components/dashboard/filter-toolbar';
import { buttonVariants } from '@/components/ui/button';
import {
  ASSIGNMENT_STATUSES,
  SUBJECT_CATEGORIES,
  type AssignmentStatus,
  type SubjectCategory,
} from '@/lib/choices';
import type { ListView } from '@/lib/list-view';
import { cn } from '@/lib/utils';

type AssignmentToolbarProps = {
  classId: number;
  query: string;
  category?: SubjectCategory;
  status?: AssignmentStatus;
  view: ListView;
};

export function AssignmentToolbar({
  classId,
  query,
  category,
  status,
  view,
}: AssignmentToolbarProps) {
  return (
    <FilterToolbar
      idPrefix="assignment"
      searchLabel="Search assignments"
      searchPlaceholder="Search title or description…"
      query={query}
      filters={[
        {
          key: 'category',
          value: category,
          label: 'Filter assignments by category',
          allLabel: 'All categories',
          options: SUBJECT_CATEGORIES,
        },
        {
          key: 'status',
          value: status,
          label: 'Filter assignments by status',
          allLabel: 'All statuses',
          options: ASSIGNMENT_STATUSES,
        },
      ]}
      view={{ value: view, noun: 'assignments' }}
      action={
        <Link
          href={`/teacher/assignment/${classId}/new`}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'h-11 w-full shrink-0 lg:h-9 lg:w-auto',
          )}
        >
          <Plus aria-hidden="true" />
          New assignment
        </Link>
      }
    />
  );
}
