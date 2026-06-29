import type { EarthquakeFormValues } from '../types/earthquake';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;

const popupDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** Converts an ISO date string (YYYY-MM-DD) to a human-readable form like "Jun 29, 2026". */
export function formatDateInput(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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
