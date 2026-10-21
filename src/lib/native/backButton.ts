import { App } from '@capacitor/app';
import { isNativeApp } from '@/lib/native/platform';

/**
 * Android's Back button: close the open dialog or sheet first, then go back a screen, and on Home
 * send the app to the background (like other Android apps) instead of closing it.
 */
export function registerBackButton(): void {
  if (!isNativeApp()) return;
  void App.addListener('backButton', ({ canGoBack }) => {
    if (document.querySelector('[role="dialog"]')) {
      // Dialogs already close on Escape (only the topmost one reacts).
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return;
    }
    if (canGoBack && window.location.hash) window.history.back();
    else void App.minimizeApp();
  });
}
