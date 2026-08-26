import { FilterToolbar } from '@/components/dashboard/filter-toolbar';
import {
  MATERIAL_TYPES,
  SUBJECT_CATEGORIES,
  type MaterialType,
  type SubjectCategory,
} from '@/lib/choices';

type StudentModuleToolbarProps = {
  query: string;
  category?: SubjectCategory;
  materialType?: MaterialType;
};

/** Search, the two filters and the layout switch above a student's modules. */
export function StudentModuleToolbar({
  query,
  category,
  materialType,
}: StudentModuleToolbarProps) {
  return (
    <FilterToolbar
      idPrefix="student-module"
      searchLabel="Search modules"
      searchPlaceholder="Search title or description…"
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
          key: 'type',
          value: materialType,
          label: 'Filter modules by type',
          allLabel: 'All types',
          options: MATERIAL_TYPES,
        },
      ]}
      view={{ noun: 'modules' }}
    />
  );
}
