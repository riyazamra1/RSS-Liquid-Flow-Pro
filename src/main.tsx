import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Remove any older service worker registered for this game path. A stale
// navigation cache can otherwise keep serving an outdated page in Chrome
// or Telegram's embedded browser after the app has been updated.
const GAME_SERVICE_WORKER_PATH = '/games/liquid-flow-pro/';
if (
  'serviceWorker' in navigator &&
  window.location.pathname.startsWith(GAME_SERVICE_WORKER_PATH)
) {
  void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    const gameRegistrations = registrations.filter((registration) => {
      const scope = new URL(registration.scope);
      return (
        scope.origin === window.location.origin &&
        scope.pathname.startsWith(GAME_SERVICE_WORKER_PATH)
      );
    });

    if (gameRegistrations.length === 0) return;

    const controllerScript = navigator.serviceWorker.controller?.scriptURL;
    const currentPageControlledByGameWorker = gameRegistrations.some(
      (registration) => registration.active?.scriptURL === controllerScript,
    );

    await Promise.all(gameRegistrations.map((registration) => registration.unregister()));

    if (currentPageControlledByGameWorker) {
      const reloadKey = 'rss-liquid-flow-pro-sw-cleanup-reload';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
      }
    }
  }).catch((error) => {
    console.warn('RSS Liquid Flow service-worker cleanup failed:', error);
  });
}

createRoot(document.getElementById('root')!).render(<App />);
