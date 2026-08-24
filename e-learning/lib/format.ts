/** Display helpers */

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

/** `09:00 - 10:30 · Mon, Wed`, the subtitle of every class page. */
export function formatClassSchedule(schedule: {
  startTime: string;
  endTime: string;
  days: string[];
}): string {
  return `${formatTimeRange(schedule.startTime, schedule.endTime)} · ${formatDays(
    schedule.days,
  )}`;
}

export function formatDate(value: Date): string {
  return value.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Django's `TIME_ZONE`. Datetimes are formatted in it explicitly rather than in
 * whatever zone the runtime happens to be in, so a server render and the client
 * hydration that follows produce the same string, and so the times shown here
 * match the ones the internal staff app shows.
 */
export const DISPLAY_TIME_ZONE = 'Asia/Jakarta';

export function formatDateTime(value: Date | null | undefined): string {
  if (!value) return '';
  return value.toLocaleString('en-GB', {
    timeZone: DISPLAY_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function zonedParts(value: Date): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DISPLAY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(value);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    // some locales render midnight as hour 24
    hour: read('hour') % 24,
    minute: read('minute'),
  };
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

/** The `YYYY-MM-DDTHH:mm` an `<input type="datetime-local">` expects. */
export function toDateTimeLocalValue(value: Date | null | undefined): string {
  if (!value) return '';
  const { year, month, day, hour, minute } = zonedParts(value);
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

/**
 * The inverse: read a `datetime-local` value as a wall clock time in
 * `DISPLAY_TIME_ZONE` and return the matching UTC instant as an ISO string.
 * Returns null for an empty field, which is how "no date" is expressed.
 */
export function dateTimeLocalToIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hour, minute] = match.map(Number);
  const wallClock = Date.UTC(year, month - 1, day, hour, minute);

  // The zone's offset is itself a function of the instant, so resolve it from a
  // first guess and then once more from the corrected one.
  let utc = wallClock;
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = zonedParts(new Date(utc));
    const rendered = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
    );
    utc = utc + (wallClock - rendered);
  }

  return new Date(utc).toISOString();
}

/** `1h 05m` / `45s`, from `Submission.time_spent_seconds`. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '';
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`;
}

/**
 * `9:05` / `1:04:30`, the clock a timed attempt counts down on. Minutes are only
 * padded once there are hours in front of them, so most of a test reads as
 * `24:59` rather than `0:24:59`.
 */
export function formatCountdown(seconds: number): string {
  const left = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(left / 3600);
  const minutes = Math.floor(left / 60) % 60;
  const rest = `${hours > 0 ? pad(minutes) : minutes}:${pad(left % 60)}`;
  return hours > 0 ? `${hours}:${rest}` : rest;
}

/**
 * Trim the trailing zeros Postgres `numeric` keeps, so `12.00` reads as `12`
 * and `12.50` as `12.5`. Scores arrive as strings to preserve their precision.
 */
export function formatScore(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? String(asNumber) : value;
}

/** `1 question` / `3 questions`, which these pages count out constantly. */
export function pluralize(count: number, word: string, plural = `${word}s`): string {
  return `${count} ${count === 1 ? word : plural}`;
}
