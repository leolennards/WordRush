# Wordskiis game rules

## Objective

Guess the hidden five-letter word in six attempts or fewer.

## Guessing

- A guess must be exactly five letters and must be in the accepted-guess dictionary.
- Incomplete guesses ("Not enough letters") and unknown words ("Not in word list") are rejected,
  shake the row, and **do not use an attempt**.
- Input is case-insensitive; only the letters A–Z are accepted.
- While a row is revealing (about 1.5 s, or instantly with reduced motion) further input is ignored,
  which prevents double submissions.
- The game ends when the answer is guessed (win) or six valid guesses have been used (loss). After
  that no further input is accepted.

## Feedback

| Colour (default / colour-accessible) | Marker in colour-accessible mode | Meaning |
| --- | --- | --- |
| Green / orange | bar under the letter | Right letter, right position |
| Amber / blue | dot in the corner | Letter is in the answer, but elsewhere |
| Grey | none | Letter is not in the answer (or all its copies are already accounted for) |

Every tile and keyboard key also has a text label for screen readers (for example "A, correct"),
and each revealed row is announced.

### Evaluation algorithm (duplicate letters)

Implemented in `src/engine/evaluate.ts` as the pure function `evaluateGuess(guess, answer)`:

1. **Exact pass:** each position where `guess[i] === answer[i]` is marked *correct*. Every answer
   letter *not* matched this way is counted in a frequency table.
2. **Present pass:** left to right, each remaining guess letter is marked *present* if the table still
   has a copy of it (and that copy is consumed); otherwise it is *absent*.

So a letter is never highlighted more times than it occurs in the answer, and exact matches always
take priority over misplaced ones. Examples:

| Answer | Guess | Result |
| --- | --- | --- |
| CRANE | GEESE | ⬛⬛⬛⬛🟩 — the answer's only E is matched exactly, so the other Es are grey |
| TIGER | EERIE | 🟨⬛🟨🟨⬛ — one E in the answer, so only the first guessed E is amber |
| ABBEY | KEBAB | ⬛🟨🟩🟨🟨 — the middle B is exact; the last B uses the second B |

The on-screen keyboard shows each letter's best known state (correct > present > absent).

## Hard mode

Optional (Settings). Each guess must use every hint revealed so far:

- A letter marked correct must stay in the same position ("3rd letter must be A").
- For each letter, the guess must contain at least as many copies as were revealed (correct +
  present) in any single previous guess ("Guess must contain 2 Es").
- Absent letters may be reused (they cost you nothing but give no information).

Hard mode can only change for the current game before its first guess; otherwise it applies from
the next game. Hard-mode results are marked with `*` when shared.

## Daily Challenge

- One puzzle per UTC day. The day boundary is **00:00 UTC** for everyone.
- `dayIndex` = whole UTC days since the epoch `2026-10-11` (launch day = #1); challenge number = `dayIndex + 1`.
- Answer = `answers[dayIndex mod answers.length]`, where `answers` is the fixed, pre-shuffled list in
  `src/data/words/answers.ts`. All players with the same `dictionaryVersion` get the same answer.
- Progress is saved after every guess and restored on refresh. A finished challenge stays finished;
  there is no restart.
- If the day changes while a challenge is in progress, the player may finish it (it is still recorded
  under its own day) or tap "Play #N" to move on. On a fresh page load, only today's challenge is
  offered; an unfinished game from an earlier day is discarded (and counts as missed).
- The answer is never shown in the interface until the game ends.

## Practice

- Unlimited games with answers drawn from the same answer list, avoiding the last 100 practice
  answers and today's daily answer (so practice can't spoil the daily puzzle).
- Saved separately from the daily game, with separate statistics.
- Starting a new word while a game with guesses is in progress asks for confirmation and records that
  game as a practice loss.
- **Hints:** up to 2 per word. Each reveals the letter at the first position not yet found as correct;
  it appears as a dashed "ghost" tile in the current row. Shared results show `💡n`, and each hint
  costs 20 XP. There are no hints in the Daily Challenge.

## Blitz

- 90 seconds on the clock. Each solved word adds 15 s; a missed word (six wrong guesses) removes 10 s.
- Words come from the answer list, never repeat within a run and never use today's daily answer.
- The run ends when the clock reaches zero; runs are not saved if you leave the screen.
- Your best score is kept; sharing shows one square per word, never the words.

## Duo

- Two hidden words, 7 guesses shared between them. Every guess is checked against both words.
- A word's board stops once that word is solved; the game is won when both are solved.
- Keys show two halves: the left half is word 1, the right half is word 2 (blank once that word is solved).
- Saved after every guess. A win earns 70 + 15 × (7 − guesses) XP.

## Quad

- Like Duo, with four hidden words and 9 shared guesses. Keys are split into quarters in board order
  (top-left word 1, top-right word 2, bottom-left word 3, bottom-right word 4).
- A win earns 120 + 20 × (9 − guesses) XP.

## Daily Rush

- A Blitz run (same clock rules) once per UTC day. The words come from a seeded shuffle of the day, so
  everyone gets the same words in the same order.
- One try: the run is saved as it goes, and leaving part-way ends it with the score so far.

## Practice mods

- **Fog:** only the latest submitted guess is visible while playing; every row reappears when the game ends.
  +30% XP on a win.
- **Blind keys:** the keyboard shows no colours until the game ends. +25% XP on a win.
- Mods stack, and can only change before the first guess of a word (like Hard mode).

## Survival

- Solve word after word. You start with 3 lives (the most you can hold).
- A missed word costs a life; solving in 3 guesses or fewer wins a life back. The run ends at 0 lives.
- Each word is counted once, and the run is saved after every guess. A run earns 10 + 30 per word solved.

## Daily quests

- Three quests per UTC day, picked from a pool by a seeded shuffle, so everyone gets the same ones.
- Progress comes from finished games of any mode; each completed quest is worth 60 bonus XP.
- Quests reset with the Daily Challenge at 00:00 UTC.

## Word Ladder

- Change one letter of the current word to make a new real word; repeat until you reach the target.
- Puzzles are built from the answer list so the shortest path uses common words; par is that path's length
  (3–5 moves). You have par + 3 moves.
- Any accepted word may be played. A move must change exactly one letter and can't repeat a word.
- Stars: 3 at par, 2 at one over par (or when hints were used), otherwise 1. Up to 2 hints, each revealing the
  next word on a shortest path from where you are.
- A win earns 50 + 30 × stars XP.

## Word Swap (Friends)

- One match per pair of friends. The player who starts picks first. The picker chooses one of three
  words offered for that round (each marked Easy, Medium or Tricky by how common its letters are). The
  three are the same on every device and after a refresh, and never repeat a word already played in the
  match. The guesser gets 6 guesses. The picker can watch every guess and keystroke live.
- Scoring per round: a solve scores 7 − guesses for the guesser (6 for a first-guess solve); if the guesser
  fails, the picker scores 3. Then roles swap and the round number goes up.
- Either player can nudge the other once a minute. Either player can end the match.

## Submitting a guess

- The Submit button under the keyboard is disabled until all five letters are typed. For a word that isn't
  in the word list it reads "Not a real word" and stays disabled; the typed row turns red.

## The Tower

- Start with 3 hearts on floor 1. Each floor is one word (6 guesses) with twists: none on floor 1, one from
  floor 2 (Fibber joins from floor 4), two from floor 6. Fibber and Hard mode never appear together.
- Clear a floor: choose one of two perks — Heal (+1 heart, max 3), Lantern (one letter revealed next floor),
  Shield (the next missed floor costs no heart) or Clear skies (no twist next floor).
- Miss a floor: lose a heart (or your shield) and move up anyway. The run ends at 0 hearts.
- Saved after every guess and choice. A run earns 10 + 45 XP per floor cleared.

## Bot Duel

- Pick Pip (easy), Byte (medium) or Oracle (hard), then a 3-2-1 countdown. Both of you play the same word.
- The bot guesses every few seconds (Pip 13–18 s, Byte 9–13 s, Oracle 6–9 s) using only words consistent
  with its own feedback; easier bots sometimes make loose early guesses.
- First to solve wins. If you run out of guesses the bot wins; if neither solves, nobody does.
- A win earns 60 XP + 0/30/70 for the bot's difficulty + 10 × (6 − guesses).

## Reverse

- 5 rounds and 3 lives. Each round shows an answer and a colour pattern; type any accepted word (other than
  the answer) that would produce exactly that pattern.
- A valid word with the wrong pattern costs a life and shows the pattern it actually made.
- 10 XP + 30 per round, +50 for a flawless game.

## Fibber (Practice mod)

- In every submitted row, exactly one tile shows a wrong colour (the winning row never lies). The keyboard is
  built from the same lying rows. When the game ends, the truth is shown and the liars are marked.
- +40% XP on a win. Turns off Hard mode, which would otherwise enforce hidden truths.

## Ranks and tile themes

- Ranks by level: Rookie (1), Apprentice (5), Wordsmith (10), Lexicon (20), Scholar (30), Sage (40),
  Virtuoso (50), Grandmaster (65), Mythic (80), Wordskiis Legend (100+).
- Four themes are free from the start: Classic, Mint, Candy and Lavender.
- Reaching a rank can unlock a tile theme (Ocean, Sunset, Forest, Neon, Royal, Ember, Aurora, Prism).
  The colour-accessible palette always takes priority over themes.

## Coins and the shop

- Every finished game earns Wordskiis coins: a fifth of the XP it earned, plus 20 per achievement,
  25 per level gained and 100 for a new rank. Everyone starts with 150 coins.
- Coin bonuses: +50 for solving a word with your first guess (Daily, Practice, Bot Duel or as the
  guesser in Word Swap), +40 when a game finishes the last of the day's three quests, and +100 for
  every 7 days of Daily streak (on days 7, 14, 21…).
- The daily chest in the shop opens once a day (once across all your devices with cloud save) for
  20–80 free coins; the amount is the same for everyone that day.
- The shop sells:
  - Tile colours: Citrus, Sakura, Berry Smoothie, Arctic, Matcha, Midnight Ink, Retro, Coral Reef, Cyberpunk,
    and the animated Galaxy, Toxic, Lava Lamp, Vaporwave, Solid Gold, Hologram and Rainbow.
  - Tile styles: Soft, Bubble, Pixel, Glass, Gem, Neon, and the animated Shimmer, Frost, Jelly and Blaze.
  - Keyboards: Candy Pop, Typewriter, Mechanical and the animated Neon Glow.
  - Sound packs (with sound effects on): Bubble Pop, Marimba, 8-bit Arcade and Typewriter.
  - Win effects (what bursts out when you win): Love Hearts, Coin Shower, Starfall and Fireworks.
    Confetti is free.
  - Avatar frames (Gold, Neon, and the animated Rainbow and Flame rings) and badges (Star, Heart,
    Lightning, Crown, Diamond). Friends see them next to your name everywhere in Friends.
- Limited-time items are only on sale in their season: Halloween (1 October – 7 November: Haunted tile
  colours and the Bat Swarm win effect) and Winter (1 December – 10 January: Candy Cane tile colours and
  the Snowfall win effect). Once bought they're yours to keep all year. They're never the daily deal or
  in a mystery box.
- Prices run from 300 to 3,000 coins. Classic tiles are free. Buying takes two taps and switches the item on.
- **Mystery box** (600 coins): a random item you don't own yet. It can be anything in the shop except
  limited-time items, so it may be worth far more than it costs.
- **Streak freeze** (250 coins, hold up to 2): if you miss a Daily Challenge, a freeze covers that day
  automatically and your streak carries on. One freeze per missed day; if you miss more days than you
  have freezes, none are used and the streak resets as usual. A lost Daily still ends a streak.
- **Gifts:** from a friend's card on the Friends page, or from the shop's "Send coins" button, send them
  any amount from 10 to 5,000 coins (quick picks 50 to 2,500), or buy them
  any item on sale at its full price. They get a gift card to open. If they already own the item,
  they get its price in coins instead. Each gift opens once, even with several devices.
- Reduce motion (or the system setting) stills animated tiles, keys and frames and turns win effects off.
- One item a day is today's deal at 30% off (the same for everyone; changes at 00:00 UTC).
- With cloud save, coins add up across devices like XP, and purchases and freezes follow your account.

## Levels and achievements

- XP per game: a win earns 50 + 15 × (6 − guesses), +25 in hard mode, +40 for the Daily Challenge,
  −20 per hint (minimum 15). A loss earns 10. A Blitz run earns 10 + 25 per word.
- Level *n* starts at 20 × n × (n − 1) + 60 × (n − 1) XP (level 2 at 100, level 3 at 240, level 100 at
  about 204,000), so each level costs 40 XP more than the one before.
- Each finished game is counted once by its id, so refreshes never award XP twice.
- 42 achievements, including Word Swap ones, Tower, Bot Duel, Reverse and Fibber ones, Word Ladder and rank ones, Duo, Quad, Survival, mods, Daily Rush and daily-quest ones (first win, solving in 1/2/6 guesses, streaks of 3/7/30, hard mode, under 60 s,
  Practice and total wins, Blitz scores, level 5). Solve time runs from the first letter typed.

## Statistics

Daily and Practice statistics are stored separately and have the same shape:

- **Played / wins / win %** — win % = round(wins ÷ played × 100); 0 when nothing has been played.
- **Guess distribution** — number of wins in 1…6 guesses (losses are not included).
- **Average guesses** — Σ(guesses × wins at that count) ÷ total wins, i.e. the mean over **won games
  only**. Shown as "—" before the first win.
- **Current streak** — consecutive wins. For Daily, a win continues the streak only if the previous
  win was on the immediately preceding challenge day. A loss resets it to 0, and if neither today's
  nor yesterday's challenge was won the displayed streak is 0 (a missed day breaks it).
- **Best streak** — the highest current streak reached.
- **Last completed** (Daily) — the most recent finished challenge and its result.

Each result is recorded exactly once: results carry an increasing key (daily: `dayIndex`; practice:
game number) and anything at or below the last recorded key is ignored. Unfinished games are never
counted.

## Sharing

The shared text contains the brand, `#<challenge>` or `Practice`, the score (`n/6`, or `X/6` for a
loss; `*` for hard mode), one emoji row per submitted guess, and the site URL. It never contains the
answer or any letters.
