import { GAME, STORAGE_PREFIX } from '@/config/game';
import type { GameState, LetterState } from '@/engine';
import type { Stats } from '@/engine/stats';
import { isRecord, type Schema } from './versioned';

export const KEYS = {
  settings: `${STORAGE_PREFIX}:settings`,
  daily: `${STORAGE_PREFIX}:daily`,
  practice: `${STORAGE_PREFIX}:practice`,
  dailyStats: `${STORAGE_PREFIX}:stats:daily`,
  practiceStats: `${STORAGE_PREFIX}:stats:practice`,
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
  /** Whether the first-visit help has been shown. */
  seenHelp: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  sound: false,
  highContrast: false,
  reduceMotion: false,
  hardMode: false,
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
      seenHelp: bool('seenHelp'),
    };
  },
};

// ---------- Game sessions ----------

const LETTER_STATES: readonly LetterState[] = ['correct', 'present', 'absent'];
const WORD = new RegExp(`^[a-z]{${GAME.wordLength}}$`);

export function validateGameState(d: unknown): GameState | null {
  if (!isRecord(d)) return null;
  const { mode, id, answer, guesses, evaluations, status, hardMode, dayIndex } = d;
  if (mode !== 'daily' && mode !== 'practice') return null;
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
  return {
    mode,
    id,
    answer,
    guesses: guesses as string[],
    evaluations: evaluations as LetterState[][],
    status,
    hardMode,
    dayIndex: dayIndex as number | null,
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
