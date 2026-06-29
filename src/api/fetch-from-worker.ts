import type { EarthquakeCollection, EarthquakeFilters } from '@/types/earthquake';
import type { WorkerRequest, WorkerResponse } from '@/worker/quake.worker';

export function fetchFromWorker(
  filters: EarthquakeFilters,
  requestId: number,
  worker: Pick<Worker, 'addEventListener' | 'removeEventListener' | 'postMessage'>,
  pending: Map<number, (error: Error) => void>,
): Promise<EarthquakeCollection> {
  return new Promise((resolve, reject) => {
    function cleanup() {
      worker.removeEventListener('message', handler);
      pending.delete(requestId);
    }

    function fail(error: Error) {
      cleanup();
      reject(error);
    }

    function handler(event: MessageEvent<WorkerResponse>): void {
      if (event.data.requestId !== requestId) {
        return;
      }
      cleanup();

      if (event.data.ok) {
        resolve(event.data.data);
      } else {
        reject(new Error(event.data.error));
      }
    }

    pending.set(requestId, fail);
    worker.addEventListener('message', handler);
    try {
      worker.postMessage({ filters, requestId } satisfies WorkerRequest);
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
