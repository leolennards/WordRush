import { useEffect, useState } from 'react';
import { isNativeApp } from '@/lib/native/platform';

/** How often an open page checks for a newer release. */
const CHECK_EVERY_MS = 5 * 60_000;

/**
 * True once a newer version of the website has been released than the one
 * running in this tab (compares the build id baked into this bundle with
 * /version.json). The app bundles its files, so it never checks.
 */
export function useUpdateAvailable(): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD || isNativeApp() || typeof fetch !== 'function') return;
    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { build } = (await res.json()) as { build?: string };
        if (!stopped && build && build !== __BUILD_ID__) setAvailable(true);
      } catch {
        /* offline: try again later */
      }
    };
    const onVisible = () => document.visibilityState === 'visible' && void check();
    const id = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    void check();
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  return available;
}
