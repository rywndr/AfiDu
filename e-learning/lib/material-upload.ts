/**
 * Getting a chosen file into B2 before the module row is saved.
 *
 * The browser asks the API for a pre-signed PUT, uploads straight to B2, and
 * hands the resulting key back with the save request. The API re-checks the key
 * against the token it signed, so nothing here is trusted.
 */
import { apiRequest } from '@/lib/api-client';
import type { MaterialType } from '@/lib/choices';
import { putWithProgress } from '@/lib/upload';

type UploadTicket = {
  key: string;
  url: string;
  contentType: string;
  uploadToken: string;
};

/** The file metadata a save request carries. */
export type UploadedFile = {
  key: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  uploadToken: string;
};

export async function uploadMaterialFile(options: {
  classId: number;
  materialType: MaterialType;
  file: File;
  signal: AbortSignal;
  /** Called once the ticket is granted and bytes start moving. */
  onUploadStart?: () => void;
  /** 0-100, or null when the browser reports no total length. */
  onProgress?: (percent: number | null) => void;
}): Promise<UploadedFile> {
  const { classId, materialType, file, signal, onUploadStart, onProgress } = options;
  const contentType = file.type || 'application/octet-stream';

  const ticket = await apiRequest<UploadTicket>('/api/study-materials/upload-ticket', {
    method: 'POST',
    body: JSON.stringify({
      classId,
      materialType,
      filename: file.name,
      size: file.size,
      contentType,
    }),
  });

  onUploadStart?.();
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
  };
}
