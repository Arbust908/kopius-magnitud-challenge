/**
 * Minimal SW update/offline UI.
 * Creates DOM elements that appear/dismiss without framework overhead.
 */

function createBanner(text: string, actionLabel?: string, onAction?: () => void): HTMLDivElement {
  const banner = document.createElement('div');
  banner.className = 'sw-banner';
  banner.textContent = text;

  if (actionLabel && onAction) {
    const btn = document.createElement('button');
    btn.className = 'sw-banner__action';
    btn.textContent = actionLabel;
    btn.addEventListener('click', onAction);
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
  updateBanner = createBanner('Update available', 'Reload', () => {
    updateBanner = null;
    updateSW();
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

  window.addEventListener('offline', () => {
    offlineBanner = createBanner('Offline — showing cached data');
  });

  window.addEventListener('online', () => {
    offlineBanner?.remove();
    offlineBanner = null;
  });
}
