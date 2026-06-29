import { describe, it, expect } from 'vitest';
import { formatDateInput, formatDepth, formatEventTime } from './date';

describe('formatDateInput', () => {
  it('formats a YYYY-MM-DD string to a readable date', () => {
    const result = formatDateInput('2026-06-29');
    // Exact format depends on locale, but should contain month, day, year
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/29/);
    expect(result).toMatch(/2026/);
  });

  it('formats January 1st correctly', () => {
    const result = formatDateInput('2025-01-01');
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/1/);
    expect(result).toMatch(/2025/);
  });

  it('formats December 31st correctly', () => {
    const result = formatDateInput('2024-12-31');
    expect(result).toMatch(/Dec/);
    expect(result).toMatch(/31/);
    expect(result).toMatch(/2024/);
  });

  it('handles leap year date', () => {
    const result = formatDateInput('2024-02-29');
    expect(result).toMatch(/Feb/);
    expect(result).toMatch(/29/);
    expect(result).toMatch(/2024/);
  });
});

describe('formatDepth', () => {
  it('formats depth to one decimal place with unit', () => {
    expect(formatDepth(10)).toBe('10.0 km deep');
  });

  it('rounds to one decimal place', () => {
    expect(formatDepth(12.345)).toBe('12.3 km deep');
  });

  it('handles zero depth', () => {
    expect(formatDepth(0)).toBe('0.0 km deep');
  });

  it('handles negative depth gracefully', () => {
    // Edge case — shouldn't happen but the function doesn't guard against it
    expect(formatDepth(-5.1)).toBe('-5.1 km deep');
  });
});

describe('formatEventTime', () => {
  it('returns "Time unavailable" for null', () => {
    expect(formatEventTime(null)).toBe('Time unavailable');
  });

  it('formats a Unix timestamp to a locale string', () => {
    // 2026-06-29T12:00:00.000Z
    const timestamp = Date.UTC(2026, 5, 29, 12, 0, 0);
    const result = formatEventTime(timestamp);

    // Should contain year and some time indication
    expect(result).toMatch(/2026/);
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles epoch zero', () => {
    const result = formatEventTime(0);
    // Epoch zero is 1970-01-01 UTC, but may show as 1969-12-31 locally
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('Time unavailable');
  });
});
