'use client';

import { useEffect, useState, useTransition } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Long enough to swallow a burst of typing, short enough to feel live. */
const DEBOUNCE_MS = 350;
const MAX_QUERY_LENGTH = 100;

type SearchBarProps = {
  defaultValue?: string;
  placeholder?: string;
  queryKey?: string;
  label?: string;
  className?: string;
};

/**
 * Debounced, buttonless search.
 *
 * The input is local state and the URL is written with `replace` so a long
 * query does not leave one history entry per keystroke. `defaultValue` is the
 * query the server rendered with, so it doubles as "what is already applied":
 * a change to it that we did not cause ourselves (the Clear filters link, back
 * button) resets the field, and one that we did is ignored so it cannot clobber
 * characters typed while the navigation was in flight.
 */
export function SearchBar({
  defaultValue = '',
  placeholder = 'Search…',
  queryKey = 'q',
  label = 'Search',
  className,
}: SearchBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(defaultValue);
  const [appliedValue, setAppliedValue] = useState(defaultValue);
  const [pushedValue, setPushedValue] = useState(defaultValue);

  if (defaultValue !== appliedValue) {
    setAppliedValue(defaultValue);
    if (defaultValue !== pushedValue) setValue(defaultValue);
  }

  const applied = defaultValue.trim();
  const params = searchParams.toString();

  useEffect(() => {
    const query = value.trim();
    if (query === applied) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (query) next.set(queryKey, query);
      else next.delete(queryKey);
      next.delete('page');
      const suffix = next.toString();
      setPushedValue(query);
      startTransition(() => {
        router.replace(suffix ? `${pathname}?${suffix}` : pathname, {
          scroll: false,
        });
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [applied, params, pathname, queryKey, router, value]);

  return (
    <div className={cn('min-w-0 flex-1', className)}>
      <div className="relative min-w-0">
        {pending ? (
          <Loader2
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-ink-subtle"
          />
        ) : (
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle"
          />
        )}
        <Input
          type="search"
          aria-label={label}
          placeholder={placeholder}
          maxLength={MAX_QUERY_LENGTH}
          className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-ink-subtle hover:bg-shell hover:text-ink"
            onClick={() => setValue('')}
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
