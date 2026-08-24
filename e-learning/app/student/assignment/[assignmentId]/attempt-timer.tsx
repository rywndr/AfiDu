'use client';

import { AlarmClock, TimerOff } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/form/form-shell';
import { IconTile } from '@/components/ui/icon-tile';
import { Spinner } from '@/components/ui/spinner';
import { useCountdown } from '@/hooks/use-countdown';
import { formatCountdown } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * The clock on a timed assignment
 */
export function AttemptTimer({
  secondsRemaining,
  onElapsed,
}: {
  /** Seconds left, or null if no time limit is set */
  secondsRemaining: number | null;
  onElapsed: () => void;
}) {
  const remaining = useCountdown({ seconds: secondsRemaining, onElapsed });
  if (remaining === null) return null;

  const urgent = remaining <= 60;

  return (
    <div
      className={cn(
        'sticky top-16 z-30 flex items-center gap-2.5 rounded-2xl px-4 py-2.5 shadow-card lg:top-2',
        urgent ? 'bg-destructive text-white' : 'bg-white text-ink-strong',
      )}
    >
      <AlarmClock aria-hidden="true" className="size-4 shrink-0" />
      <span className="text-xs font-semibold tracking-wide uppercase">Time left</span>
      <span
        role="timer"
        className="ml-auto font-mono text-lg font-bold tabular-nums sm:text-xl"
      >
        {formatCountdown(remaining)}
      </span>
    </div>
  );
}

/**
 * Dialog if time's up
 */
export function TimeUpDialog({
  open,
  handedIn,
  error,
  onRetry,
  onLeave,
}: {
  open: boolean;
  /** Whether the automatic hand-in has come back successfully */
  handedIn: boolean;
  error: string | null;
  onRetry: () => void;
  onLeave: () => void;
}) {
  return (
    <Dialog open={open} disablePointerDismissal>
      <DialogContent showCloseButton={false} className="gap-5 sm:max-w-md">
        <DialogHeader className="items-center text-center sm:items-start sm:text-left">
          <IconTile tone="warm">
            <TimerOff aria-hidden="true" strokeWidth={1.8} />
          </IconTile>
          <DialogTitle className="mt-4 text-base font-bold text-ink-strong sm:text-lg">
            Time is up
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-ink-muted">
            {error
              ? 'Your time ran out, but your answers have not gone in yet. Try again.'
              : handedIn
                ? 'Your answers were handed in exactly as you left them, and this attempt has been used.'
                : 'Handing in the answers you filled in. This attempt has been used.'}
          </DialogDescription>
        </DialogHeader>

        <FormAlert message={error} />

        <DialogFooter>
          {error ? (
            <Button type="button" size="lg" onClick={onRetry}>
              Hand in again
            </Button>
          ) : (
            <Button type="button" size="lg" disabled={!handedIn} onClick={onLeave}>
              {handedIn ? (
                'See my attempt'
              ) : (
                <>
                  <Spinner />
                  Handing in…
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
