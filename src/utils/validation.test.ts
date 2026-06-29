import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateEarthquakeFilters } from './validation';

const TODAY = '2026-06-29';

afterEach(() => {
  vi.useRealTimers();
});

function validValues(overrides: Partial<Record<string, string>> = {}) {
  return {
    startTime: '2026-06-01',
    endTime: '2026-06-28',
    minMagnitude: '4.5',
    ...overrides,
  };
}

describe('validateEarthquakeFilters', () => {
  it('returns filters when all values are valid', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));

    const result = validateEarthquakeFilters(validValues());

    expect(result.errors).toEqual({});
    expect(result.filters).toEqual({
      startTime: '2026-06-01',
      endTime: '2026-06-28',
      minMagnitude: 4.5,
    });
  });

  it('errors when start date is missing', () => {
    const result = validateEarthquakeFilters(validValues({ startTime: '' }));
    expect(result.errors.startTime).toBe('Choose a start date.');
    expect(result.filters).toBeUndefined();
  });

  it('errors when start date is whitespace only', () => {
    const result = validateEarthquakeFilters(validValues({ startTime: '   ' }));
    expect(result.errors.startTime).toBe('Choose a start date.');
  });

  it('errors when end date is missing', () => {
    const result = validateEarthquakeFilters(validValues({ endTime: '' }));
    expect(result.errors.endTime).toBe('Choose an end date.');
  });

  it('errors when start date is after end date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));

    const result = validateEarthquakeFilters(
      validValues({ startTime: '2026-06-25', endTime: '2026-06-20' }),
    );

    expect(result.errors.endTime).toBe('End date must be on or after the start date.');
  });

  it('errors when start date is in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));

    const result = validateEarthquakeFilters(validValues({ startTime: '2099-01-01' }));

    expect(result.errors.startTime).toBe('Start date cannot be in the future.');
  });

  it('errors when end date is in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));

    const result = validateEarthquakeFilters(validValues({ endTime: '2099-01-01' }));

    expect(result.errors.endTime).toBe('End date cannot be in the future.');
  });

  it('allows start equals end', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));

    const result = validateEarthquakeFilters(
      validValues({ startTime: '2026-06-15', endTime: '2026-06-15' }),
    );

    expect(result.errors).toEqual({});
    expect(result.filters).toBeDefined();
  });

  it('errors when min magnitude is missing', () => {
    const result = validateEarthquakeFilters(validValues({ minMagnitude: '' }));
    expect(result.errors.minMagnitude).toBe('Enter a minimum magnitude.');
  });

  it('errors when min magnitude is not a number', () => {
    const result = validateEarthquakeFilters(validValues({ minMagnitude: 'abc' }));
    expect(result.errors.minMagnitude).toBe('Magnitude must be a number.');
  });

  it('errors when min magnitude is negative', () => {
    const result = validateEarthquakeFilters(validValues({ minMagnitude: '-1' }));
    expect(result.errors.minMagnitude).toBe('Magnitude cannot be negative.');
  });

  it('accepts zero magnitude', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));

    const result = validateEarthquakeFilters(validValues({ minMagnitude: '0' }));

    expect(result.errors).toEqual({});
    expect(result.filters?.minMagnitude).toBe(0);
  });

  it('accumulates multiple errors', () => {
    const result = validateEarthquakeFilters({
      startTime: '',
      endTime: '',
      minMagnitude: '',
    });

    expect(result.errors.startTime).toBeDefined();
    expect(result.errors.endTime).toBeDefined();
    expect(result.errors.minMagnitude).toBeDefined();
    expect(result.filters).toBeUndefined();
  });

  it('trims whitespace from inputs', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));

    const result = validateEarthquakeFilters({
      startTime: '  2026-06-01  ',
      endTime: '  2026-06-28  ',
      minMagnitude: '  5.0  ',
    });

    expect(result.errors).toEqual({});
    expect(result.filters).toEqual({
      startTime: '2026-06-01',
      endTime: '2026-06-28',
      minMagnitude: 5,
    });
  });
});
