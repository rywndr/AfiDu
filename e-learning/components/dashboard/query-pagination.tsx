import { Fragment } from 'react';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

type QueryPaginationProps = {
  pathname: string;
  page: number;
  totalPages: number;
  query?: Record<string, string | undefined>;
};

function visiblePages(page: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  return [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);
}

export function QueryPagination({
  pathname,
  page,
  totalPages,
  query = {},
}: QueryPaginationProps) {
  // A single page still renders, with both arrows disabled, so the control does
  // not appear and disappear as the result count crosses the page size.
  if (totalPages < 1) return null;

  function href(targetPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
    if (targetPage > 1) params.set('page', String(targetPage));
    const suffix = params.toString();
    return suffix ? `${pathname}?${suffix}` : pathname;
  }

  const pages = visiblePages(page, totalPages);
  const atStart = page <= 1;
  const atEnd = page >= totalPages;
  const disabledArrow = 'pointer-events-none opacity-50';

  return (
    <Pagination className="mt-6 sm:mt-8">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={href(Math.max(1, page - 1))}
            aria-disabled={atStart}
            tabIndex={atStart ? -1 : undefined}
            className={atStart ? disabledArrow : undefined}
          />
        </PaginationItem>

        {pages.map((pageNumber, index) => {
          const previous = pages[index - 1];
          return (
            <Fragment key={pageNumber}>
              {previous && pageNumber - previous > 1 ? (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : null}
              <PaginationItem>
                <PaginationLink
                  href={href(pageNumber)}
                  isActive={pageNumber === page}
                  aria-label={`Go to page ${pageNumber}`}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            </Fragment>
          );
        })}

        <PaginationItem>
          <PaginationNext
            href={href(Math.min(totalPages, page + 1))}
            aria-disabled={atEnd}
            tabIndex={atEnd ? -1 : undefined}
            className={atEnd ? disabledArrow : undefined}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
