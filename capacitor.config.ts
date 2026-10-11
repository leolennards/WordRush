import type { CapacitorConfig } from '@capacitor/cli';

// Native app wrapper (Android + iOS) around the same web build in dist/.
// The app talks to the same Firebase project as the website, so friend
// codes, challenges and races work across web, Android and iPhone.
const config: CapacitorConfig = {
  appId: 'com.wordskiis.app',
  appName: 'Wordskiis',
  webDir: 'dist',
  android: {
    // Matches the web build's dark background while the WebView loads.
    backgroundColor: '#0c0f15',
  },
  ios: {
    backgroundColor: '#0c0f15',
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 700,
      launchAutoHide: true,
      backgroundColor: '#0c0f15',
      showSpinner: false,
    },
    SocialLogin: {
      // Only Google is used; leave the others out of the app.
      providers: { google: true, facebook: false, apple: false, twitter: false },
      logLevel: 1,
    },
  },
};

export default config;
