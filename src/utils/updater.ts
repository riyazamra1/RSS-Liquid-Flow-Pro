// Auto-update checker utility for RSS Liquid Flow
const CURRENT_APP_VERSION = '2.5.0-build-20261126';
const VERSION_STORAGE_KEY = 'rss-liquid-flow-app-version';

export interface UpdateCheckResult {
  hasUpdate: boolean;
  latestVersion: string;
}

export function checkForAppUpdates(): UpdateCheckResult {
  if (typeof window === 'undefined') {
    return { hasUpdate: false, latestVersion: CURRENT_APP_VERSION };
  }

  const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
  if (!storedVersion) {
    localStorage.setItem(VERSION_STORAGE_KEY, CURRENT_APP_VERSION);
    return { hasUpdate: false, latestVersion: CURRENT_APP_VERSION };
  }

  // If a newer version string is detected or simulated
  const hasUpdate = storedVersion !== CURRENT_APP_VERSION;
  return {
    hasUpdate,
    latestVersion: CURRENT_APP_VERSION,
  };
}

export function applyAppUpdate(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VERSION_STORAGE_KEY, CURRENT_APP_VERSION);
  window.location.reload();
}
