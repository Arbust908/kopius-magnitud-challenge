import {
  GeoJSONSource,
  LngLatBounds,
  Map,
  NavigationControl,
  Popup,
  type GeoJSONSourceSpecification,
  type LayerSpecification,
  type LngLatLike,
  type MapLayerMouseEvent,
} from 'maplibre-gl';
import type { EarthquakeCollection } from '../types/earthquake';
import { formatDepth, formatEventTime } from '../utils/date';

const SOURCE_ID = 'earthquakes';
const LAYER_ID = 'earthquake-circles';
const EMPTY_COLLECTION: EarthquakeCollection = {
  type: 'FeatureCollection',
  features: [],
};

const INITIAL_CENTER: LngLatLike = [-122.33, 37.96];
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';

export interface EarthquakeMapController {
  element: HTMLElement;
  setEarthquakes: (earthquakes: EarthquakeCollection) => void;
  resize: () => void;
}

export function createEarthquakeMap(): EarthquakeMapController {
  const element = document.createElement('div');
  element.className = 'map-shell';
  element.innerHTML = `
    <div class="map-container"></div>
  `;

  const container = findElement<HTMLDivElement>(element, '.map-container');
  const pendingData = { current: EMPTY_COLLECTION };

  const map = new Map({
    container,
    style: MAP_STYLE,
    center: INITIAL_CENTER,
    zoom: 3,
  });

  map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');

  map.on('load', () => {
    addEarthquakeLayer(map);
    wirePopup(map);
    updateSourceData(map, pendingData.current);
    fitToEarthquakes(map, pendingData.current);
  });

  const resizeObserver = new ResizeObserver(() => {
    map.resize();
  });
  resizeObserver.observe(container);

  return {
    element,
    setEarthquakes(earthquakes) {
      pendingData.current = earthquakes;

      if (!map.loaded()) {
        return;
      }

      updateSourceData(map, earthquakes);
      fitToEarthquakes(map, earthquakes);
    },
    resize() {
      queueMicrotask(() => map.resize());
    },
  };
}

function addEarthquakeLayer(map: Map): void {
  if (!map.getSource(SOURCE_ID)) {
    const source: GeoJSONSourceSpecification = {
      type: 'geojson',
      data: EMPTY_COLLECTION,
    };

    map.addSource(SOURCE_ID, source);
  }

  if (!map.getLayer(LAYER_ID)) {
    const layer: LayerSpecification = {
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'mag'], 0],
          0,
          4,
          3,
          7,
          5,
          13,
          7,
          24,
        ],
        'circle-color': [
          'step',
          ['coalesce', ['get', 'mag'], 0],
          '#9ca3af',
          4,
          '#f6c453',
          5,
          '#f97316',
          6,
          '#dc2626',
          7,
          '#7f1d1d',
        ],
        'circle-opacity': 0.82,
        'circle-stroke-color': 'rgba(248, 244, 236, 0.95)',
        'circle-stroke-width': 1.25,
      },
    };

    map.addLayer(layer);
  }
}

function updateSourceData(map: Map, earthquakes: EarthquakeCollection): void {
  // Copy depth from geometry.coordinates[2] into properties so it survives
  // MapLibre's 2D coordinate normalization (which strips the third dimension).
  for (const feature of earthquakes.features) {
    feature.properties = { ...feature.properties, _depth: feature.geometry.coordinates[2] };
  }

  const source = map.getSource(SOURCE_ID);

  if (source instanceof GeoJSONSource) {
    source.setData(earthquakes);
  }
}

function wirePopup(map: Map): void {
  map.on('click', LAYER_ID, (event: MapLayerMouseEvent) => {
    const features = map.queryRenderedFeatures(event.point, { layers: [LAYER_ID] });
    const feature = features[0];

    if (!feature) {
      return;
    }

    const coords = (feature.geometry as { coordinates: number[] }).coordinates;
    const longitude = coords[0] ?? 0;
    const latitude = coords[1] ?? 0;
    const props = feature.properties as Record<string, unknown>;
    const depth = typeof props._depth === 'number' ? props._depth : (coords[2] ?? 0);
    const mag = typeof props.mag === 'number' ? props.mag : null;
    const magnitude = formatMagnitude(mag);
    const magnitudeColor = getMagnitudeColor(mag);
    const place = typeof props.place === 'string' ? props.place : 'Unknown location';
    const time = typeof props.time === 'number' ? props.time : null;

    new Popup({ maxWidth: '320px', offset: 14 })
      .setLngLat([longitude, latitude])
      .setHTML(
        `<article class="earthquake-popup">
          <div class="earthquake-popup__magnitude" style="background-color: ${magnitudeColor}" aria-label="Magnitude ${magnitude}">${magnitude}</div>
          <div class="earthquake-popup__content">
            <p class="earthquake-popup__label">Event detail</p>
            <strong>${escapeHtml(place)}</strong>
            <dl>
              <div><dt>Time</dt><dd>${escapeHtml(formatEventTime(time))}</dd></div>
              <div><dt>Depth</dt><dd>${escapeHtml(formatDepth(depth))}</dd></div>
            </dl>
          </div>
        </article>`,
      )
      .addTo(map);
  });

  map.on('mouseenter', LAYER_ID, () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', LAYER_ID, () => {
    map.getCanvas().style.cursor = '';
  });
}

function fitToEarthquakes(map: Map, earthquakes: EarthquakeCollection): void {
  const firstFeature = earthquakes.features[0];

  if (!firstFeature) {
    return;
  }

  const [firstLongitude, firstLatitude] = firstFeature.geometry.coordinates;
  const bounds = new LngLatBounds([firstLongitude, firstLatitude], [firstLongitude, firstLatitude]);

  for (const feature of earthquakes.features.slice(1)) {
    const [longitude, latitude] = feature.geometry.coordinates;
    bounds.extend([longitude, latitude]);
  }

  map.fitBounds(bounds, {
    padding: 72,
    maxZoom: 6,
    duration: 800,
  });
}

function formatMagnitude(magnitude: number | null): string {
  return magnitude === null ? 'Unavailable' : magnitude.toFixed(1);
}

function getMagnitudeColor(magnitude: number | null): string {
  if (magnitude === null) return '#9ca3af';
  if (magnitude < 4) return '#9ca3af';
  if (magnitude < 5) return '#f6c453';
  if (magnitude < 6) return '#f97316';
  return '#dc2626';
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function findElement<TElement extends Element>(root: Element, selector: string): TElement {
  const element = root.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}
