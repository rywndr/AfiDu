'use client';

import { useCallback, useEffect, useState } from 'react';

export type TabAway = {
  /** True from the moment the page is left until the warning is dismissed. */
  isAway: boolean;
  /** How many times the page has been left during this session. */
  count: number;
  dismiss: () => void;
};

/**
 * When student leaves the page.
 */

export function useTabAway({ enabled }: { enabled: boolean }): TabAway {
  const [isAway, setIsAway] = useState(false);
  const [count, setCount] = useState(0);
  const dismiss = useCallback(() => setIsAway(false), []);

  useEffect(() => {
    if (!enabled) return;

    let away = false;

    const leave = () => {
      if (away) return;
      away = true;
      setIsAway(true);
      setCount((current) => current + 1);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') leave();
      // coming back does not clear the warning
      else away = false;
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', leave);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', leave);
    };
  }, [enabled]);

  return { isAway, count, dismiss };
}
