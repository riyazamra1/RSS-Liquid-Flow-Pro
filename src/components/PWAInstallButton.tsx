import React, { useState } from 'react';
import { Download, Smartphone, WifiOff } from 'lucide-react';
import { detectRuntimePlatform, useOnlineStatus, usePWAInstall } from '../utils/platform';

export const PWAInstallButton: React.FC<{ fullWidth?: boolean }> = ({ fullWidth = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const platform = detectRuntimePlatform();

  if (isInstalled || platform === 'telegram' || platform === 'android-webview') {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`${
          fullWidth ? 'w-full' : ''
        } min-h-[42px] px-4 py-2 rounded-2xl btn-tactile-emerald text-white font-display text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap`}
      >
        <Download className="w-4 h-4" />
        <span>Install Android / Web App</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className={`${
          fullWidth ? 'w-full' : ''
        } min-h-[42px] px-4 py-2 rounded-2xl theme-surface-muted border font-display text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap`}
      >
        <Smartphone className="w-4 h-4 text-[#E55A3C] dark:text-[#2BD4C5]" />
        <span>{isIOS ? 'Install on iPhone / iPad' : 'Install as Android App'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl theme-surface border p-5 shadow-2xl">
            <h3 className="font-display text-lg font-bold theme-ink">
              {isIOS ? 'Install on iPhone / iPad' : 'Install RSS Liquid Flow App'}
            </h3>
            <p className="mt-2 text-sm theme-ink-secondary leading-relaxed">
              {isIOS ? (
                <>
                  1. Tap the <strong>Share</strong> icon in Safari.<br />
                  2. Tap <strong>Add to Home Screen</strong> to play full-screen like a native app.
                </>
              ) : (
                <>
                  1. Open this game in Chrome on Android.<br />
                  2. Tap the browser menu (<strong>⋮</strong>) and choose{' '}
                  <strong>Install app</strong> / <strong>Add to Home screen</strong>.<br />
                  3. Works offline and launches full-screen as an Android app!
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full min-h-[44px] rounded-2xl btn-tactile-coral text-white font-display text-sm font-bold cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-16 lg:bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-2xl bg-[#B86A0B] text-white px-3.5 py-2 text-xs font-semibold shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline Mode — Playing with cached game data</span>
    </div>
  );
};
