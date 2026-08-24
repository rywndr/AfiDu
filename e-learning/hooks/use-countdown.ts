'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Count down to a deadline the server measured, and say when it is reached.
 */

export function useCountdown({
  seconds,
  onElapsed,
}: {
  /** Seconds left as of the render that mounted this, or null for no clock. */
  seconds: number | null;
  onElapsed: () => void;
}): number | null {
  const [remaining, setRemaining] = useState(seconds);
  const elapsed = useRef(onElapsed);

  useEffect(() => {
    elapsed.current = onElapsed;
  }, [onElapsed]);

  useEffect(() => {
    if (seconds === null) return;

    const deadline = Date.now() + seconds * 1000;
    let fired = false;

    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);

      if (left === 0 && !fired) {
        fired = true;
        window.clearInterval(timer);
        elapsed.current();
      }
    };

    const timer = window.setInterval(tick, 1000);
    tick();

    return () => window.clearInterval(timer);
  }, [seconds]);

  return remaining;
}
