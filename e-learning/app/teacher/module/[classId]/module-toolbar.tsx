import Link from 'next/link';
import { Plus } from 'lucide-react';

import { FilterToolbar } from '@/components/dashboard/filter-toolbar';
import { buttonVariants } from '@/components/ui/button';
import {
  MATERIAL_STATUSES,
  SUBJECT_CATEGORIES,
  type MaterialStatus,
  type SubjectCategory,
} from '@/lib/choices';
import { cn } from '@/lib/utils';

type ModuleToolbarProps = {
  classId: number;
  query: string;
  category?: SubjectCategory;
  status?: MaterialStatus;
};

export function ModuleToolbar({
  classId,
  query,
  category,
  status,
}: ModuleToolbarProps) {
  return (
    <FilterToolbar
      idPrefix="module"
      searchLabel="Search modules"
      searchPlaceholder="Search title, description, or filename…"
      query={query}
      filters={[
        {
          key: 'category',
          value: category,
          label: 'Filter modules by category',
          allLabel: 'All categories',
          options: SUBJECT_CATEGORIES,
        },
        {
          key: 'status',
          value: status,
          label: 'Filter modules by status',
          allLabel: 'All statuses',
          options: MATERIAL_STATUSES,
        },
      ]}
      view={{ noun: 'modules', role: 'teacher' }}
      action={
        <Link
          href={`/teacher/module/${classId}/upload`}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'h-11 w-full shrink-0 lg:h-9 lg:w-auto',
          )}
        >
          <Plus aria-hidden="true" />
          Add module
        </Link>
      }
    />
  );
}
