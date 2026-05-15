import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

/**
 * Format an integer amount (in Rupiah) to a human readable string
 * e.g. 500000 → "Rp500.000"
 */
export function formatRupiah(amount: number): string {
    return rupiahFormatter.format(amount);
}

/**
 * Parse a currency string back to an int
 * Strips "Rp", dots, and spaces. Returns 0 for invalid input
 */
export function parseRupiah(value: string): number {
    const cleaned = value.replace(/[^\d-]/g, "");
    const parsed = parseInt(cleaned, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
}

// Date formatters

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
});

/**
 * Format a Date or ISO string to a long date
 * e.g. "1 Januari 2026"
 */
export function formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "—";
    return dateFormatter.format(d);
}

/**
 * Format a Date or ISO string to a short date
 * e.g. "1 Jan 2026"
 */
export function formatDateShort(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "—";
    return shortDateFormatter.format(d);
}

/**
 * Format a Date or ISO string to YYYY-MM-DD (for date inputs)
 */
export function toISODateString(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
}

// Month helpers

const MONTH_NAMES = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
] as const;

/**
 * Get month name for a 1-based month number
 */
export function getMonthName(month: number): string {
    return MONTH_NAMES[(month - 1) % 12] ?? "";
}

/**
 * Get all month names
 */
export function getAllMonthNames(): readonly string[] {
    return MONTH_NAMES;
}

// other helpers

/**
 * Generate a student number with a prefix and zero-padded sequence.
 * e.g. generateStudentNumber("STD", 42) → "STD00042"
 */
export function generateStudentNumber(
    prefix: string,
    sequence: number,
    padLength = 5,
): string {
    return `${prefix}${String(sequence).padStart(padLength, "0")}`;
}
