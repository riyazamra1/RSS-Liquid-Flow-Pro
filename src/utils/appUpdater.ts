import { Capacitor, registerPlugin } from '@capacitor/core';

export interface AvailableUpdate {
  available: boolean;
  versionCode?: number;
  versionName?: string;
  apkUrl?: string;
  sha256?: string;
}

interface RssAppUpdaterPlugin {
  checkForUpdate(): Promise<AvailableUpdate>;
  downloadAndInstall(options: { apkUrl: string; sha256: string }): Promise<{ started: boolean }>;
}

const NativeUpdater = registerPlugin<RssAppUpdaterPlugin>('RssAppUpdater');

/** Check for an update without downloading or leaving the game. */
export async function checkNativeUpdate(): Promise<AvailableUpdate | null> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return null;
  return NativeUpdater.checkForUpdate();
}

/** Download only after the player explicitly chooses Update now. */
export async function downloadNativeUpdate(update: AvailableUpdate): Promise<void> {
  if (!update.apkUrl || !update.sha256) {
    throw new Error('The update package metadata is incomplete.');
  }
  await NativeUpdater.downloadAndInstall({
    apkUrl: update.apkUrl,
    sha256: update.sha256,
  });
}
