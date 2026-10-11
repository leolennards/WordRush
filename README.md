# Wordskiis

**A little word challenge every day.**

Wordskiis is a five-letter word puzzle for the web. Solve the shared **Daily Challenge** in six
guesses, or play unlimited **Practice** words. It runs entirely in the browser — no account, backend,
paid API or database — and keeps preferences, progress and statistics in `localStorage`.

## Features

- Daily Challenge: the same answer for every player on the same UTC date, numbered (#1 = 11 Oct 2026, launch day),
  with a countdown to the next one. Progress and results survive refresh; there is no in-game reset.
- Practice: unlimited words with separate statistics; never touches the daily game or streak.
- Correct duplicate-letter feedback, local dictionary (12,675 accepted guesses, 1,922 curated answers).
- Physical and on-screen keyboards, invalid-word shake, flip reveals, win celebration.
- Statistics: played, win %, current/best streak, guess distribution, average guesses, last daily result.
- Spoiler-free sharing via the Web Share API (touch devices) or clipboard.
- Dark, light and system themes (no flash on load), colour-accessible palette, reduced motion, optional
  synthesised sound effects, hard mode.
- Installable PWA with an offline service worker (production builds only).

## Apps (Android, iPhone)

The same game is packaged with **Capacitor** as native apps (`android/`, `ios/`), using the same
Firebase project, so friends play together across web and apps. Android is distributed free from the
website (**Get the app**); iPhone users can install the web app with *Add to Home Screen*. Store
publishing is optional and costs money (Google Play $25 once, Apple $99/year) — see
[STORE_PUBLISHING.md](STORE_PUBLISHING.md), which also explains the signing key that must be backed up.

## Playing with friends

Players create a profile (just a display name — no email or password) and get a 6-character
friend code. Optionally, **Save with Google** links the profile to a Google account so it works on
other devices too (signing in on a new device loads the same profile and friends). Adding someone's code puts you in each other's Friends tab, where you can:

- see each friend's Daily result (colours only, never letters) and streak;
- **Challenge** them: you both play the same random word whenever you like, then compare;
- **Race** them live: same word, synced 3-2-1 start, watch their progress, first to solve wins.

This uses **Firebase on the free Spark plan** (anonymous sign-in + Cloud Firestore). No credit card
is attached, so it cannot incur charges; if free limits were ever exceeded, Friends would pause until
the next day. Friends data is protected by `firestore.rules`. The Firebase SDK is code-split and only
downloads when someone opens Friends. If the `VITE_FIREBASE_*` variables are not set, the Friends tab
is hidden and the solo game works exactly as before.

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | Firebase web app config (public identifiers, not secrets) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Optional, defaults to `<project>.firebaseapp.com` |

Local development without any Firebase account: `npm run dev:friends` runs the app against the
free local Firebase emulators (needs Java). `firebase deploy --only firestore` publishes rules and
indexes to the real project.

## Requirements

Node.js 20+ (developed with Node 24.20 and npm 11.19).

## Commands

```bash
npm install            # install dependencies (uses package-lock.json)
npm run dev            # start the dev server at http://localhost:5173
npm run typecheck      # TypeScript (strict)
npm run lint           # ESLint
npm test               # Vitest unit + interface tests
npm run build          # type-check and build to dist/
npm run preview        # serve the production build at http://localhost:4173
npx playwright install chromium   # one-time browser download for E2E tests
npm run test:e2e       # Playwright E2E (builds and serves automatically)
npm run check          # typecheck + lint + test + build
npm run test:rules     # Firestore security-rules tests (local emulator, needs Java)
npm run test:e2e:friends  # two-player browser test against the local emulators
npm run dev:friends    # dev server wired to local Firebase emulators
npm run words:build    # regenerate word lists (changes the daily schedule — read SOURCES.md first)
```

## Configuration

- Branding, rules, daily epoch and timings: `src/config/game.ts`.
- Design tokens (colours, radii, shadows, motion): `src/styles/index.css`.
- `VITE_SITE_URL` (build-time env var): URL included in shared results. Defaults to the current
  page URL.

## Deployment

Live at **https://wordskiis.vercel.app** (Vercel project `wordskiis`, connected to
`leolennards/WordRush`: every push to `main` deploys to production, other branches get preview URLs).

`npm run build` produces a static site in `dist/`. Host it on any static host (Netlify, Vercel,
Cloudflare Pages, GitHub Pages, S3 + CloudFront):

1. Build command `npm run build`, output directory `dist`.
2. Set `VITE_SITE_URL=https://your-domain.example` so shared results link to your site.
3. Serve over HTTPS (required for the service worker, clipboard and Web Share APIs).
4. Serve `sw.js` with `Cache-Control: no-cache` so updates are picked up; `assets/*` can be cached
   immutably (file names are content-hashed).
5. The app assumes it is served from the domain root (`/`). For a sub-path, set Vite's `base` and
   update `start_url`/`scope` in `public/manifest.webmanifest` and the paths in `public/sw.js`.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — structure, design decisions, storage schema, mobile path
- [GAME_RULES.md](GAME_RULES.md) — rules, evaluation algorithm, hard mode, daily schedule
- [TESTING.md](TESTING.md) — test coverage and latest results
- [src/data/words/SOURCES.md](src/data/words/SOURCES.md) — dictionary sources and licences
- [STORE_PUBLISHING.md](STORE_PUBLISHING.md) — app builds, signing key, Google Play / App Store steps
- [CHANGELOG.md](CHANGELOG.md), [TODO.md](TODO.md)

## Known limitations

- Friend games store their word in the shared game record, so a determined player could find it
  with developer tools. Friends play on trust.
- Guest Friends profiles live on one device (anonymous sign-in); clearing site data creates a new
  profile unless it was saved with Google. Google sign-in needs the site's domain listed under
  Firebase Authentication → Settings → Authorized domains.
- Client-only: anyone can read the answer list in the shipped JavaScript, or edit/clear
  `localStorage` to replay a daily challenge or alter statistics. There is no server-side
  verification, so streaks are honour-based.
- Statistics live in one browser on one device; clearing site data erases them. There is no sync.
- The dictionary is curated from open word lists, not a complete English dictionary.
- Only Chromium has been tested by the automated suites; Firefox, Safari and real phones have not
  been tested.
