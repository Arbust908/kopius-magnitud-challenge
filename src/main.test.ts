import { describe, it, expect, vi } from 'vitest';
import type { WorkerResponse } from './worker/quake.worker';
import { EMPTY_COLLECTION } from './types/earthquake';
import type { EarthquakeCollection, EarthquakeFilters } from './types/earthquake';
import { fetchFromWorker } from './api/fetch-from-worker';

const filters: EarthquakeFilters = {
  startTime: '2026-01-01',
  endTime: '2026-06-29',
  minMagnitude: 4.5,
};

function makeWorker() {
  const listeners = new Map<string, Set<(event: Event) => void>>();
  return {
    addEventListener: vi.fn(
      (_type: string, listener: (event: Event) => void) => {
        if (!listeners.has('message')) listeners.set('message', new Set());
        listeners.get('message')!.add(listener);
      },
    ),
    removeEventListener: vi.fn(
      (_type: string, listener: (event: Event) => void) => {
        listeners.get('message')?.delete(listener);
      },
    ),
    postMessage: vi.fn(),
    dispatchEvent(event: MessageEvent<WorkerResponse>) {
      const handlers = listeners.get('message');
      if (handlers) {
        for (const listener of handlers) {
          listener(event);
        }
      }
    },
  };
}

function makeResponse(overrides: {
  requestId: number;
  ok: true;
  data?: EarthquakeCollection;
} | {
  requestId: number;
  ok: false;
  error: string;
}): MessageEvent<WorkerResponse> {
  const data: WorkerResponse = overrides.ok
    ? { ok: true, data: overrides.data ?? EMPTY_COLLECTION, requestId: overrides.requestId }
    : { ok: false, error: overrides.error, requestId: overrides.requestId };
  return new MessageEvent('message', { data });
}

describe('fetchFromWorker', () => {
  it('resolves with data when response has matching requestId', async () => {
    const worker = makeWorker();
    const pending = new Map<number, (error: Error) => void>();

    const promise = fetchFromWorker(filters, 1, worker, pending);

    worker.dispatchEvent(makeResponse({ requestId: 1, ok: true, data: EMPTY_COLLECTION }));

    await expect(promise).resolves.toEqual(EMPTY_COLLECTION);
  });

  it('rejects with error when response has matching requestId but ok: false', async () => {
    const worker = makeWorker();
    const pending = new Map<number, (error: Error) => void>();

    const promise = fetchFromWorker(filters, 2, worker, pending);

    worker.dispatchEvent(makeResponse({ requestId: 2, ok: false, error: 'Network error' }));

    await expect(promise).rejects.toThrow('Network error');
  });

  it('ignores response when requestId does not match', async () => {
    const worker = makeWorker();
    const pending = new Map<number, (error: Error) => void>();

    const promise = fetchFromWorker(filters, 5, worker, pending);

    // dispatch a stale response with a different requestId
    worker.dispatchEvent(makeResponse({ requestId: 3, ok: true, data: EMPTY_COLLECTION }));

    // the promise should still be pending — confirm by racing against a microtask
    let settled = false;
    promise.then(
      () => { settled = true; },
      () => { settled = true; },
    );

    // flush microtasks
    await new Promise((r) => setTimeout(r, 0));

    expect(settled).toBe(false);
  });

  it('removes listener and cleans pending map after matching response', async () => {
    const worker = makeWorker();
    const pending = new Map<number, (error: Error) => void>();

    const promise = fetchFromWorker(filters, 8, worker, pending);

    expect(pending.has(8)).toBe(true);

    worker.dispatchEvent(makeResponse({ requestId: 8, ok: true, data: EMPTY_COLLECTION }));

    await promise;

    expect(pending.has(8)).toBe(false);
    expect(worker.removeEventListener).toHaveBeenCalled();
  });

  it('posts message to worker with filters and requestId', () => {
    const worker = makeWorker();
    const pending = new Map<number, (error: Error) => void>();

    fetchFromWorker(filters, 42, worker, pending);

    expect(worker.postMessage).toHaveBeenCalledWith({
      filters,
      requestId: 42,
    });
  });

  it('only the matching response resolves — superseding request does not resolve the older promise', async () => {
    const worker = makeWorker();
    const pending = new Map<number, (error: Error) => void>();

    // Two concurrent calls with different requestIds
    const oldPromise = fetchFromWorker(filters, 1, worker, pending);
    const newPromise = fetchFromWorker(filters, 2, worker, pending);

    // The response for requestId=2 arrives — should resolve newPromise only
    worker.dispatchEvent(makeResponse({ requestId: 2, ok: true, data: EMPTY_COLLECTION }));

    await expect(newPromise).resolves.toEqual(EMPTY_COLLECTION);

    // oldPromise should still be pending
    let oldSettled = false;
    oldPromise.then(
      () => { oldSettled = true; },
      () => { oldSettled = true; },
    );

    await new Promise((r) => setTimeout(r, 0));

    expect(oldSettled).toBe(false);

    // Now the old response arrives — should resolve the old promise
    worker.dispatchEvent(makeResponse({ requestId: 1, ok: true, data: EMPTY_COLLECTION }));

    await expect(oldPromise).resolves.toEqual(EMPTY_COLLECTION);
  });
});
