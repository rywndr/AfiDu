import { apiRequest } from '@/lib/api-client';
import type { UploadedQuestionAudio } from '@/lib/form-schemas';
import { putWithProgress } from '@/lib/upload';

type UploadTicket = {
  key: string;
  url: string;
  contentType: string;
  uploadToken: string;
};

/** Upload an MP3 prompt before the assignment JSON is saved. */
export async function uploadQuestionAudio(
  classId: number,
  file: File,
): Promise<UploadedQuestionAudio> {
  const contentType = file.type || 'audio/mpeg';
  const ticket = await apiRequest<UploadTicket>(
    '/api/assignments/audio-upload-ticket',
    {
      method: 'POST',
      body: JSON.stringify({
        classId,
        filename: file.name,
        size: file.size,
        contentType,
      }),
    },
  );

  await putWithProgress({
    url: ticket.url,
    file,
    contentType: ticket.contentType,
  });

  return {
    key: ticket.key,
    originalFilename: file.name,
    mimeType: contentType,
    size: file.size,
    uploadToken: ticket.uploadToken,
  };
}
