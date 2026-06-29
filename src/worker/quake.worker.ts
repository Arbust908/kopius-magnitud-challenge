/// <reference lib="webworker" />

import { fetchEarthquakes } from '../api/earthquakes';
import type { EarthquakeCollection, EarthquakeFilters } from '../types/earthquake';

export interface WorkerRequest {
  filters: EarthquakeFilters;
  requestId: number;
}

export type WorkerResponse =
  | { ok: true; data: EarthquakeCollection; requestId: number }
  | { ok: false; error: string; requestId: number };

export async function handleWorkerMessage(
  event: MessageEvent<WorkerRequest>,
): Promise<void> {
  const { filters, requestId } = event.data;

  try {
    const data = await fetchEarthquakes(filters);
    self.postMessage({ ok: true, data, requestId } satisfies WorkerResponse);
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      requestId,
    } satisfies WorkerResponse);
  }
}

self.addEventListener('message', (e) => void handleWorkerMessage(e));
