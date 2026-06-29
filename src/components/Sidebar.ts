import { findElement } from '@/utils/dom';
import type {
  EarthquakeFilters,
  EarthquakeFormValues,
  SidebarStatus,
  ValidationErrors,
} from '@/types/earthquake';
import { toDateInputValue } from '@/utils/date';
import { validateEarthquakeFilters } from '@/utils/validation';
import { MAGNITUDE_BANDS, BAND_CSS_NAMES } from '@/utils/magnitude-scale';

interface SidebarOptions {
  initialValues: EarthquakeFormValues;
  onSubmit: (filters: EarthquakeFilters) => void;
  onClose: () => void;
}

export interface SidebarController {
  element: HTMLElement;
  setLoading: (isLoading: boolean) => void;
  setStatus: (status: SidebarStatus) => void;
  resetLoading: () => void;
}

function buildLegendHTML(): string {
  const items = BAND_CSS_NAMES.map(
    (name) => `<div><dt class="legend-dot legend-dot--${name}"></dt><dd>${MAGNITUDE_BANDS[name].label}</dd></div>`,
  );
  return `<dl class="legend" aria-label="Magnitude legend">${items.join('')}</dl>`;
}

const fieldNames = ['startTime', 'endTime', 'minMagnitude'] as const;

type FieldName = (typeof fieldNames)[number];

export function createSidebar(options: SidebarOptions): SidebarController {
  const today = toDateInputValue(new Date());

  const element = document.createElement('section');
  element.className = 'sidebar-card';
  element.setAttribute('aria-label', 'Earthquake filters');
  element.innerHTML = `
    <div class="sidebar-card__header">
      <div>
        <h1>Earthquake Explorer</h1>
        <p class="sidebar-card__intro">
          Filter recent seismic activity and inspect events on the map.
        </p>
      </div>
      <button class="icon-button sidebar-close" type="button" aria-label="Close filters">×</button>
    </div>

    <div>
      <div class="section-heading">
        <span>Search window</span>
        <small>UTC dates</small>
      </div>

      <form class="filter-form" novalidate>
        <fieldset class="field field--daterange">
          <legend>Date range</legend>
          <div class="daterange">
            <input name="startTime" type="date" required max="${today}" aria-label="Start date" />
            <span class="daterange__sep" aria-hidden="true">→</span>
            <input name="endTime" type="date" required min="${options.initialValues.startTime}" max="${today}" aria-label="End date" />
          </div>
          <small data-error-for="startTime"></small>
          <small data-error-for="endTime"></small>
        </fieldset>

        <label class="field">
          <span>Minimum magnitude</span>
          <div class="range-field">
            <input name="minMagnitude" type="range" min="1" max="9.5" step="0.5" required />
            <output data-magnitude-display></output>
          </div>
          <small data-error-for="minMagnitude"></small>
        </label>

            <div class="legend-panel">
      <div class="section-heading">
        <span>Magnitude key</span>
        <small>USGS scale</small>
      </div>

      ${buildLegendHTML()}
    </div>

        <div class="form-actions">
          <button class="button button--primary" type="submit">Search <span class="button__suffix">earthquakes</span></button>
          <button class="button button--secondary" type="button" data-reset>Reset</button>
        </div>
      </form>
    </div>

    <div class="status-message status-message--idle" role="status" aria-live="polite">
      <strong>Ready</strong>
      <span>Use the default 30 day range or narrow the search.</span>
    </div>
  `;

  const form = findElement<HTMLFormElement>(element, '.filter-form');
  const submitButton = findElement<HTMLButtonElement>(form, 'button[type="submit"]');
  const resetButton = findElement<HTMLButtonElement>(form, '[data-reset]');
  const closeButton = findElement<HTMLButtonElement>(element, '.sidebar-close');
  const statusElement = findElement<HTMLDivElement>(element, '.status-message');

  setFormValues(form, options.initialValues);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const values = getFormValues(form);
    const result = validateEarthquakeFilters(values);
    renderErrors(form, result.errors);

    if (result.filters) {
      options.onSubmit(result.filters);
    }
  });

  resetButton.addEventListener('click', () => {
    setFormValues(form, options.initialValues);
    renderErrors(form, {});

    const result = validateEarthquakeFilters(options.initialValues);

    if (result.filters) {
      options.onSubmit(result.filters);
    }
  });

  closeButton.addEventListener('click', options.onClose);

  for (const fieldName of fieldNames) {
    const input = getInput(form, fieldName);

    input.addEventListener('input', () => {
      clearFieldError(form, fieldName);
    });
  }

  const startInput = getInput(form, 'startTime');
  const endInput = getInput(form, 'endTime');

  startInput.addEventListener('input', () => {
    endInput.min = startInput.value;
  });

  endInput.addEventListener('input', () => {
    startInput.max = endInput.value || today;
  });

  const magnitudeInput = getInput(form, 'minMagnitude');
  const magnitudeDisplay = findElement<HTMLOutputElement>(form, '[data-magnitude-display]');

  magnitudeDisplay.textContent = parseFloat(magnitudeInput.value).toFixed(1);
  magnitudeInput.addEventListener('input', () => {
    magnitudeDisplay.textContent = parseFloat(magnitudeInput.value).toFixed(1);
  });

  return {
    element,
    setLoading(isLoading) {
      submitButton.disabled = isLoading;
      submitButton.innerHTML = isLoading ? 'Searching…' : 'Search <span class="button__suffix">earthquakes</span>';
    },
    setStatus(status) {
      statusElement.className = `status-message status-message--${status.type}`;
      statusElement.innerHTML = '';

      const title = document.createElement('strong');
      title.textContent = status.title;
      statusElement.append(title);

      if (status.detail) {
        const detail = document.createElement('span');
        detail.textContent = status.detail;
        statusElement.append(detail);
      }
    },
    resetLoading() {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Search <span class="button__suffix">earthquakes</span>';

      if (statusElement.classList.contains('status-message--loading')) {
        statusElement.className = 'status-message status-message--idle';
        statusElement.innerHTML = '<strong>Ready</strong><span>Use the default 30 day range or narrow the search.</span>';
      }
    },
  };
}

function getFormValues(form: HTMLFormElement): EarthquakeFormValues {
  return {
    startTime: getInput(form, 'startTime').value,
    endTime: getInput(form, 'endTime').value,
    minMagnitude: getInput(form, 'minMagnitude').value,
  };
}

function setFormValues(form: HTMLFormElement, values: EarthquakeFormValues): void {
  getInput(form, 'startTime').value = values.startTime;
  getInput(form, 'endTime').value = values.endTime;
  getInput(form, 'minMagnitude').value = values.minMagnitude;

  const display = findElement<HTMLOutputElement>(form, '[data-magnitude-display]');
  display.textContent = parseFloat(values.minMagnitude).toFixed(1);
}

function renderErrors(form: HTMLFormElement, errors: ValidationErrors): void {
  for (const fieldName of fieldNames) {
    const message = errors[fieldName] ?? '';
    const input = getInput(form, fieldName);
    const errorElement = findElement<HTMLElement>(form, `[data-error-for="${fieldName}"]`);

    input.toggleAttribute('aria-invalid', Boolean(message));
    errorElement.textContent = message;
    errorElement.classList.toggle('has-error', Boolean(message));
  }
}

function clearFieldError(form: HTMLFormElement, fieldName: FieldName): void {
  const input = getInput(form, fieldName);
  const errorElement = findElement<HTMLElement>(form, `[data-error-for="${fieldName}"]`);

  input.removeAttribute('aria-invalid');
  errorElement.textContent = '';
  errorElement.classList.remove('has-error');
}

function getInput(form: HTMLFormElement, fieldName: FieldName): HTMLInputElement {
  return findElement<HTMLInputElement>(form, `[name="${fieldName}"]`);
}

