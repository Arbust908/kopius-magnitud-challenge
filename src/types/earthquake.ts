export interface EarthquakeProperties {
  mag: number | null;
  place: string | null;
  time: number | null;
  _depth?: number | null;
  url?: string | null;
  detail?: string | null;
  felt?: number | null;
  cdi?: number | null;
  mmi?: number | null;
  alert?: string | null;
  status?: string | null;
  tsunami?: number | null;
  sig?: number | null;
  net?: string | null;
  code?: string | null;
  ids?: string | null;
  sources?: string | null;
  types?: string | null;
  nst?: number | null;
  dmin?: number | null;
  rms?: number | null;
  gap?: number | null;
  magType?: string | null;
  type?: string | null;
  title?: string | null;
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
