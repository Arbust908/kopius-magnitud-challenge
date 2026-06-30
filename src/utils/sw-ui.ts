/**
 * Minimal SW update/offline UI.
 * Creates DOM elements that appear/dismiss without framework overhead.
 */

function createBanner(text: string, action?: { label: string; onClick: () => void }): HTMLDivElement {
  const banner = document.createElement('div');
  banner.className = 'sw-banner';
  banner.textContent = text;

  if (action) {
    const btn = document.createElement('button');
    btn.className = 'sw-banner__action';
    btn.textContent = action.label;
    btn.addEventListener('click', action.onClick);
    banner.append(btn);
  }

  const dismiss = document.createElement('button');
  dismiss.className = 'sw-banner__dismiss';
  dismiss.textContent = '×';
  dismiss.setAttribute('aria-label', 'Dismiss');
  dismiss.addEventListener('click', () => banner.remove());
  banner.append(dismiss);

  document.body.append(banner);
  return banner;
}

let updateBanner: HTMLDivElement | null = null;

export function showUpdateBanner(updateSW: () => void): void {
  if (updateBanner) return;
  updateBanner = createBanner('Update available', {
    label: 'Reload',
    onClick: () => {
      updateBanner = null;
      updateSW();
    },
  });
}

export function showOfflineReady(): void {
  const banner = createBanner('Ready to work offline');
  setTimeout(() => banner.remove(), 4000);
}

export function showOfflineIndicator(): void {
  let offlineBanner: HTMLDivElement | null = null;

  if (!navigator.onLine) {
    offlineBanner = createBanner('Offline — showing cached data');
  }

  // Listeners live for the app lifetime; no teardown needed.
  window.addEventListener('offline', () => {
    offlineBanner?.remove();
    offlineBanner = createBanner('Offline — showing cached data');
  });

  window.addEventListener('online', () => {
    offlineBanner?.remove();
    offlineBanner = null;
  });
}
