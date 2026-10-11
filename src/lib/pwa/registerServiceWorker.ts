/**
 * Registers the offline service worker in production builds only, so the
 * development server is never cached.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* Offline support is an enhancement; ignore failures. */
    });
  });
}
