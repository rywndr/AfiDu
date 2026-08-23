'use client';

import { FileActions, FileMeta } from '@/components/dashboard/file-links';
import type { SubmissionFileRef } from '@/lib/assignments';

/** The uploads on a submission, or on one of its answers. */
export function SubmissionFiles({
  submissionId,
  files,
}: {
  submissionId: number;
  files: SubmissionFileRef[];
}) {
  if (files.length === 0) return null;

  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {files.map((file) => (
        <li
          key={file.id}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <FileMeta filename={file.originalFilename} sizeBytes={file.sizeBytes} />
          {file.hasFile ? (
            <FileActions href={`/api/submissions/${submissionId}/files/${file.id}`} />
          ) : (
            <span className="text-xs text-ink-subtle">File missing</span>
          )}
        </li>
      ))}
    </ul>
  );
}
