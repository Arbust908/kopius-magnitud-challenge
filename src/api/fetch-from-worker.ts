import type { EarthquakeCollection, EarthquakeFilters } from '../types/earthquake';
import type { WorkerRequest, WorkerResponse } from '../worker/quake.worker';

export function fetchFromWorker(
  filters: EarthquakeFilters,
  requestId: number,
  worker: Pick<Worker, 'addEventListener' | 'removeEventListener' | 'postMessage'>,
  pending: Map<number, (error: Error) => void>,
): Promise<EarthquakeCollection> {
  return new Promise((resolve, reject) => {
    function handler(event: MessageEvent<WorkerResponse>): void {
      if (event.data.requestId !== requestId) {
        return;
      }
      worker.removeEventListener('message', handler);
      pending.delete(requestId);

      if (event.data.ok) {
        resolve(event.data.data);
      } else {
        reject(new Error(event.data.error));
      }
    }

    pending.set(requestId, reject);
    worker.addEventListener('message', handler);
    worker.postMessage({ filters, requestId } satisfies WorkerRequest);
  });
}
