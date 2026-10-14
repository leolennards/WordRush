/**
 * System notifications for friend activity (nudges, "your turn"). Shown only
 * when Wordskiis isn't in front — otherwise the in-app toast is enough. Uses
 * the Notification API on the web and local notifications in the app.
 *
 * These fire while Wordskiis is open or in the background. Notifications when
 * the app is fully closed would need push messaging from a server.
 */
import { isNativeApp } from '@/lib/native/platform';

export type NotifyPermission = 'granted' | 'denied' | 'default' | 'unsupported';

let nextId = 1;

export async function notifyPermission(): Promise<NotifyPermission> {
  if (isNativeApp()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const { display } = await LocalNotifications.checkPermissions();
    return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'default';
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestNotifyPermission(): Promise<NotifyPermission> {
  try {
    if (isNativeApp()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const { display } = await LocalNotifications.requestPermissions();
      return display === 'granted' ? 'granted' : 'denied';
    }
    if (typeof Notification === 'undefined') return 'unsupported';
    return await Notification.requestPermission();
  } catch {
    return 'unsupported';
  }
}

/** Shows a system notification if the app is in the background and allowed to. */
export async function notify(title: string, body: string, tag?: string): Promise<void> {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') return;
  try {
    if (isNativeApp()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({ notifications: [{ id: nextId++, title, body }] });
      return;
    }
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    new Notification(title, { body, tag, icon: '/icon-192.png' });
  } catch {
    /* Notifications are a bonus; never break the game over them. */
  }
}
