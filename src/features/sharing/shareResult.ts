import { isNativeApp } from '@/lib/native/platform';

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Shares text via the Web Share API on touch devices (where the native share
 * sheet is the expected experience), otherwise copies to the clipboard with a
 * legacy fallback for browsers without the async Clipboard API.
 */
export async function shareResult(text: string, nav: Navigator = navigator): Promise<ShareOutcome> {
  if (isNativeApp()) {
    // The app's WebView has no Web Share API; use the phone's share sheet.
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ text });
      return 'shared';
    } catch (err) {
      if (String((err as { message?: string }).message ?? '').toLowerCase().includes('cancel')) return 'cancelled';
      // Fall through to the clipboard.
    }
  }
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  if (coarse && typeof nav.share === 'function' && (!nav.canShare || nav.canShare({ text }))) {
    try {
      await nav.share({ text });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // Fall through to clipboard.
    }
  }
  return copyText(text, nav);
}

export async function copyText(text: string, nav: Navigator = navigator): Promise<ShareOutcome> {
  try {
    if (nav.clipboard?.writeText) {
      await nav.clipboard.writeText(text);
      return 'copied';
    }
  } catch {
    // Fall through to the legacy path.
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    el.remove();
    return ok ? 'copied' : 'failed';
  } catch {
    return 'failed';
  }
}
