import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildCacheKey,
  isHistorical,
  isExpired,
  getCachedEarthquake,
  setCachedEarthquake,
  clearCache,
  MAX_CACHE_ENTRIES,
  RECENT_TTL_MS,
} from './db';
import type { EarthquakeCollection, EarthquakeFilters } from '@/types/earthquake';
import { toDateInputValue } from '@/utils/date';

function makeFilters(overrides?: Partial<EarthquakeFilters>): EarthquakeFilters {
  return {
    startTime: '2026-01-01',
    endTime: '2026-01-31',
    minMagnitude: 4.5,
    ...overrides,
  };
}

function makeCollection(count = 1): EarthquakeCollection {
  return {
    type: 'FeatureCollection',
    features: Array.from({ length: count }, (_, i) => ({
      type: 'Feature' as const,
      id: `eq-${i}`,
      properties: { mag: 4.5, place: `Place ${i}`, time: 1700000000000 },
      geometry: { type: 'Point' as const, coordinates: [0, 0, 10] },
    })),
  };
}

beforeEach(async () => {
  await clearCache();
});

describe('buildCacheKey', () => {
  it('joins filters with pipes', () => {
    expect(buildCacheKey(makeFilters())).toBe('2026-01-01|2026-01-31|4.5');
  });

  it('includes magnitude as-is from the filter', () => {
    expect(buildCacheKey(makeFilters({ minMagnitude: 7 }))).toBe('2026-01-01|2026-01-31|7');
  });
});

describe('isHistorical', () => {
  it('returns true when endTime is before today', () => {
    expect(isHistorical('2020-01-01')).toBe(true);
  });

  it('returns false when endTime is today', () => {
    expect(isHistorical(toDateInputValue(new Date()))).toBe(false);
  });

  it('returns false when endTime is in the future', () => {
    expect(isHistorical('2099-12-31')).toBe(false);
  });
});

describe('isExpired', () => {
  it('returns false for historical ranges regardless of age', () => {
    const oldTimestamp = Date.now() - 365 * 24 * 60 * 60 * 1000;
    expect(isExpired(oldTimestamp, '2020-01-01')).toBe(false);
  });

  it('returns false for recent entry within TTL', () => {
    const recentTimestamp = Date.now() - 60 * 1000; // 1 minute ago
    const today = toDateInputValue(new Date());
    expect(isExpired(recentTimestamp, today)).toBe(false);
  });

  it('returns true for recent entry past TTL', () => {
    const oldTimestamp = Date.now() - RECENT_TTL_MS - 1000;
    const today = toDateInputValue(new Date());
    expect(isExpired(oldTimestamp, today)).toBe(true);
  });
});

describe('getCachedEarthquake / setCachedEarthquake', () => {
  it('stores and retrieves by exact filter key', async () => {
    const filters = makeFilters();
    const data = makeCollection(3);

    await setCachedEarthquake(filters, data);
    const result = await getCachedEarthquake(filters);

    expect(result).toEqual(data);
  });

  it('returns undefined for a cache miss', async () => {
    const result = await getCachedEarthquake(makeFilters());
    expect(result).toBeUndefined();
  });

  it('returns undefined for an expired recent entry', async () => {
    const today = toDateInputValue(new Date());
    const filters = makeFilters({ endTime: today });
    const data = makeCollection(1);

    await setCachedEarthquake(filters, data);

    // Manually expire by clearing and re-inserting with old fetchedAt
    await clearCache();
    const { buildCacheKey: keyFn } = await import('./db');
    const key = keyFn(filters);
    const { openDB } = await import('idb');
    const db = await openDB('earthquake-cache', 1);
    await db.put('quakes', {
      key,
      data,
      fetchedAt: Date.now() - RECENT_TTL_MS - 1000,
    });
    db.close();

    const result = await getCachedEarthquake(filters);
    expect(result).toBeUndefined();
  });

  it('returns cached data for historical range even when old', async () => {
    const filters = makeFilters({ endTime: '2020-06-15' });
    const data = makeCollection(2);

    await setCachedEarthquake(filters, data);
    const result = await getCachedEarthquake(filters);

    expect(result).toEqual(data);
  });

  it('does not return data for a different key', async () => {
    await setCachedEarthquake(makeFilters(), makeCollection(1));
    const result = await getCachedEarthquake(makeFilters({ minMagnitude: 6 }));
    expect(result).toBeUndefined();
  });

  it('overwrites existing entry with same key', async () => {
    const filters = makeFilters();
    await setCachedEarthquake(filters, makeCollection(1));
    await setCachedEarthquake(filters, makeCollection(5));

    const result = await getCachedEarthquake(filters);
    expect(result?.features).toHaveLength(5);
  });
});

describe('LRU eviction', () => {
  it('evicts oldest entries when max count is reached', async () => {
    // Fill cache to max
    for (let i = 0; i < MAX_CACHE_ENTRIES; i++) {
      await setCachedEarthquake(
        makeFilters({ startTime: `2026-01-${String(i + 1).padStart(2, '0')}` }),
        makeCollection(i),
      );
    }

    // The first entry should still be there
    const firstKey = makeFilters({ startTime: '2026-01-01' });
    expect(await getCachedEarthquake(firstKey)).toBeDefined();

    // Adding one more should evict the oldest
    await setCachedEarthquake(
      makeFilters({ startTime: '2026-02-01' }),
      makeCollection(99),
    );

    // First entry should now be evicted
    expect(await getCachedEarthquake(firstKey)).toBeUndefined();

    // Newest entry should be present
    const newest = makeFilters({ startTime: '2026-02-01' });
    expect(await getCachedEarthquake(newest)).toBeDefined();
  });
});

describe('clearCache', () => {
  it('removes all entries', async () => {
    await setCachedEarthquake(makeFilters(), makeCollection(1));
    await setCachedEarthquake(makeFilters({ minMagnitude: 6 }), makeCollection(2));

    await clearCache();

    expect(await getCachedEarthquake(makeFilters())).toBeUndefined();
    expect(await getCachedEarthquake(makeFilters({ minMagnitude: 6 }))).toBeUndefined();
  });
});
