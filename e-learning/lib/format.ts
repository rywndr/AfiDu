/** Display helpers shared by the module pages. Safe on both sides of the wire. */

import { DAYS_SHORT } from '@/lib/choices';

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/** Postgres `time` arrives as `HH:MM:SS`; classes are only ever shown to the minute. */
function formatTime(value: string): string {
  return value.slice(0, 5);
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

/** Mirrors `StudentClass.days_short_display`. */
export function formatDays(days: string[]): string {
  const names = days.map((day) => DAYS_SHORT[day]).filter(Boolean);
  return names.length > 0 ? names.join(', ') : 'No schedule';
}

export function formatDate(value: Date): string {
  return value.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
