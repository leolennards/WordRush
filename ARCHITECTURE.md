# Architecture

## Overview

```
src/
  engine/            Pure TypeScript game engine — no React, DOM or storage imports
  config/game.ts     Branding, rules, daily epoch, dictionary version, animation timings
  data/words/        Generated answer and guess lists + the default Dictionary instance
  lib/
    storage/         KeyValueStore interface, localStorage adapter, versioned schemas/validators
    audio/           Synthesised Web Audio sound cues
    accessibility/   Focus helpers
    pwa/             Service-worker registration
  features/
    game/            Session reducer (input/reveal locking) + useGameSession hook
    daily/           useDailyGame — today's puzzle, restore, day rollover
    practice/        usePracticeGame — unlimited games, recent-answer avoidance
    stats/           StatsContext — idempotent recording, reset
    settings/        SettingsContext — theme, accessibility, sound, hard mode
    sharing/         Web Share / clipboard with fallback
  hooks/             useTodayIndex, useCountdown, usePhysicalKeyboard, useHashMode, useMediaQuery
  components/        board/, keyboard/, dialogs/, statistics/, layout/, ui.tsx
  app/               App composition and dependency-injected Services
  styles/index.css   Design tokens (light, dark, colour-accessible) + tile/key animations
  tests/             Vitest unit and React Testing Library tests
e2e/                 Playwright end-to-end tests
scripts/             Word-list generator
public/              Icons, manifest, service worker
```

## Layers

1. **Engine (`src/engine`)** — framework-independent and fully serialisable. `evaluateGuess`,
   `submitGuess` (returns a new state or a typed error), hard-mode validation, daily scheduling,
   statistics, practice selection and share text are all pure functions. This is the part a native
   app would reuse unchanged.
2. **Session reducer (`features/game/sessionReducer.ts`)** — wraps a `GameState` with UI state
   (current input, the row being revealed, last rejection, "just completed" flag). Everything that
   can race — typing during a reveal, repeated Enter, input after game over — is resolved here
   synchronously, so React effects never need to guard against double submissions.
3. **Mode hooks (`useDailyGame`, `usePracticeGame`)** — choose/restore the game, persist after every
   change, and report finished games to `StatsContext`. Both are always mounted, so switching
   modes never loses state and the two sessions are stored under separate keys.
4. **Components** — presentational; the board and keyboard receive plain props.

## Dependency injection

`App` takes a `Services` object (`store`, `dictionary`, `now`, `random`). The browser entry point
(`main.tsx`) wires localStorage, the bundled dictionary, the real clock and `Math.random`. Tests
inject a memory store, a fixed date and deterministic randomness. A mobile shell can inject native
storage.

## Persistence

All data goes through `KeyValueStore` (`get/set/remove`). `createBrowserStore` probes
localStorage and silently falls back to memory when it is unavailable (Settings then warns that
progress won't be saved).

Every value is stored as `{ "v": <schemaVersion>, "data": … }` and validated on read
(`lib/storage/schemas.ts`):

| Key | Schema v1 payload |
| --- | --- |
| `wordrush:settings` | `{ theme: 'system'\|'light'\|'dark', sound, highContrast, reduceMotion, hardMode, seenHelp }` (booleans; missing/invalid fields fall back to defaults individually) |
| `wordrush:daily` | `{ game: GameState }` with `mode: 'daily'` and integer `dayIndex` |
| `wordrush:practice` | `{ game: GameState \| null, gameNumber, recent: string[] }` |
| `wordrush:stats:daily`, `wordrush:stats:practice` | `{ played, wins, currentStreak, maxStreak, distribution[6], lastRecordedKey, lastWonKey, lastResult }` |

`GameState` = `{ mode, id, answer, guesses[], evaluations[][], status, hardMode, dayIndex }`.
Validation also checks consistency (e.g. `status` must match the guesses), so a tampered or
half-written session is rejected rather than played.

- **Malformed JSON or invalid data** → treated as missing (safe defaults); the raw value is copied
  to `<key>:corrupt` for diagnosis and never re-saved as valid.
- **Older version** → passed to the schema's optional `migrate`, then re-saved.
- **Newer version** (e.g. after a rollback) → ignored and left untouched.
- **Writes** are validated first; invalid state is never persisted.

## Key design decisions

- **UTC day boundary.** One global puzzle per day, simple to reason about and test. Trade-off: for
  players far from UTC the puzzle changes mid-day local time (shown in the UI and help).
- **Pre-shuffled answer list as the schedule.** Deterministic, no runtime RNG or server. Adding
  answers must be append-only (see `SOURCES.md`).
- **Idempotent statistics** via increasing keys instead of "already recorded" flags, which also
  survives multiple tabs and React StrictMode double effects.
- **Reveal lock in the reducer** rather than timers in components.
- **Focus management:** on-screen keys, tabs and header buttons don't take focus on mouse or touch
  press, so a later physical Enter always submits. Enter/Space on a keyboard-focused control keep
  their native behaviour.
- **Theme without flash:** an inline script in `index.html` reads the saved setting and sets
  `class="dark"`/`data-contrast` before first paint; React then keeps them in sync.
- **Motion:** CSS for tile pop/flip/shake/bounce; Motion (`LazyMotion` + `domAnimation`) for dialogs,
  toasts, statistic bars and the win burst. All animations are disabled by the OS
  `prefers-reduced-motion` setting or the in-app toggle; with reduced motion, reveals are instant.
- **Sound** is synthesised with Web Audio (no asset files), off by default, and the AudioContext is
  only created in response to user input.
- **Bundle:** ~156 kB gzipped JS (React DOM ~60 kB, dictionary ~30 kB, Motion ~35 kB) plus a
  self-hosted Outfit variable font (OFL). No runtime network requests.

## Offline / PWA

`public/sw.js` (registered only in production builds) caches the app shell and same-origin assets
as they are requested: navigations are network-first with a cached fallback, and hashed assets are
cache-first. After one successful visit the game works offline. `manifest.webmanifest` + icons make
it installable. To force all clients to update cached files, bump `CACHE` in `sw.js`.

## Future mobile path

The web app is the product today; nothing native has been started. Recommended path:

1. **Capacitor (lowest effort).** Wrap the existing `dist/` build in a native WebView shell for
   Android and iOS store distribution. Replace `createBrowserStore` with a `KeyValueStore` backed by
   `@capacitor/preferences`, and use `@capacitor/share` and native haptics for sharing and feedback.
   Most of the codebase is reused as-is.
2. **React Native (more native feel).** Reuse `src/engine` (pure TS), the word lists, the storage
   schemas/validators and the stats logic directly. Rebuild the presentation layer (board, keyboard,
   dialogs) with React Native components and AsyncStorage/MMKV behind `KeyValueStore`. The session
   reducer and mode hooks are React-only (no DOM) and can be ported with small changes.

In both cases, keep the answer list and `dictionaryVersion` identical across platforms so web and app
players share the same daily puzzle.
