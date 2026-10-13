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

## Survival

- Solve word after word. You start with 3 lives (the most you can hold).
- A missed word costs a life; solving in 3 guesses or fewer wins a life back. The run ends at 0 lives.
- Each word is counted once, and the run is saved after every guess. A run earns 10 + 30 per word solved.

## Daily quests

- Three quests per UTC day, picked from a pool by a seeded shuffle, so everyone gets the same ones.
- Progress comes from finished games of any mode; each completed quest is worth 60 bonus XP.
- Quests reset with the Daily Challenge at 00:00 UTC.

## Levels and achievements

- XP per game: a win earns 50 + 15 × (6 − guesses), +25 in hard mode, +40 for the Daily Challenge,
  −20 per hint (minimum 15). A loss earns 10. A Blitz run earns 10 + 25 per word.
- Level *n* starts at 50 × n × (n − 1) XP (level 2 at 100, level 3 at 300, …).
- Each finished game is counted once by its id, so refreshes never award XP twice.
- 23 achievements, including Duo, Survival and daily-quest ones (first win, solving in 1/2/6 guesses, streaks of 3/7/30, hard mode, under 60 s,
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
