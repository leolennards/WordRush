/**
 * Native Google sign-in for the Android/iOS app. Google blocks its normal
 * web pop-up inside apps, so the app uses the phone's own account picker and
 * hands the resulting ID token to Firebase. Loaded only inside the app.
 */
import { SocialLogin } from '@capgo/capacitor-social-login';

let initialised = false;

async function init() {
  if (initialised) return;
  const webClientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined;
  if (!webClientId) throw new Error('Google sign-in isn’t configured for this app build.');
  const iOSClientId = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined;
  await SocialLogin.initialize({
    google: { webClientId, iOSClientId, iOSServerClientId: webClientId, mode: 'online' },
  });
  initialised = true;
}

/** Shows the native Google account picker. Returns an ID token, or null if cancelled. */
export async function nativeGoogleIdToken(): Promise<string | null> {
  await init();
  try {
    // No custom scopes: email, profile and openid are the plugin's defaults, and passing scopes
    // on Android requires a modified MainActivity ("You CANNOT use scopes…").
    const res = await SocialLogin.login({ provider: 'google', options: {} });
    const token = (res.result as { idToken?: string | null }).idToken;
    return token ?? null;
  } catch (err) {
    const msg = String((err as { message?: string }).message ?? err).toLowerCase();
    if (msg.includes('cancel')) return null;
    throw err;
  }
}

export async function nativeGoogleSignOut() {
  try {
    await init();
    await SocialLogin.logout({ provider: 'google' });
  } catch {
    /* Not signed in natively: nothing to do. */
  }
}
