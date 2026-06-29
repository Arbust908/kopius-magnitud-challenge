# Earthquake Explorer

Earthquake Explorer is a small TypeScript app for the Condor Team candidate challenge. It uses the USGS earthquake GeoJSON API and MapLibre GL JS to show recent earthquakes on an interactive map.

The implementation intentionally stays lightweight: Vite, TypeScript, vanilla DOM modules, MapLibre, and CSS. No UI framework, no routing, no API keys.

## Features

- Date range and minimum-magnitude filters for the USGS event API.
- Inline validation before a network request is made.
- Loading, empty, success, and error states.
- MapLibre GeoJSON source + circle layer for earthquake rendering.
- Circle radius and color scale by magnitude.
- Click popups with location, magnitude, time, and depth.
- Magnitude legend with color-coded bands.
- Responsive layout with a persistent desktop sidebar and mobile filter drawer.
- Mobile sidebar auto-closes after a successful search.
- Stale-request cancellation via AbortController.
- Light and dark mode, following the system preference.
- Keyless public basemap from OpenFreeMap.

## Getting started

```bash
npm install
npm run dev
```

Then open the local Vite URL printed in your terminal.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Architecture notes

### API layer

`src/api/earthquakes.ts` is responsible only for building the USGS URL and fetching GeoJSON:

```text
filters -> URLSearchParams -> fetch -> typed FeatureCollection
```

It does not know about the DOM, validation, or MapLibre. That keeps network code easy to test or replace.

### Validation

`src/utils/validation.ts` validates:

- start date is present
- end date is present
- start date is not in the future
- end date is not in the future
- end date is on or after start date
- minimum magnitude is present
- minimum magnitude is numeric
- minimum magnitude is non-negative

Invalid form input shows inline errors and does not call the USGS API.

### Map rendering

The app renders earthquakes with a single MapLibre GeoJSON source and a circle layer instead of one HTML marker per event. This is better for large result sets because MapLibre can batch the points through the WebGL renderer.

The circle layer uses data-driven styling:

- `circle-radius` interpolates from `properties.mag`
- `circle-color` steps through magnitude bands
- stroke and opacity keep points legible over the basemap

On every successful search, the existing source receives new GeoJSON via `setData()` rather than rebuilding the map.

### Responsive behavior

Desktop uses a two-column grid:

```text
sidebar | map
```

At smaller widths, the sidebar becomes a slide-over drawer and the map remains full-screen. Toggling the drawer triggers a map resize so MapLibre recalculates its canvas.

## USGS API

The app calls:

```text
https://earthquake.usgs.gov/fdsnws/event/1/query
```

with these query params:

- `format=geojson`
- `starttime=YYYY-MM-DD`
- `endtime=YYYY-MM-DD`
- `minmagnitude=<number>`
- `orderby=time`

## Manual smoke test

1. Start the app with `npm run dev`.
2. Confirm the basemap loads.
3. Submit the default filters and confirm earthquake circles appear.
4. Click a circle and confirm the popup shows place, magnitude, time, and depth.
5. Set the end date before the start date and confirm an inline validation error appears.
6. Set minimum magnitude to the maximum value (9.5) and confirm the empty state appears (or very few earthquakes are found).
7. Resize to mobile width, confirm the filter drawer opens/closes, and confirm the drawer closes automatically after a search completes.

## Bonus items

Not implemented in the first pass:

- **Web Worker**: useful if the app adds expensive client-side filtering or sorting for very large result sets.
- **IndexedDB**: useful for structured caching by filter key, with an expiration policy.
- **Service Worker**: useful for offline app shell caching, but it does not replace IndexedDB for queryable earthquake data.

These are intentionally deferred to keep the core challenge implementation simple and complete.
