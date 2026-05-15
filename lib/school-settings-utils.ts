/**
 * Utility functions for school settings configuration.
 * Extracted from school-settings-card for reusability and testability.
 */

/**
 * Build a default array of start months when none exist yet.
 * Spreads semesters evenly across 12 months starting from month 1.
 */
export function buildDefaultStartMonths(
    semestersPerYear: number,
    durationMonths: number,
): number[] {
    const result: number[] = [];
    for (let i = 0; i < semestersPerYear; i++) {
        const month = ((i * durationMonths) % 12) + 1;
        result.push(month);
    }
    return result;
}

/**
 * Adjust the start months array when the number of semesters changes.
 * Preserves existing values and fills new slots with computed defaults.
 */
export function adjustStartMonthsArray(
    current: number[],
    newCount: number,
    durationMonths: number,
): number[] {
    if (newCount <= current.length) {
        return current.slice(0, newCount);
    }

    const result = [...current];
    for (let i = current.length; i < newCount; i++) {
        const lastMonth = result[i - 1] ?? 1;
        const nextMonth = ((lastMonth - 1 + durationMonths) % 12) + 1;
        result.push(nextMonth);
    }
    return result;
}
