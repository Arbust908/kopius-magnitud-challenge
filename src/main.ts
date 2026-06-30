import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/main.css';

import { registerSW } from 'virtual:pwa-register';
import { showUpdateBanner, showOfflineReady, showOfflineIndicator } from '@/utils/sw-ui';
import { createEarthquakeMap } from '@/components/EarthquakeMap';
import { createSidebar } from '@/components/Sidebar';
import type { EarthquakeCollection, EarthquakeFilters, SidebarStatus } from '@/types/earthquake';
import { EMPTY_COLLECTION } from '@/types/earthquake';
import { fetchFromWorker } from '@/api/fetch-from-worker';
import { getCachedEarthquake, setCachedEarthquake } from '@/cache/db';
import { formatDateInput, getDefaultFormValues } from '@/utils/date';
import { injectMagnitudeStyles } from '@/utils/magnitude-scale';
import { validateEarthquakeFilters } from '@/utils/validation';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('Missing #app root element.');
}

injectMagnitudeStyles();

const appShell = document.createElement('main');
appShell.className = 'app-shell';

const sidebarPanel = document.createElement('aside');
sidebarPanel.className = 'sidebar-panel';

const mapPanel = document.createElement('section');
mapPanel.className = 'map-panel';
mapPanel.setAttribute('aria-label', 'Earthquake map');

const filterToggle = document.createElement('button');
filterToggle.className = 'filter-toggle';
filterToggle.type = 'button';
filterToggle.setAttribute('aria-expanded', 'false');
filterToggle.textContent = '☰ Filters';

const backdrop = document.createElement('button');
backdrop.className = 'sidebar-backdrop';
backdrop.type = 'button';
backdrop.setAttribute('aria-label', 'Close filters');

const mapController = createEarthquakeMap();
const defaultFormValues = getDefaultFormValues();

const quakeWorker = new Worker(
  new URL('./worker/quake.worker.ts', import.meta.url),
  { type: 'module' },
);
let nextRequestId = 0;
let activeRequestId = 0;
const pendingRequests = new Map<number, (error: Error) => void>();

quakeWorker.onerror = (errorEvent) => {
  const error = new Error(errorEvent.message ?? 'Earthquake worker crashed');
  console.error(error);

  for (const reject of pendingRequests.values()) {
    reject(error);
  }
  pendingRequests.clear();
};

const sidebarController = createSidebar({
  initialValues: defaultFormValues,
  onSubmit(filters) {
    void searchEarthquakes(filters);
  },
  onClose() {
    setSidebarOpen(false);
  },
});

filterToggle.addEventListener('click', () => {
  setSidebarOpen(!appShell.classList.contains('sidebar-open'));
});

backdrop.addEventListener('click', () => {
  setSidebarOpen(false);
});

sidebarPanel.append(sidebarController.element);
mapPanel.append(filterToggle, mapController.element);
appShell.append(sidebarPanel, mapPanel, backdrop);
root.append(appShell);

const initialValidation = validateEarthquakeFilters(defaultFormValues);

if (initialValidation.filters) {
  void searchEarthquakes(initialValidation.filters);
}

// ponytail: SW registration with callbacks for update/offline UI
const updateSW = registerSW({
  onNeedRefresh() {
    showUpdateBanner(() => updateSW(true));
  },
  onOfflineReady() {
    showOfflineReady();
  },
});

showOfflineIndicator();
type FetchSource = 'cache' | 'network';

async function fetchEarthquakeData(
  filters: EarthquakeFilters,
  requestId: number,
): Promise<{ data: EarthquakeCollection; source: FetchSource }> {
  try {
    const cached = await getCachedEarthquake(filters);
    if (cached) return { data: cached, source: 'cache' };
  } catch {
    // IndexedDB unavailable — fall through
  }

  const data = await fetchFromWorker(filters, requestId, quakeWorker, pendingRequests);
  setCachedEarthquake(filters, data).catch(() => { });
  return { data, source: 'network' };
}

async function searchEarthquakes(filters: EarthquakeFilters): Promise<void> {
  // ponytail: reject superseded request so fetchFromWorker's cleanup() runs
  if (pendingRequests.has(activeRequestId)) {
    pendingRequests.get(activeRequestId)!(new Error('Superseded'));
  }

  const requestId = ++nextRequestId;
  activeRequestId = requestId;
  sidebarController.setLoading(true);
  sidebarController.setStatus({ type: 'loading', title: 'Searching USGS…', detail: 'Fetching earthquake GeoJSON for the selected filters.' });

  try {
    const { data, source } = await fetchEarthquakeData(filters, requestId);
    if (activeRequestId !== requestId) return;

    mapController.setEarthquakes(data.features.length === 0 ? EMPTY_COLLECTION : data);
    setSidebarOpen(false);
    sidebarController.setStatus(buildSearchStatus(data.features.length, filters, source));
  } catch (error) {
    if (activeRequestId !== requestId) return;
    mapController.setEarthquakes(EMPTY_COLLECTION);
    sidebarController.setStatus({
      type: 'error',
      title: 'Search failed',
      detail: error instanceof Error ? error.message : 'Unable to fetch earthquakes right now.',
    });
  } finally {
    if (activeRequestId === requestId) {
      sidebarController.resetLoading();
      activeRequestId = 0;
    }
  }
}

function setSidebarOpen(isOpen: boolean): void {
  appShell.classList.toggle('sidebar-open', isOpen);
  filterToggle.setAttribute('aria-expanded', String(isOpen));
  mapController.resize();
}

function buildSearchStatus(count: number, filters: EarthquakeFilters, source: FetchSource): SidebarStatus {
  if (count === 0) {
    return {
      type: 'empty',
      title: 'No earthquakes found',
      detail: 'Try widening the date range or lowering the minimum magnitude.',
    };
  }

  const title = count === 1 ? '1 earthquake found' : `${count.toLocaleString()} earthquakes found`;
  const magnitudeLabel = filters.minMagnitude >= 9.5
    ? `magnitude ${filters.minMagnitude}`
    : `magnitude ${filters.minMagnitude} and up`;
  const detail = `Showing events for ${magnitudeLabel} between ${formatDateInput(filters.startTime)} – ${formatDateInput(filters.endTime)}`;
  const suffix = source === 'cache' ? ' (from cache)' : '';

  return { type: 'success', title, detail: detail + suffix } satisfies SidebarStatus;
}
