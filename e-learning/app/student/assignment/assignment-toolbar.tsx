import { FilterToolbar } from '@/components/dashboard/filter-toolbar';
import {
  SUBJECT_CATEGORIES,
  SUBMISSION_ROW_STATUSES,
  type SubjectCategory,
  type SubmissionRowStatus,
} from '@/lib/choices';

type StudentAssignmentToolbarProps = {
  query: string;
  category?: SubjectCategory;
  status?: SubmissionRowStatus;
};

/**
 * Search, the two filters and the layout switch above a student's assignments.
 * The status filter matches their own newest attempt, not the teacher's
 * draft/published status.
 */
export function StudentAssignmentToolbar({
  query,
  category,
  status,
}: StudentAssignmentToolbarProps) {
  return (
    <FilterToolbar
      idPrefix="student-assignment"
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
          label: 'Filter assignments by progress',
          allLabel: 'Any progress',
          options: SUBMISSION_ROW_STATUSES,
        },
      ]}
      view={{ noun: 'assignments' }}
    />
  );
}
