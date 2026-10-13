import type { FirebaseOptions } from 'firebase/app';

/**
 * Firebase web config comes from build-time env vars (these values are public
 * identifiers, not secrets — access is controlled by firestore.rules).
 * Returns null when Friends isn't configured, so the solo game still works.
 */
export function firebaseConfig(): {
  options: FirebaseOptions;
  emulator: boolean;
  /** reCAPTCHA Enterprise site key for App Check (public). Not used with the emulator. */
  appCheckSiteKey: string | null;
} | null {
  const env = import.meta.env;
  if (env.VITE_FIREBASE_EMULATOR === 'true') {
    // Always the demo project in emulator mode (ignores any real config present in .env files).
    const projectId = 'demo-wordskiis';
    return {
      // authDomain is required for the (emulated) Google sign-in pop-up.
      options: { apiKey: 'demo-key', projectId, appId: 'demo', authDomain: `${projectId}.firebaseapp.com` },
      emulator: true,
      appCheckSiteKey: null,
    };
  }
  const apiKey = env.VITE_FIREBASE_API_KEY as string | undefined;
  const projectId = env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  const appId = env.VITE_FIREBASE_APP_ID as string | undefined;
  if (!apiKey || !projectId || !appId) return null;
  return {
    options: {
      apiKey,
      projectId,
      appId,
      authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || `${projectId}.firebaseapp.com`,
    },
    emulator: false,
    appCheckSiteKey: (env.VITE_APPCHECK_SITE_KEY as string | undefined) || null,
  };
}

export const friendsConfigured = () => firebaseConfig() !== null;
