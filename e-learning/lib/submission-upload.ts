/**
 * Getting a file a student is handing in into B2.
 */
import { apiRequest } from '@/lib/api-client';
import { putWithProgress } from '@/lib/upload';

type UploadTicket = {
  key: string;
  url: string;
  contentType: string;
  uploadToken: string;
};

/** The file metadata. */
export type UploadedSubmissionFile = {
  key: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  uploadToken: string;
  questionId: number | null;
};

export async function uploadSubmissionFile(options: {
  submissionId: number;
  file: File;
  signal?: AbortSignal;
  /** 0-100, or null when the browser reports no total length. */
  onProgress?: (percent: number | null) => void;
  questionId?: number | null;
}): Promise<UploadedSubmissionFile> {
  const { submissionId, file, signal, onProgress, questionId = null } = options;
  const contentType = file.type || 'application/octet-stream';

  const ticket = await apiRequest<UploadTicket>(
    `/api/submissions/${submissionId}/upload-ticket`,
    {
      method: 'POST',
      signal,
      body: JSON.stringify({
        filename: file.name,
        size: file.size,
        contentType,
        questionId,
      }),
    },
  );

  await putWithProgress({
    url: ticket.url,
    file,
    contentType: ticket.contentType,
    signal,
    onProgress: (progress) => onProgress?.(progress.percent),
  });

  return {
    key: ticket.key,
    originalFilename: file.name,
    mimeType: contentType,
    size: file.size,
    uploadToken: ticket.uploadToken,
    questionId,
  };
}

/** Remove a direct upload that has not been saved to the attempt yet. */
export async function deletePendingSubmissionFile(
  submissionId: number,
  file: UploadedSubmissionFile,
): Promise<void> {
  await apiRequest<{ success: true }>(
    `/api/submissions/${submissionId}/upload-ticket`,
    {
      method: 'DELETE',
      body: JSON.stringify(file),
    },
  );
}
