'use client';

import { Fragment, type ReactNode } from 'react';
import { LayoutGrid, Rows3, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { SearchBar } from '@/components/dashboard/search-bar';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ListView } from '@/lib/list-view';

export type ToolbarFilter = {
  key: string;
  value?: string;
  label: string;
  allLabel: string;
  options: readonly { value: string; label: string }[];
};

type FilterToolbarProps = {
  idPrefix: string;
  searchLabel: string;
  searchPlaceholder: string;
  query: string;
  filters: ToolbarFilter[];
  view?: { value: ListView; noun: string };
  action?: ReactNode;
};

const selectClass =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 lg:w-44';

/**
 * Search, dropdown filters, an optional rows/grid switch and a primary action,
 */
export function FilterToolbar({
  idPrefix,
  searchLabel,
  searchPlaceholder,
  query,
  filters,
  view,
  action,
}: FilterToolbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const chips = filters
    .map((filter) => ({
      key: filter.key,
      label: filter.options.find((option) => option.value === filter.value)?.label,
    }))
    .filter((chip): chip is { key: string; label: string } => Boolean(chip.label));

  /** An empty string drops the param, which is how a default is expressed. */
  function updateParams(changes: Record<string, string>, resetPage = true) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (resetPage) next.delete('page');
    const suffix = next.toString();
    router.push(suffix ? `${pathname}?${suffix}` : pathname);
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-start">
        <SearchBar
          defaultValue={query}
          label={searchLabel}
          placeholder={searchPlaceholder}
        />

        {filters.map((filter) => {
          const id = `${idPrefix}-${filter.key}-filter`;
          return (
            <Fragment key={filter.key}>
              <label className="sr-only" htmlFor={id}>
                {filter.label}
              </label>
              <select
                id={id}
                value={filter.value ?? ''}
                onChange={(event) => updateParams({ [filter.key]: event.target.value })}
                className={selectClass}
              >
                <option value="">{filter.allLabel}</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Fragment>
          );
        })}

        {view ? (
          <ToggleGroup
            aria-label="Layout"
            variant="outline"
            spacing={0}
            value={[view.value]}
            onValueChange={(next) => {
              // Non-multiple groups also emit `[]` when the pressed item is
              // clicked again; a layout must always be chosen, so ignore that.
              const [selected] = next;
              if (selected) {
                updateParams({ view: selected === 'grid' ? 'grid' : '' }, false);
              }
            }}
            className="shrink-0 self-start"
          >
            <ToggleGroupItem
              value="rows"
              aria-label={`Show ${view.noun} as rows`}
              className="size-10"
            >
              <Rows3 aria-hidden="true" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="grid"
              aria-label={`Show ${view.noun} as a grid`}
              className="size-10"
            >
              <LayoutGrid aria-hidden="true" />
            </ToggleGroupItem>
          </ToggleGroup>
        ) : null}

        {action}
      </div>

      {chips.length > 0 ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
            Filtered by
          </span>
          {chips.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="h-6 gap-1 pr-1 pl-2.5">
              <span className="max-w-40 truncate">{chip.label}</span>
              <button
                type="button"
                aria-label={`Clear the ${chip.label} filter`}
                className="flex size-4 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-shell-outline hover:text-ink"
                onClick={() => updateParams({ [chip.key]: '' })}
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
