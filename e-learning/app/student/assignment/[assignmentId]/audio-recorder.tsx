'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';

import { FileMeta } from '@/components/dashboard/file-links';
import { Button } from '@/components/ui/button';
import type { SubmissionFileRef } from '@/lib/assignments';
import {
  uploadSubmissionFile,
  type UploadedSubmissionFile,
} from '@/lib/submission-upload';

type AudioRecorderProps = {
  submissionId: number;
  questionId: number;
  disabled: boolean;
  storageReady: boolean;
  recordedFiles: SubmissionFileRef[];
  pendingFiles: UploadedSubmissionFile[];
  onRecorded: (file: UploadedSubmissionFile) => void;
  onRemovePending: (file: UploadedSubmissionFile) => Promise<void>;
  onRemoveRecorded: (fileId: number) => Promise<void>;
  /** The upload in flight, for the form to wait on when it hands in. */
  onUploading: (upload: Promise<void>) => void;
};

function recordingType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return [
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ].find((type) => MediaRecorder.isTypeSupported(type));
}

function extension(type: string): string {
  if (type.includes('mp4')) return 'm4a';
  if (type.includes('ogg')) return 'ogg';
  return 'webm';
}

/** Browser microphone recording uploaded as this question's submission file. */
export function AudioRecorder({
  submissionId,
  questionId,
  disabled,
  storageReady,
  recordedFiles,
  pendingFiles,
  onRecorded,
  onRemovePending,
  onRemoveRecorded,
  onUploading,
}: AudioRecorderProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [phase, setPhase] = useState<
    'idle' | 'recording' | 'uploading' | 'removing'
  >('idle');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // unmount only: a cleanup that reran on every previewUrl change would abort the
  // upload the preview was just created for
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      uploadControllerRef.current?.abort();
    },
    [],
  );

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const start = async () => {
    setError(null);
    if (phase === 'uploading') {
      uploadControllerRef.current?.abort();
      uploadControllerRef.current = null;
      setPreviewUrl(null);
      setPhase('idle');
    }
    if (!storageReady) {
      setError('File storage is not configured.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Audio recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = recordingType();
      const recorder = type
        ? new MediaRecorder(stream, { mimeType: type })
        : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || type || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        onUploading(upload(blob, mimeType));
      };
      recorder.start();
      setPhase('recording');
    } catch {
      setError('Microphone access was denied or unavailable.');
    }
  };

  const upload = async (blob: Blob, mimeType: string) => {
    if (blob.size === 0) {
      setPhase('idle');
      setError('No audio was recorded. Please try again.');
      return;
    }

    const url = URL.createObjectURL(blob);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return url;
    });
    setPhase('uploading');
    const controller = new AbortController();
    uploadControllerRef.current = controller;

    try {
      const file = new File(
        [blob],
        `question-${questionId}-recording.${extension(mimeType)}`,
        { type: mimeType },
      );
      const uploaded = await uploadSubmissionFile({
        submissionId,
        questionId,
        file,
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        await onRemovePending(uploaded);
        return;
      }
      if (latestPending) await onRemovePending(latestPending);
      if (controller.signal.aborted) {
        await onRemovePending(uploaded);
        return;
      }
      onRecorded(uploaded);
    } catch (uploadError) {
      if (!controller.signal.aborted) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : 'The recording could not be uploaded. Please try again.',
        );
      }
    } finally {
      if (uploadControllerRef.current === controller) {
        uploadControllerRef.current = null;
        setPhase('idle');
      }
    }
  };

  const stop = () => recorderRef.current?.stop();
  const latestRecorded = recordedFiles[0];
  const latestPending = pendingFiles[0];
  const hasRecording = Boolean(previewUrl || latestPending || latestRecorded);

  const remove = async () => {
    setError(null);
    if (phase === 'uploading') {
      uploadControllerRef.current?.abort();
      uploadControllerRef.current = null;
      setPreviewUrl(null);
      setPhase('idle');
      return;
    }
    setPhase('removing');
    try {
      if (latestPending) await onRemovePending(latestPending);
      else if (latestRecorded) await onRemoveRecorded(latestRecorded.id);
      setPreviewUrl(null);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'The recording could not be removed. Please try again.',
      );
    } finally {
      setPhase('idle');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {phase === 'recording' ? (
          <Button type="button" variant="destructive" disabled={disabled} onClick={stop}>
            <Square aria-hidden="true" />
            Stop recording
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={disabled || phase === 'removing'}
            onClick={() => void start()}
          >
            <Mic aria-hidden="true" />
            {hasRecording ? 'Record again' : 'Record answer'}
          </Button>
        )}
        {hasRecording ? (
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || phase === 'removing'}
            onClick={() => void remove()}
          >
            <Trash2 aria-hidden="true" />
            Delete recording
          </Button>
        ) : null}
        <span className="text-xs text-ink-subtle" aria-live="polite">
          {phase === 'recording'
            ? 'Recording…'
            : phase === 'uploading'
              ? 'Uploading recording…'
              : phase === 'removing'
                ? 'Deleting recording…'
              : latestPending
                ? 'Recorded. Save or hand in to attach it.'
                : latestRecorded
                  ? 'Recording attached.'
                  : 'Your browser will ask for microphone access.'}
        </span>
      </div>

      {previewUrl ? (
        <audio controls preload="metadata" src={previewUrl} className="mt-2 w-full" />
      ) : latestRecorded?.hasFile ? (
        <div className="mt-2">
          <audio
            controls
            preload="metadata"
            src={`/api/submissions/${submissionId}/files/${latestRecorded.id}`}
            className="w-full"
          />
          <FileMeta
            filename={latestRecorded.originalFilename}
            sizeBytes={latestRecorded.sizeBytes}
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
