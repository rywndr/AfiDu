/**
 * Browser-side upload with progress.
 *
 * `fetch` cannot report request progress, so the direct-to-B2 PUT goes through
 * XMLHttpRequest: `upload.onprogress` is the only way to drive a real progress
 * bar for a 500MB video.
 */

export type UploadProgress = {
  loaded: number;
  total: number;
  /** 0-100, rounded. `null` when the browser reports no total length. */
  percent: number | null;
};

export class UploadError extends Error {}

export function putWithProgress(options: {
  url: string;
  file: File;
  contentType: string;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const { url, file, contentType, onProgress, signal } = options;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadError('Upload cancelled.'));
      return;
    }

    const request = new XMLHttpRequest();
    request.open('PUT', url, true);
    // must match the content type the URL was signed with, or B2 rejects it
    request.setRequestHeader('Content-Type', contentType);

    const abort = () => request.abort();
    signal?.addEventListener('abort', abort, { once: true });

    const settle = (finish: () => void) => {
      signal?.removeEventListener('abort', abort);
      finish();
    };

    request.upload.addEventListener('progress', (event) => {
      onProgress?.({
        loaded: event.loaded,
        total: event.total,
        percent: event.lengthComputable
          ? Math.round((event.loaded / event.total) * 100)
          : null,
      });
    });

    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
        settle(resolve);
        return;
      }
      settle(() =>
        reject(
          new UploadError(
            `Storage rejected the upload (HTTP ${request.status}). ` +
              'Check that the bucket allows PUT from this origin.',
          ),
        ),
      );
    });

    request.addEventListener('error', () => {
      settle(() =>
        reject(
          new UploadError(
            'The upload could not reach storage. Check your connection and the ' +
              'bucket CORS rules.',
          ),
        ),
      );
    });

    request.addEventListener('timeout', () => {
      settle(() => reject(new UploadError('The upload timed out.')));
    });

    request.addEventListener('abort', () => {
      settle(() => reject(new UploadError('Upload cancelled.')));
    });

    request.send(file);
  });
}
