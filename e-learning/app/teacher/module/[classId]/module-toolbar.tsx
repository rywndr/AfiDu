'use client';

import Link from 'next/link';
import { LayoutGrid, Plus, Rows3, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { SearchBar } from '@/components/dashboard/search-bar';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SUBJECT_CATEGORIES, type SubjectCategory } from '@/lib/choices';

type ModuleToolbarProps = {
  classId: number;
  query: string;
  category?: SubjectCategory;
  view: 'rows' | 'grid';
};

export function ModuleToolbar({
  classId,
  query,
  category,
  view,
}: ModuleToolbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryLabel = SUBJECT_CATEGORIES.find(
    (option) => option.value === category,
  )?.label;

  /** An empty string drops the param, which is how a default is expressed. */
  function updateParams(changes: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const suffix = next.toString();
    router.push(suffix ? `${pathname}?${suffix}` : pathname);
  }

  function updateCategory(value: string) {
    updateParams({ category: value, page: '' });
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-start">
        <SearchBar
          defaultValue={query}
          label="Search modules"
          placeholder="Search title, description, or filename…"
        />

        <label className="sr-only" htmlFor="module-category-filter">
          Filter modules by category
        </label>
        <select
          id="module-category-filter"
          value={category ?? ''}
          onChange={(event) => updateCategory(event.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 lg:w-48"
        >
          <option value="">All categories</option>
          {SUBJECT_CATEGORIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ToggleGroup
          aria-label="Module layout"
          variant="outline"
          spacing={0}
          value={[view]}
          onValueChange={(next) => {
            // Non-multiple groups also emit `[]` when the pressed item is
            // clicked again; a layout must always be chosen, so ignore that.
            const [selected] = next;
            if (selected) updateParams({ view: selected === 'grid' ? 'grid' : '' });
          }}
          className="shrink-0 self-start"
        >
          <ToggleGroupItem value="rows" aria-label="Show modules as rows" className="size-10">
            <Rows3 aria-hidden="true" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Show modules as a grid" className="size-10">
            <LayoutGrid aria-hidden="true" />
          </ToggleGroupItem>
        </ToggleGroup>

        <Link
          href={`/teacher/module/${classId}/upload`}
          className={buttonVariants({
            size: 'lg',
            className: 'w-full shrink-0 lg:w-auto',
          })}
        >
          <Plus aria-hidden="true" />
          Add module
        </Link>
      </div>

      {categoryLabel ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
            Filtered by
          </span>
          <Badge variant="secondary" className="h-6 gap-1 pr-1 pl-2.5">
            <span className="max-w-40 truncate">{categoryLabel}</span>
            <button
              type="button"
              aria-label={`Clear the ${categoryLabel} category filter`}
              className="flex size-4 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-shell-outline hover:text-ink"
              onClick={() => updateCategory('')}
            >
              <X aria-hidden="true" className="size-3" />
            </button>
          </Badge>
        </div>
      ) : null}
    </div>
  );
}
