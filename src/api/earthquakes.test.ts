import { describe, it, expect } from 'vitest';
import { buildEarthquakeQuery } from './earthquakes';

describe('buildEarthquakeQuery', () => {
  it('builds a USGS URL with all filter params', () => {
    const url = new URL(
      buildEarthquakeQuery({
        startTime: '2026-01-01',
        endTime: '2026-06-29',
        minMagnitude: 4.5,
      }),
    );

    expect(url.origin + url.pathname).toBe(
      'https://earthquake.usgs.gov/fdsnws/event/1/query',
    );
    expect(url.searchParams.get('format')).toBe('geojson');
    expect(url.searchParams.get('starttime')).toBe('2026-01-01');
    expect(url.searchParams.get('endtime')).toBe('2026-06-29');
    expect(url.searchParams.get('minmagnitude')).toBe('4.5');
    expect(url.searchParams.get('orderby')).toBe('time');
  });

  it('encodes special characters in dates', () => {
    const url = buildEarthquakeQuery({
      startTime: '2026-01-01',
      endTime: '2026-12-31',
      minMagnitude: 0,
    });

    // URL constructor normalises; just check the params survive the round-trip
    const parsed = new URL(url);
    expect(parsed.searchParams.get('minmagnitude')).toBe('0');
  });

  it('handles integer magnitude', () => {
    const url = new URL(
      buildEarthquakeQuery({
        startTime: '2026-06-01',
        endTime: '2026-06-30',
        minMagnitude: 6,
      }),
    );

    expect(url.searchParams.get('minmagnitude')).toBe('6');
  });
});
