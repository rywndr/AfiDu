'use client';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export type UploadPhase = 'idle' | 'preparing' | 'uploading' | 'saving';

export function UploadProgress({
  phase,
  percent,
  onCancel,
}: {
  phase: UploadPhase;
  percent: number | null;
  onCancel: () => void;
}) {
  if (phase !== 'uploading' && phase !== 'saving') return null;

  return (
    <div className="mt-5" aria-live="polite">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink-soft">
        <span>
          {phase === 'saving'
            ? 'Saving module…'
            : percent === null
              ? 'Uploading…'
              : `Uploading… ${percent}%`}
        </span>
        {phase === 'uploading' ? (
          <Button type="button" variant="ghost" size="xs" onClick={onCancel}>
            <X aria-hidden="true" />
            Cancel
          </Button>
        ) : null}
      </div>
      <Progress value={phase === 'saving' ? 100 : percent} />
    </div>
  );
}

export function uploadPhaseLabel(phase: UploadPhase, isEditing: boolean): string {
  if (phase === 'preparing') return 'Preparing…';
  if (phase === 'uploading') return 'Uploading…';
  if (phase === 'saving') return 'Saving…';
  return isEditing ? 'Save changes' : 'Add module';
}
