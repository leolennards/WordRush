/**
 * Pure statistics logic shared by Daily and Practice modes.
 *
 * Each completed game has a monotonically increasing `key`:
 *   - Daily: the challenge's dayIndex.
 *   - Practice: the practice game number.
 * A result is recorded only if its key is greater than the last recorded key,
 * which makes recording idempotent (no double counting on refresh, React
 * StrictMode double effects, or multiple tabs replaying the same result).
 *
 * A streak continues only when a win's key immediately follows the previous
 * win's key, so a missed daily challenge (a gap in dayIndex) breaks it.
 */
export interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** distribution[i] = wins in i + 1 guesses. */
  distribution: number[];
  lastRecordedKey: number | null;
  lastWonKey: number | null;
  /** Summary of the most recently completed game. */
  lastResult: { key: number; won: boolean; guesses: number } | null;
}

export function emptyStats(maxGuesses: number): Stats {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: new Array<number>(maxGuesses).fill(0),
    lastRecordedKey: null,
    lastWonKey: null,
    lastResult: null,
  };
}

export interface GameResult {
  key: number;
  won: boolean;
  /** Number of guesses submitted (1..maxGuesses). */
  guesses: number;
}

export function recordResult(stats: Stats, result: GameResult): Stats {
  if (stats.lastRecordedKey !== null && result.key <= stats.lastRecordedKey) return stats;

  const distribution = [...stats.distribution];
  let currentStreak = 0;
  if (result.won) {
    const slot = result.guesses - 1;
    if (slot >= 0 && slot < distribution.length) distribution[slot] = (distribution[slot] ?? 0) + 1;
    currentStreak = stats.lastWonKey === result.key - 1 ? stats.currentStreak + 1 : 1;
  }

  return {
    played: stats.played + 1,
    wins: stats.wins + (result.won ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    distribution,
    lastRecordedKey: result.key,
    lastWonKey: result.won ? result.key : stats.lastWonKey,
    lastResult: { key: result.key, won: result.won, guesses: result.guesses },
  };
}

/**
 * The streak to display. For Daily, pass today's dayIndex: if neither today's
 * nor yesterday's challenge was won, the streak has lapsed even though no loss
 * was recorded.
 */
export function effectiveStreak(stats: Stats, currentKey?: number): number {
  if (currentKey === undefined) return stats.currentStreak;
  if (stats.lastWonKey === null || stats.lastWonKey < currentKey - 1) return 0;
  return stats.currentStreak;
}

/** Whole-number percentage of games won (0 when nothing has been played). */
export function winPercentage(stats: Stats): number {
  return stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100);
}

/**
 * Mean number of guesses across WON games only (losses are excluded because
 * they have no guess count to the solution). Null when there are no wins.
 */
export function averageGuesses(stats: Stats): number | null {
  const wins = stats.distribution.reduce((a, b) => a + b, 0);
  if (wins === 0) return null;
  const total = stats.distribution.reduce((sum, count, i) => sum + count * (i + 1), 0);
  return total / wins;
}
