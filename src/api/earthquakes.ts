import type { EarthquakeCollection, EarthquakeFilters } from '../types/earthquake';

const USGS_EARTHQUAKE_ENDPOINT = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

export function buildEarthquakeQuery(filters: EarthquakeFilters): string {
  const url = new URL(USGS_EARTHQUAKE_ENDPOINT);

  url.searchParams.set('format', 'geojson');
  url.searchParams.set('starttime', filters.startTime);
  url.searchParams.set('endtime', filters.endTime);
  url.searchParams.set('minmagnitude', String(filters.minMagnitude));
  url.searchParams.set('orderby', 'time');

  return url.toString();
}

export async function fetchEarthquakes(
  filters: EarthquakeFilters,
): Promise<EarthquakeCollection> {
  const response = await fetch(buildEarthquakeQuery(filters));

  if (!response.ok) {
    throw new Error(`USGS request failed with status ${response.status}.`);
  }

  const data: unknown = await response.json();

  if (!isEarthquakeCollection(data)) {
    throw new Error('USGS returned an unexpected response shape.');
  }

  return data;
}

function isEarthquakeCollection(data: unknown): data is EarthquakeCollection {
  if (!isRecord(data)) {
    return false;
  }

  if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    return false;
  }

  return data.features.every(
    (f: unknown) =>
      isRecord(f) &&
      isRecord(f.geometry) &&
      Array.isArray(f.geometry.coordinates) &&
      f.geometry.coordinates.length >= 2,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
