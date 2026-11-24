import { useEffect, useState } from 'react';

export type RuntimePlatform = 'telegram' | 'pwa' | 'android-webview' | 'web';

interface TelegramHapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

interface TelegramBackButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
}

interface TelegramWebApp {
  initData?: string;
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    start_param?: string;
  };
  platform?: string;
  colorScheme?: 'light' | 'dark';
  ready?: () => void;
  expand?: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  openTelegramLink?: (url: string) => void;
  HapticFeedback?: TelegramHapticFeedback;
  BackButton?: TelegramBackButton;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
    AndroidBridge?: unknown;
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  const tg = window.Telegram?.WebApp;
  if (!tg) return null;
  // Detect genuine Telegram Mini App launch (initData present or non-unknown platform)
  if (tg.initData || (tg.platform && tg.platform !== 'unknown')) {
    return tg;
  }
  return null;
}

export function detectRuntimePlatform(): RuntimePlatform {
  if (typeof window === 'undefined') return 'web';
  if (getTelegramWebApp()) return 'telegram';
  if (
    window.Capacitor?.isNativePlatform?.() ||
    Boolean(window.AndroidBridge) ||
    document.referrer.includes('android-app://')
  ) {
    return 'android-webview';
  }
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  if (isStandalone) return 'pwa';
  return 'web';
}

export function initTelegramMiniApp(): { userName?: string } {
  const tg = getTelegramWebApp();
  if (!tg) return {};
  try {
    tg.ready?.();
    tg.expand?.();
    tg.disableVerticalSwipes?.();
  } catch {
    // Ignore unsupported methods on older Telegram clients
  }
  const user = tg.initDataUnsafe?.user;
  const userName = user?.first_name?.trim() || user?.username?.trim();
  return { userName };
}

/**
 * Triggers native haptic feedback across Telegram Mini App, Android/Web Vibration API.
 */
export function triggerPlatformHaptic(
  kind: 'light' | 'medium' | 'heavy' | 'success' | 'error',
  enabled: boolean,
  intensityPct: number
): void {
  if (!enabled || typeof window === 'undefined') return;

  const tg = getTelegramWebApp();
  if (tg?.HapticFeedback) {
    try {
      if (kind === 'success' || kind === 'error') {
        tg.HapticFeedback.notificationOccurred(kind);
      } else {
        tg.HapticFeedback.impactOccurred(kind);
      }
      return;
    } catch {
      // Fallback to browser vibration API
    }
  }

  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }

  const clamped = Math.max(10, Math.min(100, intensityPct));
  const scale = 0.35 + (clamped / 100) * 1.15;
  const basePattern: number | number[] =
    kind === 'light'
      ? 12
      : kind === 'medium'
      ? 18
      : kind === 'heavy'
      ? 28
      : kind === 'success'
      ? [24, 35, 36]
      : [30, 35, 30];

  const scaled = Array.isArray(basePattern)
    ? basePattern.map((ms, idx) => (idx % 2 === 0 ? Math.max(5, Math.round(ms * scale)) : ms))
    : Math.max(5, Math.round(basePattern * scale));

  try {
    navigator.vibrate(scaled);
  } catch {
    // Ignore restricted browsers
  }
}

export function shareGameOrLifeRequest(text: string, url: string): Promise<boolean> {
  const tg = getTelegramWebApp();
  if (tg?.openTelegramLink) {
    try {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      tg.openTelegramLink(shareUrl);
      return Promise.resolve(true);
    } catch {
      // Fall through
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    return navigator
      .share({ title: 'RSS Liquid Flow', text, url })
      .then(() => true)
      .catch(() => false);
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard
      .writeText(`${text} ${url}`)
      .then(() => true)
      .catch(() => false);
  }

  return Promise.resolve(false);
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}
