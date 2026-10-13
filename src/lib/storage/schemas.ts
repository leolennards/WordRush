import { GAME, STORAGE_PREFIX } from '@/config/game';
import { MODS, type GameState, type LetterState, type Mod } from '@/engine/types';
import type { Stats } from '@/engine/stats';
import { emptyProgress, type Progress } from '@/engine/progress';
import type { QuestState } from '@/engine/quests';
import { SKINS, type SkinId } from '@/engine/ranks';
import type { SurvivalRun } from '@/engine/survival';
import type { MultiState } from '@/engine/multi';
import type { LadderState } from '@/engine/ladder';
import { isRecord, type Schema } from './versioned';

export const KEYS = {
  settings: `${STORAGE_PREFIX}:settings`,
  daily: `${STORAGE_PREFIX}:daily`,
  practice: `${STORAGE_PREFIX}:practice`,
  dailyStats: `${STORAGE_PREFIX}:stats:daily`,
  practiceStats: `${STORAGE_PREFIX}:stats:practice`,
  progress: `${STORAGE_PREFIX}:progress`,
  duo: `${STORAGE_PREFIX}:duo`,
  quad: `${STORAGE_PREFIX}:quad`,
  rush: `${STORAGE_PREFIX}:rush`,
  ladder: `${STORAGE_PREFIX}:ladder`,
  wordbook: `${STORAGE_PREFIX}:wordbook`,
  survival: `${STORAGE_PREFIX}:survival`,
  timers: `${STORAGE_PREFIX}:timers`,
} as const;

// ---------- Settings ----------

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemePreference;
  sound: boolean;
  highContrast: boolean;
  /** Force reduced motion even if the OS does not request it. */
  reduceMotion: boolean;
  hardMode: boolean;
  /** Short vibrations on supported phones. */
  haptics: boolean;
  /** Practice mods. */
  modFog: boolean;
  modBlind: boolean;
  /** Tile theme (unlocked by rank). */
  skin: SkinId;
  /** Whether the first-visit help has been shown. */
  seenHelp: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  sound: false,
  highContrast: false,
  reduceMotion: false,
  hardMode: false,
  haptics: true,
  modFog: false,
  modBlind: false,
  skin: 'classic',
  seenHelp: false,
};

export const settingsSchema: Schema<Settings> = {
  version: 1,
  validate(d) {
    if (!isRecord(d)) return null;
    // Field-by-field with defaults so one bad field doesn't discard the rest.
    const bool = (k: keyof Settings) =>
      typeof d[k] === 'boolean' ? (d[k] as boolean) : (DEFAULT_SETTINGS[k] as boolean);
    return {
      theme: d.theme === 'light' || d.theme === 'dark' || d.theme === 'system' ? d.theme : 'system',
      sound: bool('sound'),
      highContrast: bool('highContrast'),
      reduceMotion: bool('reduceMotion'),
      hardMode: bool('hardMode'),
      haptics: bool('haptics'),
      modFog: bool('modFog'),
      modBlind: bool('modBlind'),
      skin: SKINS.some((x) => x.id === d.skin) ? (d.skin as SkinId) : 'classic',
      seenHelp: bool('seenHelp'),
    };
  },
};

// ---------- Game sessions ----------

const LETTER_STATES: readonly LetterState[] = ['correct', 'present', 'absent'];
const WORD = new RegExp(`^[a-z]{${GAME.wordLength}}$`);

export function validateGameState(d: unknown): GameState | null {
  if (!isRecord(d)) return null;
  const { mode, id, answer, guesses, evaluations, status, hardMode, dayIndex, hints, mods } = d;
  if (mode !== 'daily' && mode !== 'practice' && mode !== 'challenge' && mode !== 'race' && mode !== 'survival') return null;
  if (typeof id !== 'string' || typeof answer !== 'string' || !WORD.test(answer)) return null;
  if (!Array.isArray(guesses) || !Array.isArray(evaluations)) return null;
  if (guesses.length > GAME.maxGuesses || guesses.length !== evaluations.length) return null;
  if (!guesses.every((g) => typeof g === 'string' && WORD.test(g))) return null;
  if (
    !evaluations.every(
      (row) =>
        Array.isArray(row) &&
        row.length === GAME.wordLength &&
        row.every((s) => LETTER_STATES.includes(s as LetterState)),
    )
  )
    return null;
  if (status !== 'playing' && status !== 'won' && status !== 'lost') return null;
  if (typeof hardMode !== 'boolean') return null;
  if (!(dayIndex === null || (typeof dayIndex === 'number' && Number.isInteger(dayIndex)))) return null;
  // Consistency: status must agree with the guesses.
  const won = guesses.at(-1) === answer;
  const expected = won ? 'won' : guesses.length >= GAME.maxGuesses ? 'lost' : 'playing';
  if (status !== expected) return null;
  if (
    hints !== undefined &&
    !(Array.isArray(hints) && hints.every((h) => Number.isInteger(h) && h >= 0 && h < GAME.wordLength))
  )
    return null;
  return {
    mode,
    id,
    answer,
    guesses: guesses as string[],
    evaluations: evaluations as LetterState[][],
    status,
    hardMode,
    dayIndex: dayIndex as number | null,
    ...(hints !== undefined ? { hints: hints as number[] } : {}),
    ...(Array.isArray(mods) ? { mods: mods.filter((x): x is Mod => MODS.includes(x as Mod)) } : {}),
  };
}

export interface DailySession {
  game: GameState;
}

export const dailySchema: Schema<DailySession> = {
  version: 1,
  validate(d) {
    if (!isRecord(d)) return null;
    const game = validateGameState(d.game);
    if (!game || game.mode !== 'daily' || game.dayIndex === null) return null;
    return { game };
  },
};

export interface PracticeSession {
  game: GameState | null;
  /** Number of practice games started so far; used as the stats key. */
  gameNumber: number;
  recent: string[];
}

export const practiceSchema: Schema<PracticeSession> = {
  version: 1,
  validate(d) {
    if (!isRecord(d)) return null;
    const game = d.game === null ? null : validateGameState(d.game);
    if (d.game !== null && (!game || game.mode !== 'practice' || !/^practice-\d+$/.test(game.id))) return null;
    if (typeof d.gameNumber !== 'number' || !Number.isInteger(d.gameNumber) || d.gameNumber < 0) return null;
    const recent = Array.isArray(d.recent) ? d.recent.filter((w): w is string => typeof w === 'string') : [];
    return { game, gameNumber: d.gameNumber, recent };
  },
};

// ---------- Statistics ----------

const nonNegInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0;
const intOrNull = (x: unknown): x is number | null => x === null || (typeof x === 'number' && Number.isInteger(x));

export const statsSchema: Schema<Stats> = {
  version: 1,
  validate(d) {
    if (!isRecord(d)) return null;
    const { played, wins, currentStreak, maxStreak, distribution, lastRecordedKey, lastWonKey, lastResult } = d;
    if (![played, wins, currentStreak, maxStreak].every(nonNegInt)) return null;
    if (!Array.isArray(distribution) || distribution.length !== GAME.maxGuesses || !distribution.every(nonNegInt))
      return null;
    if (!intOrNull(lastRecordedKey) || !intOrNull(lastWonKey)) return null;
    if ((wins as number) > (played as number)) return null;
    let last: Stats['lastResult'] = null;
    if (lastResult !== null && lastResult !== undefined) {
      if (!isRecord(lastResult) || typeof lastResult.won !== 'boolean') return null;
      if (!Number.isInteger(lastResult.key) || !nonNegInt(lastResult.guesses)) return null;
      last = { key: lastResult.key as number, won: lastResult.won, guesses: lastResult.guesses };
    }
    return {
      played: played as number,
      wins: wins as number,
      currentStreak: currentStreak as number,
      maxStreak: maxStreak as number,
      distribution: distribution as number[],
      lastRecordedKey,
      lastWonKey,
      lastResult: last,
    };
  },
};

/** A saved challenge or race game on this device, keyed by its id. */
export const friendGameSchema: Schema<{ game: GameState }> = {
  version: 1,
  validate(d) {
    if (!isRecord(d)) return null;
    const game = validateGameState(d.game);
    if (!game || (game.mode !== 'challenge' && game.mode !== 'race')) return null;
    return { game };
  },
};

export const friendGameKey = (mode: 'challenge' | 'race', id: string) => `${STORAGE_PREFIX}:${mode}:${id}`;

// ---------- Levels & achievements ----------

function validateQuests(q: unknown): QuestState | null {
  if (!isRecord(q) || !Number.isInteger(q.day) || !isRecord(q.progress)) return null;
  const progress: Record<string, number> = {};
  for (const [k, v] of Object.entries(q.progress)) if (nonNegInt(v)) progress[k] = v;
  return { day: q.day as number, progress };
}

export const progressSchema: Schema<Progress> = {
  version: 1,
  validate(d) {
    if (!isRecord(d)) return null;
    const base = emptyProgress();
    const unlocked: Record<string, number> = {};
    if (isRecord(d.unlocked)) {
      for (const [k, v] of Object.entries(d.unlocked)) if (typeof v === 'number') unlocked[k] = v;
    }
    return {
      xp: nonNegInt(d.xp) ? d.xp : base.xp,
      unlocked,
      wins: nonNegInt(d.wins) ? d.wins : 0,
      practiceWins: nonNegInt(d.practiceWins) ? d.practiceWins : 0,
      bestBlitz: nonNegInt(d.bestBlitz) ? d.bestBlitz : 0,
      bestSurvival: nonNegInt(d.bestSurvival) ? d.bestSurvival : 0,
      duoWins: nonNegInt(d.duoWins) ? d.duoWins : 0,
      quadWins: nonNegInt(d.quadWins) ? d.quadWins : 0,
      wordsPlayed: nonNegInt(d.wordsPlayed) ? d.wordsPlayed : 0,
      questsDone: nonNegInt(d.questsDone) ? d.questsDone : 0,
      quests: validateQuests(d.quests),
      applied: Array.isArray(d.applied) ? d.applied.filter((x): x is string => typeof x === 'string') : [],
    };
  },
};

/** When each recent game's first letter was typed (game id → ms), for solve times. */
export const timersSchema: Schema<Record<string, number>> = {
  version: 1,
  validate(d) {
    if (!isRecord(d)) return null;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(d)) if (typeof v === 'number') out[k] = v;
    return out;
  },
};

// ---------- Duo & Survival ----------

const isWord = (w: unknown): w is string => typeof w === 'string' && WORD.test(w);
const isRow = (row: unknown) =>
  Array.isArray(row) && row.length === GAME.wordLength && row.every((x) => LETTER_STATES.includes(x as LetterState));

export interface MultiSession {
  game: MultiState;
  /** Games started so far in this mode. */
  number: number;
}

/** Saved Duo or Quad game with `words` answers. Older saves without maxGuesses get it filled in. */
export function multiSchema(words: number, maxGuesses: number): Schema<MultiSession> {
  return {
    version: 1,
    validate(d) {
      if (!isRecord(d) || !nonNegInt(d.number) || !isRecord(d.game)) return null;
      const { id, answers, guesses, evaluations, status } = d.game;
      if (typeof id !== 'string' || !Array.isArray(answers) || answers.length !== words || !answers.every(isWord)) return null;
      if (!Array.isArray(guesses) || guesses.length > maxGuesses || !guesses.every(isWord)) return null;
      if (!Array.isArray(evaluations) || evaluations.length !== words) return null;
      if (!evaluations.every((rows) => Array.isArray(rows) && rows.length <= guesses.length && rows.every(isRow))) return null;
      if (status !== 'playing' && status !== 'won' && status !== 'lost') return null;
      return {
        number: d.number,
        game: { id, answers, guesses, evaluations: evaluations as MultiState['evaluations'], status, maxGuesses },
      };
    },
  };
}

export interface SurvivalSession {
  run: SurvivalRun;
  game: GameState;
}

export const survivalSchema: Schema<SurvivalSession> = {
  version: 1,
  validate(d) {
    if (!isRecord(d) || !isRecord(d.run)) return null;
    const game = validateGameState(d.game);
    if (!game || game.mode !== 'survival') return null;
    const { id, score, lives, words, lastWordId } = d.run;
    if (!Number.isInteger(id) || !nonNegInt(score) || !Number.isInteger(lives) || !Array.isArray(words)) return null;
    if (!(lastWordId === null || typeof lastWordId === 'string')) return null;
    const clean = words.filter(
      (w): w is SurvivalRun['words'][number] =>
        isRecord(w) && isWord(w.answer) && typeof w.won === 'boolean' && nonNegInt(w.guesses),
    );
    return { run: { id: id as number, score, lives: lives as number, words: clean, lastWordId }, game };
  },
};

// ---------- Word Book ----------

export interface WordBookEntry {
  word: string;
  /** Where it was played: daily, practice, blitz, duo, quad, survival, rush. */
  mode: string;
  won: boolean;
  /** When it was collected (ms). */
  at: number;
}

export const WORDBOOK_LIMIT = 1000;

export const wordbookSchema: Schema<WordBookEntry[]> = {
  version: 1,
  validate(d) {
    if (!Array.isArray(d)) return null;
    return d
      .filter(
        (e): e is WordBookEntry =>
          isRecord(e) && isWord(e.word) && typeof e.mode === 'string' && typeof e.won === 'boolean' && typeof e.at === 'number',
      )
      .slice(-WORDBOOK_LIMIT);
  },
};

// ---------- Daily Rush ----------

export interface RushResult {
  day: number;
  solved: number;
  words: { answer: string; won: boolean }[];
  /** False while the run is in progress (leaving ends it with this score). */
  done: boolean;
}

export const rushSchema: Schema<RushResult> = {
  version: 1,
  validate(d) {
    if (!isRecord(d) || !Number.isInteger(d.day) || !nonNegInt(d.solved) || typeof d.done !== 'boolean') return null;
    if (!Array.isArray(d.words)) return null;
    const words = d.words.filter(
      (w): w is RushResult['words'][number] => isRecord(w) && isWord(w.answer) && typeof w.won === 'boolean',
    );
    return { day: d.day as number, solved: d.solved, words, done: d.done };
  },
};

// ---------- Word Ladder ----------

export interface LadderSession {
  game: LadderState;
  /** Ladders started so far. */
  number: number;
}

export const ladderSchema: Schema<LadderSession> = {
  version: 1,
  validate(d) {
    if (!isRecord(d) || !nonNegInt(d.number) || !isRecord(d.game)) return null;
    const { id, start, target, steps, par, maxMoves, status, hints } = d.game;
    if (typeof id !== 'string' || !isWord(start) || !isWord(target)) return null;
    if (!Array.isArray(steps) || !steps.every(isWord) || !nonNegInt(par) || !nonNegInt(maxMoves) || !nonNegInt(hints)) return null;
    if (steps.length > maxMoves) return null;
    if (status !== 'playing' && status !== 'won' && status !== 'lost') return null;
    return { number: d.number, game: { id, start, target, steps, par, maxMoves, status, hints } };
  },
};
