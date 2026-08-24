/**
 * Search and paging helpers shared by the list pages.
 *
 * The state lives in search params (`q`, `page`, and a key per filter dropdown)
 * so a list survives a reload and can be linked to. Some of these helpers read
 * those params. The rest turn a row count into the window one page shows.
 */

/** Cards per page on the module and assignment lists. */
export const DEFAULT_PAGE_SIZE = 6;
const MAX_PAGE_SIZE = 50;
/** Matches the `maxLength` on the search input. */
const MAX_QUERY_LENGTH = 100;

export type ListQueryOptions = {
  page?: number;
  pageSize?: number;
};

/** One page of a list, plus the counts its heading and empty state need. */
export type PageResult<T> = {
  items: T[];
  /** Rows matching the current search and filters. */
  total: number;
  /** Rows before any search or filter, for "N modules" style headings. */
  allTotal: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** A raw `q` search param, trimmed and cut to 100 characters. */
export function parseSearchQuery(value: unknown): string {
  return String(value ?? '')
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

/** A raw `page` search param. Anything but a positive whole number becomes 1. */
export function parsePageNumber(value: unknown): number {
  const page = Number(value ?? 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/** Escapes LIKE wildcards so Postgres matches the query literally. */
export function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, '\\$&')}%`;
}

/**
 * Where the requested page starts and how big it is, for `total` matching rows.
 *
 * `page` is clamped to the last page, so a stale `?page=` left over from a
 * wider filter still shows rows rather than an empty list.
 */
export function resolvePageWindow(
  total: number,
  options: ListQueryOptions = {},
): { page: number; pageSize: number; totalPages: number; offset: number } {
  const pageSize = Math.min(
    Math.max(options.pageSize ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(options.page ?? 1, 1), totalPages);

  return { page, pageSize, totalPages, offset: (page - 1) * pageSize };
}

/**
 * One page of a list a caller has already filtered, for reads whose filters are
 * derived and so have no SQL to sit in. `allTotal` is the length before
 * filtering.
 */
export function paginate<T>(
  items: readonly T[],
  allTotal: number,
  options: ListQueryOptions = {},
): PageResult<T> {
  const total = items.length;
  const { page, pageSize, totalPages, offset } = resolvePageWindow(total, options);

  return {
    items: items.slice(offset, offset + pageSize),
    total,
    allTotal,
    page,
    pageSize,
    totalPages,
  };
}
