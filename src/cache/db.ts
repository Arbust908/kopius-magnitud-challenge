import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { EarthquakeCollection, EarthquakeFilters } from '@/types/earthquake';
import { toDateInputValue } from '@/utils/date';

export const DB_NAME = 'earthquake-cache';
export const STORE_NAME = 'quakes';
export const DB_VERSION = 1;
export const MAX_CACHE_ENTRIES = 50;
export const RECENT_TTL_MS = 5 * 60 * 1000;

interface StoredEarthquake {
  key: string;
  data: EarthquakeCollection;
  fetchedAt: number;
}

interface CacheDBSchema {
  quakes: {
    key: string;
    value: StoredEarthquake;
    indexes: { 'fetchedAt': number };
  };
}

let dbPromise: Promise<IDBPDatabase<CacheDBSchema>> | undefined;

function getDb(): Promise<IDBPDatabase<CacheDBSchema>> {
  dbPromise ??= openDB<CacheDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      store.createIndex('fetchedAt', 'fetchedAt');
    },
  }).catch((err) => {
    dbPromise = undefined;
    throw err;
  });
  return dbPromise;
}

export function buildCacheKey(filters: EarthquakeFilters): string {
  return `${filters.startTime}|${filters.endTime}|${filters.minMagnitude}`;
}

export function isHistorical(endTime: string): boolean {
  return endTime < toDateInputValue(new Date());
}

export function isExpired(fetchedAt: number, endTime: string): boolean {
  if (isHistorical(endTime)) {
    return false;
  }
  return Date.now() - fetchedAt > RECENT_TTL_MS;
}

export async function getCachedEarthquake(
  filters: EarthquakeFilters,
): Promise<EarthquakeCollection | undefined> {
  const db = await getDb();
  const key = buildCacheKey(filters);
  const entry = await db.get(STORE_NAME, key);

  if (!entry) {
    return undefined;
  }

  if (isExpired(entry.fetchedAt, filters.endTime)) {
    await db.delete(STORE_NAME, key);
    return undefined;
  }

  return entry.data;
}

export async function setCachedEarthquake(
  filters: EarthquakeFilters,
  data: EarthquakeCollection,
): Promise<void> {
  const db = await getDb();
  const key = buildCacheKey(filters);

  await db.put(STORE_NAME, {
    key,
    data,
    fetchedAt: Date.now(),
  });

  await pruneCache(db);
}

export async function clearCache(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}

async function pruneCache(db: IDBPDatabase<CacheDBSchema>): Promise<void> {
  const count = await db.count(STORE_NAME);
  if (count <= MAX_CACHE_ENTRIES) {
    return;
  }

  const tx = db.transaction(STORE_NAME, 'readwrite');
  const index = tx.store.index('fetchedAt');
  let cursor = await index.openCursor();
  let toDelete = count - MAX_CACHE_ENTRIES;

  while (cursor && toDelete > 0) {
    await cursor.delete();
    toDelete--;
    cursor = await cursor.continue();
  }

  await tx.done;
}
