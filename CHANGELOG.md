# Changelog

## 1.12.1 — 2026-10-15 (cloud save fix)

- **Fixed a cloud-save loop:** two devices could hold the same progress with keys in a different order (for
  example today's quests), see each other's copy as different, and rewrite it back and forth until the
  daily Firestore quota ran out. Saves are now compared by content and written in a stable form.
- A safety limit (8 writes a minute, 40 an hour per device) pauses syncing briefly if anything ever loops.
- Coins and shop purchases are stored in their own fields (`wallet`, `owned`), so devices on older
  versions never fight over them.
- **Android app 1.12.1** (versionCode 13).

## 1.12.0 — 2026-10-15 (coins, shop, three-word Swap)

- **Wordskiis coins:** every game now earns coins alongside XP (a fifth of its XP, plus 20 per achievement,
  25 per level and 100 for a new rank). Everyone starts with 150. The balance sits in the header, rolls up
  and floats "+N" when coins come in, and opens the shop.
- **Shop:** 10 tile colours (including the animated Galaxy, Solid Gold and Rainbow) and 6 tile styles (Soft,
  Bubble, Pixel, Glass, Gem, Neon), each with a live preview, plus a daily deal at 30% off. Buying takes two
  taps, bursts coins and switches the item on. Everything you own is also in Settings → Tile theme.
- **Word Swap:** the picker now chooses one of three offered words (rated Easy / Medium / Tricky) instead of
  typing any word. The three are fixed per round, so refreshing doesn't reroll them.
- Fixed the Ocean theme using its dark-mode colours in light mode.
- Cloud save carries coins and purchases (coins add up per device, like XP).
- **Android app 1.12.0** (versionCode 12).

## 1.11.0 — 2026-10-14 (Word Swap, Submit button, update prompt)

- **Word Swap (Friends):** pick a word for a friend and watch them guess it live (every guess and keystroke),
  then roles swap. Solving scores 7 − guesses; stumping your friend scores 3. A scoreboard shows the score,
  who leads (with a crown) and the round. **Nudge** your friend when it's their turn; turns, nudges and
  results arrive as toasts, and as system notifications when Wordskiis is in the background (with
  permission). Firestore rules enforce whose turn it is, one guess at a time, and at most 6 points a round.
- **Submit button:** the Enter key is replaced by a wide Submit button under the keyboard. It's greyed out
  (with a letter counter) until the row is full, turns into **Not a real word** — and can't be pressed —
  for unknown words (the row also turns red), and lights up for a real word. Physical Enter still works.
- **Update prompt:** an open tab now notices a new release and offers **Update**, so it never keeps
  running old code (this is why a laptop tab could miss new syncing features).
- **Settings → Account:** "Last synced" time, **Sync now**, and the reason if a sync fails.
- **Android app 1.11.0** (versionCode 11), with notifications for Word Swap.

## 1.10.3 — 2026-10-13 (games in progress sync too)

- **Cloud save now covers games in progress and settings:** your Tower run, Practice game and statistics,
  Survival run, Duo, Quad, Word Ladder, today's Daily Rush, and your settings (theme, tile theme, mods…).
  The most recent change wins. For saves made before cloud save existed, the one that's further along wins
  (e.g. Tower floor 5 beats floor 1), whichever device syncs first.
- If a newer save arrives for a game you have open, that screen reloads from it.
- Two new end-to-end tests: a Tower run continuing on another device, and old saves on two devices.
- **Android app 1.10.3** (versionCode 10).

## 1.10.2 — 2026-10-13 (cloud save)

- **Cloud save:** when signed in with Google, your level and XP, achievements, personal bests, daily quests,
  Daily statistics and streak, today's Daily Challenge and your Word Book sync across all your devices,
  live. XP is tracked per device, so play on several devices adds up exactly and is never counted twice,
  even if you played on both before signing in. Practice statistics stay per device.
- Settings → Account shows sync status.
- Firestore rules: a private `saves/{uid}` document per Google account (guests can't write one), deleted
  with "Delete my profile". Covered by rules tests and a two-device end-to-end test.
- **Android app 1.10.2** (versionCode 9).

## 1.10.1 — 2026-10-13 (sign-in fix, account in Settings, App Check)

- **Fixed:** Google sign-in in the Android app failed with "You CANNOT use scopes without modifying the main
  activity". The app no longer requests custom scopes (email and profile are the defaults).
- **Account in Settings:** sign in with Google or sign out from Settings, without opening Friends first.
- **App Check:** Firestore now only accepts requests from the real website and app (reCAPTCHA Enterprise,
  invisible), so the free Firebase quota can't be drained by scripts. Noted in the privacy policy.
- **Security headers** on the website, and a patched `@grpc/grpc-js`.
- **Android app 1.10.1** (versionCode 8). Older app versions need this update to use Friends.

## 1.10.0 — 2026-10-13 (free themes and records)

- **Three free tile themes:** Mint, Candy and Lavender, available from level 1 alongside Classic.
- **Theme picker in Settings** with a live preview row; themes are grouped into Free and Unlocked by rank
  (also in Ranks and themes).
- **Records** tab in Statistics: rank, total XP and personal bests across every mode.
- **Android app 1.10.0** (versionCode 7).

## 1.9.0 — 2026-10-13 (Tower, Bot Duel, Reverse, Fibber)

- **The Tower:** a roguelike climb — each floor is a word with stacking twists, perks between floors, and
  three hearts. Animated floor intros and perk choices; runs survive a refresh.
- **Bot Duel:** race Pip, Byte or Oracle live on the same word, with a 3-2-1 start, the bot's board, a
  thinking animation and its reactions.
- **Reverse:** see the answer, make the pattern. Wrong tries show the pattern they actually made.
- **Fibber mod:** one lie per row, unmasked with "LIE" tags when the game ends.
- Home: big animated cards for The Tower and Bot Duel, and modes grouped into Quick play and Puzzles.
- Smooth screen transitions, XP that counts up, and "in a row" combo callouts in Blitz.
- End-of-game buttons stack icon over label on narrow phones.
- 5 new achievements (40 in total) and 3 new daily quests.
- **Android app 1.9.0** (versionCode 6).

## 1.8.0 — 2026-10-13 (ranks, themes and Word Ladder)

- **Ranks:** ten tiers from Rookie to Wordskiis Legend at level 100, each with a bevelled emblem in its own
  colours. Effects grow with rank: sheen, breathing aura, rotating ring, orbiting sparks, and for Legends a
  prismatic emblem with light rays and rising particles. Shown on Home, in Achievements and in a new
  **Ranks and themes** screen.
- **Rank-up moment:** a full-screen celebration with the new emblem and any unlocked theme.
- **Tile themes** unlocked by rank: Ocean, Sunset, Forest, Neon, Royal, Ember, and animated Aurora and Prism.
  Pick one in Ranks and themes or from Settings.
- **Word Ladder:** a new game type. Change one letter at a time to reach the target within par + 3 moves;
  stars, hints and the shortest path shown at the end.
- Level curve rebalanced so level 100 is a long-term goal (level 2 still at 100 XP).
- 6 new achievements (35 in total) and a Word Ladder daily quest.
- Game modes now load on demand, keeping the first load smaller.
- **Android app 1.8.0** (versionCode 5).

## 1.7.0 — 2026-10-13 (more modes, mods and meanings)

- **Reward cards** replace emoji pop-ups: designed cards for achievements, quests and level-ups, with an
  icon tile, a sheen and a confetti burst on level-up. They arrive one after another along the top edge.
  Emojis were removed from in-game text and from share titles (the coloured squares stay).
- **Word meanings everywhere:** a full sheet with pronunciation audio, up to three parts of speech,
  examples and synonyms. Opens from results, the end-of-game panel and every word chip. Falls back to
  Wiktionary when the Dictionary API is slow or down.
- **Word Book:** every word you play is collected; search, filter and tap for its meaning.
- **Quad:** four words, nine shared guesses, compact boards and a four-way split keyboard.
- **Daily Rush:** a Blitz run on the same words for everyone, once a day.
- **Practice mods:** Fog and Blind keys, each worth bonus XP, in a new Mods panel.
- 6 new achievements (29 in total) and 4 new daily quests.
- Practice tools sit on their own row on phones so the title is never squeezed.
- **Android app 1.7.0** (versionCode 4).

## 1.6.0 — 2026-10-13 (new modes and challenges)

- **Duo:** two hidden words at once with 7 shared guesses, side-by-side boards and a split-colour
  keyboard (left half word 1, right half word 2). Saved after every guess; spoiler-free sharing.
- **Survival:** word after word with 3 lives; a miss costs a life and a quick solve (3 guesses or
  fewer) wins one back. Runs survive a refresh; best score kept.
- **Daily quests:** three goals per day, the same for everyone, worth +60 XP each, shown on Home.
- **8 new achievements** (23 in total): Duo, Survival, quests and level 10.
- Home: a "Ways to play" grid (Practice, Blitz, Duo, Survival) and the Daily quests card.
- How to play covers Duo, Survival and quests.
- **Android app 1.6.0** (versionCode 3).

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
