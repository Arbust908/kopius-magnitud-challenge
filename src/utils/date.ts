import type { EarthquakeFormValues } from '../types/earthquake';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;

const popupDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const utcDateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/** Converts an ISO date string (YYYY-MM-DD) to a human-readable form like "Jun 29, 2026".
 *  USGS earthquake dates are UTC — parses and formats in UTC to avoid timezone drift. */
export function formatDateInput(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return utcDateFormatter.format(date);
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getDefaultFormValues(): EarthquakeFormValues {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - DEFAULT_RANGE_DAYS * DAY_IN_MS);

  return {
    startTime: toDateInputValue(startDate),
    endTime: toDateInputValue(endDate),
    minMagnitude: '4.5',
  };
}

export function formatEventTime(time: number | null): string {
  if (time === null) {
    return 'Time unavailable';
  }

  return popupDateFormatter.format(new Date(time));
}

export function formatDepth(depth: number): string {
  return `${depth.toFixed(1)} km deep`;
}
