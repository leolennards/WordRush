/**
 * Registers the offline service worker in production builds only, so the
 * development server is never cached.
 */
import { isNativeApp } from '@/lib/native/platform';

export function registerServiceWorker(): void {
  // The native app already bundles its files, so it doesn't need offline caching.
  if (!import.meta.env.PROD || isNativeApp() || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* Offline support is an enhancement; ignore failures. */
    });
  });
}
