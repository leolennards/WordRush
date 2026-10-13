# Changelog

## 1.5.0 — 2026-10-13 (more fun)

- **Background decal:** a soft dot grid and gently floating letter tiles in the game's own colours, in
  light and dark themes. It fades out behind the board and stays still with reduced motion.
- **Blitz mode:** solve as many words as you can against a 90-second clock (+15 s per solve, −10 s per
  miss), with a live timer bar, best score and spoiler-free sharing.
- **Levels and XP:** every game earns XP; a level bar on Home and in results.
- **Achievements:** 15 to unlock, with a celebratory toast and an Achievements screen.
- **Practice hints:** reveal up to two letters per word, shown as ghost tiles.
- **What it means:** the answer's definition in the results.
- **Vibration** setting on supported phones.
- Home: level card, Blitz card and an Achievements link; the daily card no longer stretches.
- How to play now covers hints, Blitz and levels.
- **Android app 1.5.0** (versionCode 2) with all of the above; updates over the previous install.

## 1.4.0 — 2026-10-11 (apps)

- **Android app** (Capacitor) with native Google sign-in, native share sheet, Wordskiis icon and launch
  screen; signed release APK offered free on the website via **Get the app**.
- **iPhone project** generated and configured (icons, launch screen, Google sign-in URL scheme) ready
  for a Mac with Xcode; iPhone players can install the web app via Add to Home Screen meanwhile.
- **Delete my profile** (Friends): removes name, code, friendships and sign-in account (store requirement).
- **Privacy policy** page at `/privacy.html`.
- Safe-area handling also supports older Android WebViews.
- STORE_PUBLISHING.md: free distribution, signing-key backup, and optional Google Play / App Store steps.

## 1.3.0 — 2026-10-11 (play with friends)

- **Friends tab:** profile with display name and 6-character friend code (copy / share invite), add
  friends by code, friend list with each friend's Daily result (colours only) and streak, remove friend.
- **Challenges:** play the same random word separately; results are hidden until you finish, then
  compared side by side with a winner. Rematch in one tap.
- **Live races:** invite, accept/decline, synced 3-2-1 countdown, opponent's progress live, first to
  solve wins (ties settled fairly in a transaction). Rematch in one tap.
- **Google sign-in (optional):** "Save with Google" links your guest profile so it follows you to other
  devices; signing in on a new device loads your existing profile; sign out returns to a fresh guest.
- Friends badge in the header and a "Play with friends" card on Home.
- Firebase (free Spark plan) with tested security rules; SDK loads only when Friends is used.
- Refactor: every game screen now shares `useGameScreen` and `PlayArea`.

## 1.2.0 — 2026-10-11 (design refresh)

- **Ink primary actions:** buttons use a neutral ink colour; green/amber are reserved for game feedback.
- **Home redesigned:** dated headline that reflects today's status, a hero daily card with a spoiler-free
  mini-board of your progress, a single streak strip (with an inviting first-time state), a practice row,
  and a two-column desktop layout. Removed the duplicated logo/title and the dashboard-style stat boxes.
- **Game screen:** header, mode switch and title collapsed into one row on mobile (more room for the
  board); the redundant guess counter is gone; the board is larger on desktop and aligned with its title;
  the global footer was removed.
- **Tiles and keys:** tighter radii, a subtle tactile lower edge on revealed tiles, higher-contrast typed
  letters, and title-case "Enter".
- **Results and stats:** visible title, praise plus a mini-board of your game, one stats strip, real
  distribution tracks instead of "0" pills, an empty state before the first win, and an inline countdown.
- **End-of-game panel** is more compact (status + Share on one line, then Results / Practice / Home).
- **Fixed:** visible toasts (e.g. "Not in word list") never appeared after 1.1.0 because they rendered
  outside the animation provider. A new E2E test checks the toast is actually visible.

## 1.1.0 — 2026-10-11

- **Renamed to Wordskiis** (storage keys now `wordskiis:*`). Daily puzzle #1 is launch day, 11 Oct 2026.
- **Fixed:** the results dialog never opened after finishing a game in normal use — the per-second
  countdown re-render kept restarting its timer (and repeated the "Solved!" toast). Regression tests
  now use a live clock.
- **New home dashboard** as the landing view: today's challenge (status, mini result grid,
  Play/Continue/View results, countdown), streak summary, practice card and quick links.
  Views live in the URL (`#daily`, `#practice`) and the browser Back button returns home.
- **New end-of-game panel** replaces the keyboard with Share, Results, Practice/New word and Home.
- **Dark mode:** ruled-out letters on the keyboard are now clearly blacked out.

## 1.0.0 — 2026-10-11

Initial build (as WordRush).

- Project setup: React 19, TypeScript 6 (strict), Vite 8, Tailwind CSS 4, Motion, Lucide, Vitest,
  React Testing Library, Playwright, ESLint.
- Pure game engine: frequency-aware evaluation, guess validation, hard mode, daily scheduling,
  statistics, practice selection and share text.
- Local dictionary: 1,922 curated answers and 12,675 accepted guesses from SCOWL and `word-list`,
  with a reproducible generator.
- Daily Challenge (UTC, numbered, countdown, restore, rollover handling) and Practice mode with
  separate storage and statistics.
- Versioned, validated localStorage persistence with memory fallback.
- Responsive board and keyboard, physical and on-screen input, reveal, shake, bounce and win
  animations.
- Results, statistics, settings, help and confirmation dialogs.
- Spoiler-free sharing via the Web Share API or clipboard.
- Dark, light and system themes without flash; colour-accessible palette with shape markers;
  reduced motion; optional synthesised sounds.
- Accessibility: semantic landmarks, labelled tiles and keys, live announcements, focus trapping
  and restore in dialogs, skip link.
- PWA manifest, icons and offline service worker.
- 73 unit/interface tests and 10 Playwright end-to-end tests.
