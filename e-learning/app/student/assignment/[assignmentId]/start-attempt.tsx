'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { FormAlert } from '@/components/form/form-shell';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api-client';

/**
 * The button that opens an attempt.
 */
export function StartAttempt({
  assignmentId,
  attemptNumber,
}: {
  assignmentId: number;
  attemptNumber: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      await apiRequest<{ submissionId: number }>('/api/submissions', {
        method: 'POST',
        body: JSON.stringify({ assignmentId }),
      });
      router.refresh();
    } catch (requestError) {
      setBusy(false);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The assignment could not be started. Please try again.',
      );
    }
  };

  return (
    <section className="rounded-2xl bg-white p-4 text-center shadow-card sm:p-8">
      <h2 className="text-base font-bold text-ink-strong sm:text-lg">
        {attemptNumber === 1 ? 'Ready to start?' : `Start attempt ${attemptNumber}`}
      </h2>

      <FormAlert message={error} className="mt-4 justify-center" />

      <Button
        type="button"
        size="lg"
        className="mt-5 w-full sm:w-auto"
        disabled={busy}
        onClick={() => void start()}
      >
        {busy ? 'Opening…' : 'Start now'}
      </Button>
    </section>
  );
}
