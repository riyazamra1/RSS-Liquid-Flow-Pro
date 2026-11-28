// Seamless Auto-Update Utility for RSS Liquid Flow
// Supports over-the-air (OTA) updates without requiring full app reinstallation.

export const CURRENT_APP_VERSION = '2.5.4';
export const APP_BUILD_DATE = '2026-11-27';
const VERSION_STORAGE_KEY = 'rss-liquid-flow-app-version';
const PENDING_UPDATE_KEY = 'rss-liquid-flow-pending-update';
const LAST_CHECK_KEY = 'rss-liquid-flow-last-update-check';

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes?: string;
  releaseDate?: string;
  requiresReinstall: boolean; // Always false for in-place OTA updates!
}

export function getCurrentAppVersion(): string {
  return CURRENT_APP_VERSION;
}

export function getStoredAppVersion(): string {
  if (typeof window === 'undefined') return CURRENT_APP_VERSION;
  return localStorage.getItem(VERSION_STORAGE_KEY) || CURRENT_APP_VERSION;
}

export function getLastUpdateCheckTime(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_CHECK_KEY);
}

/**
 * Checks if a newer version of the game is available.
 * Resolves seamlessly without needing an APK reinstall.
 */
export async function checkForAppUpdates(): Promise<UpdateCheckResult> {
  if (typeof window === 'undefined') {
    return {
      hasUpdate: false,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
      requiresReinstall: false,
    };
  }

  localStorage.setItem(LAST_CHECK_KEY, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // Check if a simulated or remote update is pending in local test storage
  const pending = localStorage.getItem(PENDING_UPDATE_KEY);
  if (pending && pending !== CURRENT_APP_VERSION) {
    return {
      hasUpdate: true,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: pending,
      releaseNotes: 'Performance optimizations, smooth level progression & new biome polish.',
      releaseDate: 'Today',
      requiresReinstall: false,
    };
  }

  // Ensure current version is stored
  const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
  if (!storedVersion) {
    localStorage.setItem(VERSION_STORAGE_KEY, CURRENT_APP_VERSION);
  }

  // Optional: check ServiceWorker registration for waiting workers
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.waiting) {
        return {
          hasUpdate: true,
          currentVersion: CURRENT_APP_VERSION,
          latestVersion: '2.5.5',
          releaseNotes: 'PWA service worker update ready with updated game assets.',
          requiresReinstall: false,
        };
      }
    } catch {
      // Ignore service worker check errors
    }
  }

  return {
    hasUpdate: false,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: CURRENT_APP_VERSION,
    requiresReinstall: false,
  };
}

/**
 * Applies the update immediately in-place without reinstallation.
 * Preserves all player progress, coins, stars, and speedrun records.
 */
export async function applyAppUpdate(targetVersion?: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const versionToApply = targetVersion || localStorage.getItem(PENDING_UPDATE_KEY) || CURRENT_APP_VERSION;
  localStorage.setItem(VERSION_STORAGE_KEY, versionToApply);
  localStorage.removeItem(PENDING_UPDATE_KEY);

  // If a ServiceWorker is waiting, activate it
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch {
      // Ignore SW message errors
    }
  }

  // Reload the application cleanly to apply newest assets
  window.location.reload();
}

/**
 * Simulates finding a newer build version for live testing of the Auto-Update toggle.
 */
export function simulateNewVersion(version = '2.5.5-hotfix'): string {
  if (typeof window === 'undefined') return version;
  localStorage.setItem(PENDING_UPDATE_KEY, version);
  return version;
}

/**
 * Clears any pending simulated update.
 */
export function clearPendingSimulatedUpdate(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PENDING_UPDATE_KEY);
}
