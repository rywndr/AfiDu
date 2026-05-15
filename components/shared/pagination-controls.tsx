"use client";

import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from "@/components/ui/pagination";

// Types
interface PaginationControlsProps {
    /** Current page number (1-based) */
    page: number;
    /** Total number of pages */
    totalPages: number;
    /** Callback when the user navigates to a different page */
    onPageChange: (page: number) => void;
    /** Maximum number of page buttons to show (default: 5) */
    maxVisible?: number;
    /** Label for the previous button (default: "Sebelumnya") */
    previousLabel?: string;
    /** Label for the next button (default: "Selanjutnya") */
    nextLabel?: string;
}

// Helpers
/**
 * Compute which page numbers to render, inserting `null` where an ellipsis
 * should appear. Always shows the first page, last page, and a window of
 * pages around the current page.
 */
function computePageNumbers(
    current: number,
    total: number,
    maxVisible: number,
): (number | null)[] {
    if (total <= maxVisible) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | null)[] = [];
    const sideWidth = Math.max(1, Math.floor((maxVisible - 3) / 2));

    let rangeStart = Math.max(2, current - sideWidth);
    let rangeEnd = Math.min(total - 1, current + sideWidth);

    // Adjust range to always show `maxVisible - 2` inner pages if possible
    const innerSlots = maxVisible - 2; // slots between first and last
    if (rangeEnd - rangeStart + 1 < innerSlots) {
        if (rangeStart === 2) {
            rangeEnd = Math.min(total - 1, rangeStart + innerSlots - 1);
        } else if (rangeEnd === total - 1) {
            rangeStart = Math.max(2, rangeEnd - innerSlots + 1);
        }
    }

    // First page
    pages.push(1);

    // Ellipsis before range
    if (rangeStart > 2) {
        pages.push(null);
    }

    // Range pages
    for (let i = rangeStart; i <= rangeEnd; i++) {
        pages.push(i);
    }

    // Ellipsis after range
    if (rangeEnd < total - 1) {
        pages.push(null);
    }

    // Last page
    if (total > 1) {
        pages.push(total);
    }

    return pages;
}

// Main Component
export function PaginationControls({
    page,
    totalPages,
    onPageChange,
    maxVisible = 5,
    previousLabel = "Sebelumnya",
    nextLabel = "Selanjutnya",
}: PaginationControlsProps) {
    if (totalPages <= 1) return null;

    const pageNumbers = computePageNumbers(page, totalPages, maxVisible);

    return (
        <Pagination>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        text={previousLabel}
                        onClick={(e) => {
                            e.preventDefault();
                            if (page > 1) onPageChange(page - 1);
                        }}
                        aria-disabled={page <= 1}
                        className={
                            page <= 1
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                        }
                    />
                </PaginationItem>

                {pageNumbers.map((pageNum, idx) =>
                    pageNum === null ? (
                        <PaginationItem key={`ellipsis-${idx}`}>
                            <PaginationEllipsis />
                        </PaginationItem>
                    ) : (
                        <PaginationItem key={pageNum}>
                            <PaginationLink
                                isActive={pageNum === page}
                                onClick={(e) => {
                                    e.preventDefault();
                                    onPageChange(pageNum);
                                }}
                                className="cursor-pointer"
                            >
                                {pageNum}
                            </PaginationLink>
                        </PaginationItem>
                    ),
                )}

                <PaginationItem>
                    <PaginationNext
                        text={nextLabel}
                        onClick={(e) => {
                            e.preventDefault();
                            if (page < totalPages) onPageChange(page + 1);
                        }}
                        aria-disabled={page >= totalPages}
                        className={
                            page >= totalPages
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                        }
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
}
