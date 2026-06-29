import type {
  EarthquakeFilters,
  EarthquakeFormValues,
  ValidationErrors,
} from '../types/earthquake';

export interface ValidationResult {
  errors: ValidationErrors;
  filters?: EarthquakeFilters;
}

export function validateEarthquakeFilters(values: EarthquakeFormValues): ValidationResult {
  const errors: ValidationErrors = {};
  const startTime = values.startTime.trim();
  const endTime = values.endTime.trim();
  const minMagnitudeText = values.minMagnitude.trim();
  const minMagnitude = Number(minMagnitudeText);

  if (!startTime) {
    errors.startTime = 'Choose a start date.';
  }

  if (!endTime) {
    errors.endTime = 'Choose an end date.';
  }

  if (startTime && endTime && startTime > endTime) {
    errors.endTime = 'End date must be on or after the start date.';
  }

  const today = new Date().toISOString().slice(0, 10);

  if (endTime && endTime > today) {
    errors.endTime = 'End date cannot be in the future.';
  }

  if (startTime && startTime > today) {
    errors.startTime = 'Start date cannot be in the future.';
  }

  if (!minMagnitudeText) {
    errors.minMagnitude = 'Enter a minimum magnitude.';
  } else if (!Number.isFinite(minMagnitude)) {
    errors.minMagnitude = 'Magnitude must be a number.';
  } else if (minMagnitude < 0) {
    errors.minMagnitude = 'Magnitude cannot be negative.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    errors,
    filters: {
      startTime,
      endTime,
      minMagnitude,
    },
  };
}
