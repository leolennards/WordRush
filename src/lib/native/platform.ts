import { Capacitor } from '@capacitor/core';

/** True inside the Android/iOS app (Capacitor), false on the website. */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

export const nativePlatform = (): 'android' | 'ios' | 'web' => Capacitor.getPlatform() as 'android' | 'ios' | 'web';
