# Testing

## How to run

```bash
npm test                         # Vitest: unit + interface tests (jsdom)
npx playwright install chromium  # once
npm run test:e2e                 # Playwright: builds, serves on :4173, runs E2E
npm run check                    # typecheck + lint + unit tests + production build
```

## Latest results (2026-10-11, macOS, Node 24.20.0, after a clean `npm ci`)

| Check | Command | Result |
| --- | --- | --- |
| Type check (strict) | `npm run typecheck` | Pass, 0 errors |
| Lint | `npm run lint` | Pass, 0 errors, 0 warnings |
| Unit + interface tests | `npm test` | **78 / 78 passed** (7 files) |
| Production build | `npm run build` | Pass — JS ~450 kB (~157 kB gzip), CSS ~34 kB (~8 kB gzip) |
| End-to-end | `npm run test:e2e` | **12 / 12 passed** (6 tests × desktop Chrome and Pixel 7 emulation, Chromium only) |

## Coverage by area

### Game engine (`src/tests/engine/`)

- Correct, present and absent feedback; duplicate letters in the guess, in the answer, and in both
  (e.g. GEESE/CRANE, EERIE/TIGER, KEBAB/ABBEY, SISSY/SASSY); exact matches take priority.
- Keyboard letter-state priority (never downgrades correct to present).
- Win detection; loss after six valid wrong guesses; invalid and incomplete guesses rejected without
  using an attempt; no submissions after the game ends; case-insensitivity; immutability.
- Dictionary normalisation and rejection of duplicate/malformed answer lists.
- Hard mode: green positions, amber letters, duplicate counts, absent letters not required.
- Daily: epoch numbering, UTC boundary (including a non-UTC offset), DST/year stability, same-date
  consistency, consecutive-day difference, wraparound, pre-epoch dates, countdown.
- Bundled word lists: answers unique, five letters, all accepted as guesses.
- Statistics: win %, current/best streak, missed day breaks streak, distribution, average guesses,
  duplicate/out-of-order results ignored, independence of Daily and Practice stats.
- Share text for a win and for a loss (X/6, hard-mode `*`, colour-accessible emoji, no answer).
- Practice: recent answers avoided, fallback when all excluded, bounded recent list.

### Session reducer (`src/tests/sessionReducer.test.ts`)

- Rapid Enter presses and typing during the reveal cannot double-submit or corrupt state.
- Rejections record the row; non-letters/overflow/post-game input ignored; hard mode locked after
  the first guess.

### Storage (`src/tests/storage.test.ts`)

- Round trip; malformed JSON quarantined; missing envelope/invalid fields rejected; newer schema
  versions left untouched; per-field settings defaults; inconsistent sessions rejected; invalid
  data never written.

### Interface (`src/tests/app.test.tsx`, React Testing Library)

- Daily heading and number; physical keyboard typing, overflow, Backspace, Enter, "Not enough letters".
- On-screen keyboard letters, Delete and Enter.
- "Not in word list" without using an attempt.
- Full win → results dialog and stats saved; full loss → answer revealed; no input after the end.
- Refresh recovery for unfinished and completed games, with no double counting and no replay.
- Daily and Practice kept separate in the UI and in storage; practice never uses today's answer.
- Share via clipboard: correct header, two emoji rows, no answer, success toast.
- Theme toggle persists and doesn't affect the game.
- First-visit help shown once; help examples are never possible answers.
- Hard mode enforced in the UI; the game still works when storage throws.
- Day rollover: the next load after UTC midnight shows the next challenge, and the previous result
  stays recorded.

### Home dashboard and end of game (`src/tests/app.test.tsx`)

- Lands on the dashboard; Play opens the daily game; typing on the dashboard is ignored.
- After a win the keyboard is replaced by the game-over panel; Home returns to the dashboard showing
  "Solved" and View results; Practice offers New word.
- **Live-clock regression:** with animations on and a ticking countdown, the results dialog opens and
  the "Solved!" toast fires once. (This bug shipped in 1.0.0 because earlier tests froze the clock.)

### End-to-end (`e2e/game.spec.ts`, real production build, full animations)

- Win through the real UI with invalid word, Backspace, and input ignored during the reveal.
- Refresh persistence and Daily/Practice independence, including **mouse-clicking the Practice
  tab and then submitting with the physical Enter key** (regression test for a focus bug found
  during development).
- Loss reveals the answer.
- A saved dark theme is applied before React renders (no flash).
- No horizontal scrolling at 320 × 568, and the board doesn't overlap the keyboard.
- With the real (unfrozen) clock: win → results → close → game-over panel → Home → dashboard, and
  browser Back from the game returns to the dashboard.

## Manual review performed

Screenshots of the production build were captured with Playwright (Chromium) and reviewed at 320 × 568,
360 × 740, 375 × 667, 390 × 844 and 1280 × 800, in light, dark and colour-accessible modes, covering
the board mid-game, the rules, results and settings dialogs. Problems found and fixed during this
review: the dialog container showed a focus ring when opened, and the footer wrapped on narrow phones.

## Not verified

- Firefox, Safari/WebKit and real iOS/Android devices (only Chromium, including mobile emulation).
- Native Web Share sheet (tests cover the clipboard path; the share path needs a touch device).
- Sound output (Web Audio is not available in jsdom; it was not listened to manually).
- Screen readers (labels and live regions are tested in the DOM, not with real assistive tech).
- Offline mode and PWA installation (the service worker only registers on a production origin and
  was not exercised in automated tests).
- The live (still-open tab) UTC-midnight rollover timer is implemented but only the reload path is
  tested.
