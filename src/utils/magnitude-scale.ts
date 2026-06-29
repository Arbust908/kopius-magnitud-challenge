import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec';

interface MagnitudeBand {
  min: number;
  max: number;
  color: string;
  radius: number;
  label: string;
}

/** Single source of truth for magnitude→visual mapping. */
export const MAGNITUDE_BANDS: readonly MagnitudeBand[] = [
  { min: 0, max: 4, color: '#9ca3af', radius: 4, label: 'Below 4' },
  { min: 4, max: 5, color: '#f6c453', radius: 7, label: '4 to 5' },
  { min: 5, max: 6, color: '#f97316', radius: 13, label: '5 to 6' },
  { min: 6, max: Infinity, color: '#dc2626', radius: 24, label: '6+' },
];

/** Look up color for a magnitude value. */
export function magnitudeToColor(magnitude: number | null): string {
  if (magnitude === null) return MAGNITUDE_BANDS[0]!.color;
  for (const band of MAGNITUDE_BANDS) {
    if (magnitude < band.max) return band.color;
  }
  return MAGNITUDE_BANDS[MAGNITUDE_BANDS.length - 1]!.color;
}

/** Build a MapLibre circle-color step expression from the bands. */
export function buildCircleColorExpression(): ExpressionSpecification {
  const first = MAGNITUDE_BANDS[0]!;
  const rest = MAGNITUDE_BANDS.slice(1);
  const expr: unknown[] = ['step', ['coalesce', ['get', 'mag'], 0], first.color];
  for (const band of rest) {
    expr.push(band.min, band.color);
  }
  return expr as ExpressionSpecification;
}

/** Build a MapLibre circle-radius interpolate expression from the bands. */
export function buildCircleRadiusExpression(): ExpressionSpecification {
  const expr: unknown[] = ['interpolate', ['linear'], ['coalesce', ['get', 'mag'], 0]];
  for (const band of MAGNITUDE_BANDS) {
    expr.push(band.min, band.radius);
  }
  return expr as ExpressionSpecification;
}

const SLIDER_MIN = 1;
const SLIDER_MAX = 9.5;

/** Compute a CSS linear-gradient for the magnitude range slider. */
export function buildSliderGradient(): string {
  const range = SLIDER_MAX - SLIDER_MIN;
  const stops: string[] = [];

  for (let i = 0; i < MAGNITUDE_BANDS.length; i++) {
    const band = MAGNITUDE_BANDS[i]!;
    const startPct = i === 0 ? 0 : ((band.min - SLIDER_MIN) / range) * 100;
    const next = MAGNITUDE_BANDS[i + 1];
    const endPct = next ? ((next.min - SLIDER_MIN) / range) * 100 : 100;
    stops.push(`${band.color} ${startPct.toFixed(1)}%`);
    stops.push(`${band.color} ${endPct.toFixed(1)}%`);
  }

  return `linear-gradient(to right, ${stops.join(', ')})`;
}

/**
 * Inject CSS custom properties derived from MAGNITUDE_BANDS into the document.
 * Call once at startup so CSS that references var(--minor) etc. stays in sync.
 */
export function injectMagnitudeStyles(): void {
  const names = ['minor', 'moderate', 'strong', 'major'] as const;
  const vars = MAGNITUDE_BANDS.slice(0, names.length).map(
    (band, i) => `--${names[i]}: ${band.color}`,
  ).join('; ');

  const style = document.createElement('style');
  style.textContent = `:root { ${vars}; }`;
  document.head.appendChild(style);
}
