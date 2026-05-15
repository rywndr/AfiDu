// Computes what semesters would look like for a given year
// based on current (or provided) settings. Does NOT write to DB
//
// Extracted from lib/queries/settings.ts so client components can safely
// import these pure functions without pulling in the database module

export interface CalendarPreviewSettings {
    semesterDurationMonths: number;
    semestersPerYear: number;
    semesterStartMonths: number[];
    academicYearStartMonth: number;
}

export interface CalendarPreviewSemester {
    semesterNumber: number;
    name: string;
    startDate: string;
    endDate: string;
}

export interface CalendarPreview {
    yearStart: string;
    yearEnd: string;
    semesters: CalendarPreviewSemester[];
}

/**
 * Get the semester parity label based on the semester number.
 * Odd semesters → "Ganjil", Even semesters → "Genap".
 */
export function getSemesterParityLabel(semesterNumber: number): string {
    return semesterNumber % 2 === 1 ? "Ganjil" : "Genap";
}

/**
 * Format a display-friendly semester name (without year).
 * e.g. "Semester 1 (Ganjil)" or "Semester 2 (Genap)"
 */
export function formatSemesterDisplayName(semesterNumber: number): string {
    return `Semester ${semesterNumber} (${getSemesterParityLabel(semesterNumber)})`;
}

/**
 * Format a semester name for storage (with year).
 * e.g. "Semester 1 (Ganjil) 2026"
 */
export function formatSemesterStorageName(
    semesterNumber: number,
    year: string,
): string {
    return `Semester ${semesterNumber} (${getSemesterParityLabel(semesterNumber)}) ${year}`;
}

/**
 * Compute calendar preview for a given year based on settings.
 *
 * Uses `semesterStartMonths` to determine when each semester starts.
 * Each semester lasts `semesterDurationMonths` months from its start month.
 *
 * If `semesterStartMonths` has fewer entries than `semestersPerYear`,
 * remaining semesters are auto-calculated from `academicYearStartMonth`
 * by adding `semesterDurationMonths` offsets.
 */
export function computeCalendarPreview(
    year: string,
    settings: CalendarPreviewSettings,
): CalendarPreview {
    const yearNum = parseInt(year, 10);
    const {
        semesterDurationMonths,
        semestersPerYear,
        semesterStartMonths,
        academicYearStartMonth,
    } = settings;

    const generatedSemesters: CalendarPreviewSemester[] = [];

    for (let i = 0; i < semestersPerYear; i++) {
        const startMonth = getStartMonthForSemester(
            i,
            semesterStartMonths,
            academicYearStartMonth,
            semesterDurationMonths,
        );

        // startMonth is 1-based; convert to 0-based for Date constructor
        const start = new Date(yearNum, startMonth - 1, 1);

        // End is the last day of (startMonth + duration - 1)
        const endMonthZeroBased = startMonth - 1 + semesterDurationMonths;
        const end = new Date(yearNum, endMonthZeroBased, 0); // last day of previous month

        const semesterNumber = i + 1;

        generatedSemesters.push({
            semesterNumber,
            name: formatSemesterStorageName(semesterNumber, year),
            startDate: formatISODate(start),
            endDate: formatISODate(end),
        });
    }

    const yearStart =
        generatedSemesters.length > 0
            ? generatedSemesters[0].startDate
            : formatISODate(new Date(yearNum, academicYearStartMonth - 1, 1));

    const lastSemester = generatedSemesters[generatedSemesters.length - 1];
    const yearEnd = lastSemester?.endDate ?? yearStart;

    return {
        yearStart,
        yearEnd,
        semesters: generatedSemesters,
    };
}

// Helpers
/**
 * Get the 1-based start month for a given semester index.
 *
 * Prefers the explicit `semesterStartMonths[index]` if available.
 * Falls back to computing from `academicYearStartMonth` + offset.
 */
function getStartMonthForSemester(
    semesterIndex: number,
    semesterStartMonths: number[],
    academicYearStartMonth: number,
    semesterDurationMonths: number,
): number {
    if (semesterIndex < semesterStartMonths.length) {
        return semesterStartMonths[semesterIndex];
    }
    // Fallback: compute from academic year start + offset
    const rawMonth =
        academicYearStartMonth + semesterIndex * semesterDurationMonths;
    // Wrap around to keep within 1-12
    return ((rawMonth - 1) % 12) + 1;
}

export function formatISODate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
