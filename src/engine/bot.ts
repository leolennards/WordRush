/**
 * A Wordle-playing bot for Bot Duel. It keeps the answers consistent with
 * its own feedback and picks one; difficulty sets its speed and how sloppy
 * its early guesses are.
 */
import { evaluateGuess } from './evaluate';
import type { LetterState } from './types';

export type BotLevel = 'easy' | 'medium' | 'hard';

export interface BotProfile {
  level: BotLevel;
  name: string;
  /** Seconds between guesses: [min, max]. */
  pace: [number, number];
  /** Chance of an off-target guess in the first rows. */
  sloppy: number;
  tagline: string;
}

export const BOTS: Record<BotLevel, BotProfile> = {
  easy: { level: 'easy', name: 'Pip', pace: [13, 18], sloppy: 0.45, tagline: 'Friendly and a bit slow.' },
  medium: { level: 'medium', name: 'Byte', pace: [9, 13], sloppy: 0.15, tagline: 'Quick and clever.' },
  hard: { level: 'hard', name: 'Oracle', pace: [6, 9], sloppy: 0, tagline: 'Fast. Ruthless. Rarely wrong.' },
};

const OPENERS = ['crane', 'slate', 'trace', 'stare', 'raise', 'arise', 'crate', 'least', 'saint', 'roast'];

const same = (a: readonly LetterState[], b: readonly LetterState[]) => a.every((s, i) => s === b[i]);

/** Answers still possible after the bot's guesses so far. */
export function botCandidates(
  answers: readonly string[],
  guesses: readonly string[],
  evaluations: readonly (readonly LetterState[])[],
): string[] {
  return answers.filter((w) => guesses.every((g, i) => same(evaluateGuess(g, w), evaluations[i]!)));
}

/** The bot's next guess. */
export function botGuess(
  profile: BotProfile,
  answers: readonly string[],
  guesses: readonly string[],
  evaluations: readonly (readonly LetterState[])[],
  random: () => number,
): string {
  if (guesses.length === 0) {
    const openers = OPENERS.filter((w) => answers.includes(w));
    if (openers.length) return openers[Math.floor(random() * openers.length)]!;
  }
  const sloppyRow = guesses.length < 3 && random() < profile.sloppy;
  const pool = sloppyRow ? answers.filter((w) => !guesses.includes(w)) : botCandidates(answers, guesses, evaluations);
  const from = pool.length ? pool : answers;
  return from[Math.floor(random() * from.length)]!;
}

/** Milliseconds until the bot's next guess. */
export const botDelay = (profile: BotProfile, random: () => number) =>
  Math.round((profile.pace[0] + random() * (profile.pace[1] - profile.pace[0])) * 1000);

/** A short line from the bot after a guess. */
export function botLine(evaluation: readonly LetterState[], won: boolean, random: () => number): string {
  if (won) return ['Got it!', 'Too easy.', 'Beep boop, solved.'][Math.floor(random() * 3)]!;
  const greens = evaluation.filter((s) => s === 'correct').length;
  const yellows = evaluation.filter((s) => s === 'present').length;
  if (greens >= 3) return ['Closing in…', 'Almost there.', 'I can taste it.'][Math.floor(random() * 3)]!;
  if (greens + yellows >= 2) return ['Interesting…', 'Getting warmer.', 'Hmm, okay.'][Math.floor(random() * 3)]!;
  return ['Hmm.', 'That told me a lot.', 'Recalculating…'][Math.floor(random() * 3)]!;
}
