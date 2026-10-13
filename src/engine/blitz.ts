/** Blitz: solve as many words as possible before the clock runs out. */
export const BLITZ = {
  /** Starting time on the clock. */
  startMs: 90_000,
  /** Added for every word solved. */
  bonusMs: 15_000,
  /** Removed when a word is missed. */
  penaltyMs: 10_000,
} as const;

export interface BlitzRun {
  startedAt: number;
  /** When the clock hits zero (moves with bonuses and penalties). */
  endsAt: number;
  solved: number;
  missed: number;
  words: { answer: string; won: boolean; guesses: number }[];
}

export function startBlitz(now: number): BlitzRun {
  return { startedAt: now, endsAt: now + BLITZ.startMs, solved: 0, missed: 0, words: [] };
}

/** Pure: records a finished word and adjusts the clock. */
export function finishBlitzWord(run: BlitzRun, word: { answer: string; won: boolean; guesses: number }): BlitzRun {
  return {
    ...run,
    endsAt: run.endsAt + (word.won ? BLITZ.bonusMs : -BLITZ.penaltyMs),
    solved: run.solved + (word.won ? 1 : 0),
    missed: run.missed + (word.won ? 0 : 1),
    words: [...run.words, word],
  };
}

export const blitzRemaining = (run: BlitzRun, now: number) => Math.max(0, run.endsAt - now);

/** "1:05" style clock. */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Deterministic random numbers in [0, 1) from a seed (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Daily Rush uses the same word order for everyone on a given day. */
export const rushSeed = (day: number) => day * 7919 + 104729;
