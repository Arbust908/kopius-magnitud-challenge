import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/main.css';

import { fetchEarthquakes } from './api/earthquakes';
import { createEarthquakeMap } from './components/EarthquakeMap';
import { createSidebar } from './components/Sidebar';
import type { EarthquakeCollection, EarthquakeFilters, SidebarStatus } from './types/earthquake';
import { formatDateInput, getDefaultFormValues } from './utils/date';
import { validateEarthquakeFilters } from './utils/validation';

const EMPTY_COLLECTION: EarthquakeCollection = {
  type: 'FeatureCollection',
  features: [],
};

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('Missing #app root element.');
}

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
let activeRequest: AbortController | undefined;

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

async function searchEarthquakes(filters: EarthquakeFilters): Promise<void> {
  activeRequest?.abort();

  const request = new AbortController();
  activeRequest = request;

  sidebarController.setLoading(true);
  sidebarController.setStatus({
    type: 'loading',
    title: 'Searching USGS…',
    detail: 'Fetching earthquake GeoJSON for the selected filters.',
  });

  try {
    const earthquakes = await fetchEarthquakes(filters, { signal: request.signal });

    if (activeRequest !== request) {
      return;
    }

    mapController.setEarthquakes(earthquakes);
    setSidebarOpen(false);

    const count = earthquakes.features.length;

    if (count === 0) {
      sidebarController.setStatus({
        type: 'empty',
        title: 'No earthquakes found',
        detail: 'Try widening the date range or lowering the minimum magnitude.',
      });
      return;
    }

    const successTitle = count === 1 ? '1 earthquake found' : `${count.toLocaleString()} earthquakes found`;
    const magnitudeLabel = filters.minMagnitude >= 9.5
      ? `magnitude ${filters.minMagnitude}`
      : `magnitude ${filters.minMagnitude} and up`;
    const successDetail = `Showing events for ${magnitudeLabel} between ${formatDateInput(filters.startTime)} – ${formatDateInput(filters.endTime)}`;

    const successStatus = {
      type: 'success',
      title: successTitle,
      detail: successDetail,
    } satisfies SidebarStatus;

    sidebarController.setStatus(successStatus);
  } catch (error) {
    if (isAbortError(error)) {
      return;
    }

    mapController.setEarthquakes(EMPTY_COLLECTION);
    sidebarController.setStatus({
      type: 'error',
      title: 'Search failed',
      detail: error instanceof Error ? error.message : 'Unable to fetch earthquakes right now.',
    });
  } finally {
    if (activeRequest === request) {
      sidebarController.setLoading(false);
      activeRequest = undefined;
    }
  }
}

function setSidebarOpen(isOpen: boolean): void {
  appShell.classList.toggle('sidebar-open', isOpen);
  filterToggle.setAttribute('aria-expanded', String(isOpen));
  mapController.resize();
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
