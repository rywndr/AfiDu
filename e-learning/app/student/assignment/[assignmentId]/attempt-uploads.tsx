'use client';

import { useRef, useState } from 'react';
import { Paperclip, Plus, X } from 'lucide-react';

import { FileMeta } from '@/components/dashboard/file-links';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  MAX_SUBMISSION_FILES,
  MAX_SUBMISSION_SIZE_MB,
  SUBMISSION_EXTENSIONS,
  validateSubmissionUpload,
} from '@/lib/choices';
import { formatBytes } from '@/lib/format';
import { uploadSubmissionFile, type UploadedSubmissionFile } from '@/lib/submission-upload';
import { UploadError } from '@/lib/upload';
import type { SubmissionFileRef } from '@/lib/assignments';

const accept = SUBMISSION_EXTENSIONS.map((extension) => `.${extension}`).join(',');

type AttemptUploadsProps = {
  submissionId: number;
  /** Files already recorded against this attempt. */
  recorded: SubmissionFileRef[];
  /** Files uploaded in this session, not yet saved. */
  pending: UploadedSubmissionFile[];
  onUploaded: (file: UploadedSubmissionFile) => void;
  onRemove: (key: string) => void;
  /** The upload in flight, for the form to wait on when it hands in. */
  onUploading: (upload: Promise<void>) => void;
  disabled: boolean;
};

/**
 * The attachment field, for an assignment that takes files.
 *
 * A chosen file goes to storage straight away so the progress bar means
 * something, and is only written to the attempt when the answers are saved --
 * which is why a pending file can still be taken off the list.
 */
export function AttemptUploads({
  submissionId,
  recorded,
  pending,
  onUploaded,
  onRemove,
  onUploading,
  disabled,
}: AttemptUploadsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploading = percent !== null;
  const total = recorded.length + pending.length;
  const full = total >= MAX_SUBMISSION_FILES;

  const choose = async (file: File) => {
    setError(null);
    const problem = validateSubmissionUpload(file.name, file.size);
    if (problem) {
      setError(problem);
      return;
    }

    setPercent(0);
    try {
      const uploaded = await uploadSubmissionFile({
        submissionId,
        file,
        onProgress: (value) => setPercent(value ?? 0),
      });
      onUploaded(uploaded);
    } catch (uploadError) {
      setError(
        uploadError instanceof UploadError || uploadError instanceof Error
          ? uploadError.message
          : 'That file could not be uploaded. Please try again.',
      );
    } finally {
      setPercent(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <ul className="flex flex-col gap-1.5">
        {recorded.map((file) => (
          <li
            key={`recorded-${file.id}`}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <FileMeta filename={file.originalFilename} sizeBytes={file.sizeBytes} />
            <span className="text-xs font-semibold text-accent-primary">Attached</span>
          </li>
        ))}

        {pending.map((file) => (
          <li
            key={file.key}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-accent-primary/40 bg-accent-primary-soft/40 px-3 py-2 text-sm"
          >
            <FileMeta filename={file.originalFilename} sizeBytes={file.size} />
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={disabled}
              onClick={() => onRemove(file.key)}
            >
              <X aria-hidden="true" />
              Remove
            </Button>
          </li>
        ))}
      </ul>

      {uploading ? (
        <div className="mt-2.5" aria-live="polite">
          <p className="mb-1.5 text-xs font-semibold text-ink-soft">
            Uploading… {percent}%
          </p>
          <Progress value={percent} />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          disabled={disabled || uploading || full}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUploading(choose(file));
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={disabled || uploading || full}
          onClick={() => inputRef.current?.click()}
        >
          {total === 0 ? (
            <Paperclip aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          {total === 0 ? 'Attach a file' : 'Attach another'}
        </Button>
        <p className="text-xs text-ink-subtle">
          {full
            ? `That is the limit of ${MAX_SUBMISSION_FILES} files.`
            : `Up to ${formatBytes(MAX_SUBMISSION_SIZE_MB * 1024 * 1024)} each,` +
              ` ${MAX_SUBMISSION_FILES} files in total.`}
        </p>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
