# Apps: free distribution and (optional) store publishing

Wordskiis ships as one codebase in three forms. All of them use the same Firebase project, so friend
codes, challenges and races work between the website, Android and iPhone.

| Form | Cost | How players get it |
| --- | --- | --- |
| Website | Free | https://wordskiis.vercel.app |
| Android app (APK) | Free | Home → **Get the app** → *Download the Android app* (`/downloads/wordskiis-android.apk`) |
| iPhone / iPad | Free | Safari → Share → **Add to Home Screen** (installable web app, works offline) |
| Google Play | **$25 once** (optional) | See below |
| Apple App Store | **$99 per year** (optional) | See below |

Nothing in this repository costs money to build. Fees only apply if you choose to publish to a store.

---

## ⚠️ The Android signing key — back it up

Release builds are signed with an upload key that lives **outside the repository**:

```
~/Projects/wordskiis-signing/
  wordskiis-upload.jks        ← the key
  keystore.properties         ← its password and alias
```

- Never commit or share these files.
- **Back up the whole folder** (for example to a password manager or an encrypted USB drive). Android
  only installs an update if it is signed with the same key as the installed app. If the key is lost,
  people who installed the APK would have to uninstall and reinstall (Google Play's *App Signing* can
  reset a lost upload key, but only for Play-distributed apps).
- Fingerprints (already registered with Firebase for Google sign-in):
  - SHA-1 `5D:37:B5:71:66:1E:2F:B3:CF:9F:9E:B1:76:3E:59:A2:70:07:58:97`
  - SHA-256 `B2:1E:38:98:67:8D:A3:B6:9F:0F:E6:A2:3D:1F:47:DA:31:52:49:EB:09:D3:E0:32:7C:0A:75:08:2B:6A:B9:92`

## Building

Requirements: Node 20+, Android Studio (Android SDK + a JDK 17–22; this machine uses JDK 22), and for
iOS a Mac with Xcode.

The native builds read public build settings from `.env.production.local` (not committed):

```
VITE_FIREBASE_API_KEY=…          VITE_FIREBASE_PROJECT_ID=wordskiis
VITE_FIREBASE_APP_ID=…           VITE_FIREBASE_AUTH_DOMAIN=wordskiis.firebaseapp.com
VITE_SITE_URL=https://wordskiis.vercel.app
VITE_GOOGLE_WEB_CLIENT_ID=387439748303-hdert9rk8qk20rnarnqoiqulakiua3ot.apps.googleusercontent.com
VITE_GOOGLE_IOS_CLIENT_ID=387439748303-njmp5968cvje8u3ebnl7aigp85rkp7dq.apps.googleusercontent.com
```

```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-22.jdk/Contents/Home
npm run app:apk      # signed release APK → also copied to public/downloads/wordskiis-android.apk
npm run app:aab      # signed App Bundle for Google Play → android/app/build/outputs/bundle/release/
npm run app:android  # open in Android Studio (run on a phone or emulator)
npx cap open ios     # open in Xcode (Mac with Xcode only)
npm run app:icons    # regenerate app icons/splash screens from the logo
```

## Releasing an Android update (free, via the website)

1. In `android/app/build.gradle`, increase `versionCode` by 1 and set `versionName` (e.g. `1.4.1`).
2. `npm run app:apk`
3. Commit `public/downloads/wordskiis-android.apk` and push to `main`. Vercel publishes it; players
   download it again from **Get the app** and Android installs it over the old version.

Web-only changes reach app players only when you ship a new APK (the app bundles its own copy of the
game). Friends data is shared live regardless.

## Publishing to Google Play ($25 one-time)

1. Create a developer account at https://play.google.com/console (one-time US$25 fee). New *personal*
   accounts must run a **closed test with at least 12 testers for 14 days** before the app can go to
   Production.
2. *Create app* → name **Wordskiis**, free, game.
3. Enable **Play App Signing** (default). Upload `app-release.aab` from `npm run app:aab`.
4. In Play Console → *App integrity* → copy the **App signing key SHA-1 and SHA-256**, then register them
   for Google sign-in:
   ```bash
   npx firebase apps:android:sha:create 1:387439748303:android:88251007fb7656da6c03ba <SHA> --project wordskiis
   ```
5. Store listing: use the 512×512 icon (`public/icon-512.png`), phone screenshots, and the privacy policy
   URL **https://wordskiis.vercel.app/privacy.html**.
6. *Data safety* answers (matches the privacy policy): collects **name** (display name) and **email**
   (only if the player signs in with Google) and **app interactions** (game results), for **app
   functionality**; data is encrypted in transit; users can **delete their data in-app**
   (Friends → Delete my profile); no data is shared with third parties for ads; no ads.
7. Content rating questionnaire → everyone; target audience 13+ is simplest (no ads, no chat).

## Publishing to the Apple App Store ($99/year)

Requires an Apple Developer Program membership (US$99/year) and a Mac with Xcode.

1. `npm run app:sync`, then `npx cap open ios`.
2. In Xcode → *Signing & Capabilities*: choose your Team; bundle ID **com.wordskiis.app** (already
   registered with Firebase; Google sign-in URL scheme is already in `Info.plist`).
3. **Before submitting**, Apple's Guideline 4.8 requires apps that offer a third-party login (Google)
   to also offer **Sign in with Apple**. Add it (free with the membership) or remove Google sign-in from
   the iOS build. This is the one known blocker for App Store review.
4. *Product → Archive → Distribute App → App Store Connect*. Fill in the listing, privacy "nutrition
   label" (same data as the Play Data safety section) and the privacy policy URL.

Until then, iPhone players can use the free **Add to Home Screen** version.
