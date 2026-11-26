import { Capacitor, registerPlugin } from '@capacitor/core';

interface AvailableUpdate {
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

/**
 * Checks only native Android installs. Browser and Telegram builds are unchanged.
 * Android always presents its own final package-install confirmation.
 */
export async function checkAndApplyNativeUpdate(autoUpdate: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

  const update = await NativeUpdater.checkForUpdate();
  if (!update.available || !update.apkUrl || !update.sha256) return;

  if (!autoUpdate) {
    const accepted = window.confirm(
      `RSS Liquid Flow Pro update ${update.versionName ?? ''} is available. Download and install it now?`
    );
    if (!accepted) return;
  }

  await NativeUpdater.downloadAndInstall({
    apkUrl: update.apkUrl,
    sha256: update.sha256,
  });
}
