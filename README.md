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
npm run words:build    # regenerate word lists (changes the daily schedule — read SOURCES.md first)
```

## Configuration

- Branding, rules, daily epoch and timings: `src/config/game.ts`.
- Design tokens (colours, radii, shadows, motion): `src/styles/index.css`.
- `VITE_SITE_URL` (build-time env var): URL included in shared results. Defaults to the current
  page URL.

## Deployment

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
- [CHANGELOG.md](CHANGELOG.md), [TODO.md](TODO.md)

## Known limitations

- Client-only: anyone can read the answer list in the shipped JavaScript, or edit/clear
  `localStorage` to replay a daily challenge or alter statistics. There is no server-side
  verification, so streaks are honour-based.
- Statistics live in one browser on one device; clearing site data erases them. There is no sync.
- The dictionary is curated from open word lists, not a complete English dictionary.
- Only Chromium has been tested by the automated suites; Firefox, Safari and real phones have not
  been tested.
