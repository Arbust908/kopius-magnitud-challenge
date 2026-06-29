import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { WorkerRequest } from './quake.worker';
import { EMPTY_COLLECTION } from '@/types/earthquake';

const mockPostMessage = vi.fn();

let handleWorkerMessage: (event: MessageEvent<WorkerRequest>) => Promise<void>;

beforeAll(async () => {
  vi.stubGlobal('fetch', vi.fn());
  vi.stubGlobal('self', {
    postMessage: mockPostMessage,
    addEventListener: vi.fn(),
  });
  const mod = await import('./quake.worker');
  handleWorkerMessage = mod.handleWorkerMessage;
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  mockPostMessage.mockClear();
});

function makeEvent(filters: WorkerRequest['filters'], requestId: number) {
  return new MessageEvent('message', {
    data: { filters, requestId },
  });
}

const filters = {
  startTime: '2026-01-01',
  endTime: '2026-06-29',
  minMagnitude: 4.5,
};

describe('handleWorkerMessage', () => {
  it('posts success with matching requestId', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(EMPTY_COLLECTION),
    } as unknown as Response);

    await handleWorkerMessage(makeEvent(filters, 42));

    expect(mockPostMessage).toHaveBeenCalledWith({
      ok: true,
      data: EMPTY_COLLECTION,
      requestId: 42,
    });
  });

  it('posts error when response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    await handleWorkerMessage(makeEvent(filters, 13));

    expect(mockPostMessage).toHaveBeenCalledWith({
      ok: false,
      error: 'USGS request failed with status 500.',
      requestId: 13,
    });
  });

  it('posts error when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    await handleWorkerMessage(makeEvent(filters, 7));

    expect(mockPostMessage).toHaveBeenCalledWith({
      ok: false,
      error: 'Network error',
      requestId: 7,
    });
  });

  it('handles non-Error thrown values', async () => {
    vi.mocked(fetch).mockRejectedValue('rate limited');

    await handleWorkerMessage(makeEvent(filters, 99));

    expect(mockPostMessage).toHaveBeenCalledWith({
      ok: false,
      error: 'rate limited',
      requestId: 99,
    });
  });
});
