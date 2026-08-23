/**
 * The name and the two links a stored file is shown with. Both the module form
 * and the grading screen list files the API streams from B2 behind a signed URL
 * it makes per request, so `download=1` is all the difference between opening a
 * file and saving it.
 */
import { Download, ExternalLink, Paperclip } from 'lucide-react';

import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';

const linkClass = 'inline-flex items-center gap-1.5 text-accent-primary hover:underline';

export function FileMeta({
  filename,
  sizeBytes,
}: {
  filename: string;
  sizeBytes?: number | null;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-ink-muted">
      <Paperclip aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="truncate">
        {filename || 'Uploaded file'}
        {sizeBytes ? ` · ${formatBytes(sizeBytes)}` : ''}
      </span>
    </span>
  );
}

export function FileActions({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  return (
    <span
      className={cn('flex flex-wrap items-center gap-3 font-semibold', className)}
    >
      <a href={href} target="_blank" rel="noreferrer" className={linkClass}>
        <ExternalLink aria-hidden="true" className="size-4" />
        Open
      </a>
      <a href={`${href}?download=1`} className={linkClass}>
        <Download aria-hidden="true" className="size-4" />
        Download
      </a>
    </span>
  );
}
