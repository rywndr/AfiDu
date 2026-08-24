import { FilterToolbar } from '@/components/dashboard/filter-toolbar';
import { SUBMISSION_ROW_STATUSES, type SubmissionRowStatus } from '@/lib/choices';

type SubmissionToolbarProps = {
  query: string;
  status?: SubmissionRowStatus;
};

export function SubmissionToolbar({ query, status }: SubmissionToolbarProps) {
  return (
    <FilterToolbar
      idPrefix="submission"
      searchLabel="Search students"
      searchPlaceholder="Search student name…"
      query={query}
      filters={[
        {
          key: 'status',
          value: status,
          label: 'Filter students by submission status',
          allLabel: 'All statuses',
          options: SUBMISSION_ROW_STATUSES,
        },
      ]}
    />
  );
}
