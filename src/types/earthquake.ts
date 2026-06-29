/**
 * Properties the app actually reads from USGS earthquake features.
 * The USGS response includes many more fields (felt, cdi, mmi, alert, etc.)
 * but we only declare the ones we use.
 */
export interface EarthquakeProperties {
  mag: number | null;
  place: string | null;
  time: number | null;
  _depth?: number | null;
  [key: string]: unknown;
}

export interface EarthquakeGeometry {
  type: 'Point';
  coordinates: [longitude: number, latitude: number, depth: number];
}

export interface EarthquakeFeature {
  type: 'Feature';
  id: string;
  properties: EarthquakeProperties;
  geometry: EarthquakeGeometry;
}

export interface EarthquakeCollection {
  type: 'FeatureCollection';
  metadata?: {
    generated?: number;
    url?: string;
    title?: string;
    status?: number;
    api?: string;
    count?: number;
  };
  bbox?: [number, number, number, number, number, number];
  features: EarthquakeFeature[];
}

export interface EarthquakeFormValues {
  startTime: string;
  endTime: string;
  minMagnitude: string;
}

export interface EarthquakeFilters {
  startTime: string;
  endTime: string;
  minMagnitude: number;
}

export type ValidationErrors = Partial<Record<keyof EarthquakeFormValues, string>>;

export const EMPTY_COLLECTION: EarthquakeCollection = {
  type: 'FeatureCollection',
  features: [],
};

export type SidebarStatusType = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface SidebarStatus {
  type: SidebarStatusType;
  title: string;
  detail?: string;
}
