/**
 * Word Swap: two friends take turns. One picks a word, the other guesses it
 * (and the picker can watch live); then the roles swap. Points per round:
 * the guesser scores 7 − guesses for a solve (6 for a first-guess solve,
 * 1 on the last guess); if the guesser fails, the picker scores 3 for
 * stumping them.
 */
import { evaluateGuess } from './evaluate';
import type { LetterState } from './types';
import { seededRandom } from './blitz';

export const SWAP = { maxGuesses: 6, stumpPoints: 3, historyLimit: 30 } as const;

export type SwapState = 'picking' | 'guessing';

export interface SwapRoundResult {
  round: number;
  setter: string;
  guesser: string;
  word: string;
  /** Number of guesses used. */
  guesses: number;
  solved: boolean;
  /** Who scored, and how much. */
  scorer: string;
  points: number;
}

export interface SwapDoc {
  players: [string, string];
  createdAt: number;
  updatedAt: number;
  /** The round being played (1-based). */
  round: number;
  scores: Record<string, number>;
  setter: string;
  guesser: string;
  state: SwapState;
  /** The picked word (null while picking). */
  word: string | null;
  /** The guesser's submitted guesses this round. */
  guesses: string[];
  /** What the guesser is typing right now, for spectators. */
  live: string;
  /** Completed rounds, newest last. */
  history: SwapRoundResult[];
  nudge: { by: string; at: number } | null;
}

export type Swap = SwapDoc & { id: string };

/** Points for a finished round. */
export function roundPoints(solved: boolean, guesses: number): number {
  return solved ? SWAP.maxGuesses + 1 - guesses : SWAP.stumpPoints;
}

/** The finished round's result and the next round's fields. */
export function finishRound(s: SwapDoc, now: number): Pick<
  SwapDoc,
  'round' | 'scores' | 'setter' | 'guesser' | 'state' | 'word' | 'guesses' | 'live' | 'history' | 'nudge' | 'updatedAt'
> {
  const solved = s.word !== null && s.guesses.includes(s.word);
  const scorer = solved ? s.guesser : s.setter;
  const points = roundPoints(solved, s.guesses.length);
  const result: SwapRoundResult = {
    round: s.round,
    setter: s.setter,
    guesser: s.guesser,
    word: s.word ?? '',
    guesses: s.guesses.length,
    solved,
    scorer,
    points,
  };
  return {
    round: s.round + 1,
    scores: { ...s.scores, [scorer]: (s.scores[scorer] ?? 0) + points },
    setter: s.guesser,
    guesser: s.setter,
    state: 'picking',
    word: null,
    guesses: [],
    live: '',
    history: [...s.history, result].slice(-SWAP.historyLimit),
    nudge: null,
    updatedAt: now,
  };
}

/** True once the guesser has solved the word or used every guess. */
export const roundOver = (s: Pick<SwapDoc, 'word' | 'guesses'>) =>
  s.word !== null && (s.guesses.includes(s.word) || s.guesses.length >= SWAP.maxGuesses);

export type SwapTurn = 'pick' | 'guess' | 'wait-pick' | 'watch';

/** What `me` should be doing right now. */
export function swapTurn(s: Pick<SwapDoc, 'state' | 'setter' | 'guesser'>, me: string): SwapTurn {
  if (s.state === 'picking') return s.setter === me ? 'pick' : 'wait-pick';
  return s.guesser === me ? 'guess' : 'watch';
}

/** Whose move it is (for badges and nudges). */
export const swapWaitingOn = (s: Pick<SwapDoc, 'state' | 'setter' | 'guesser'>) => (s.state === 'picking' ? s.setter : s.guesser);

/** The leader's uid, or null when level. */
export function swapLeader(s: Pick<SwapDoc, 'scores' | 'players'>): string | null {
  const [a, b] = s.players;
  const sa = s.scores[a] ?? 0;
  const sb = s.scores[b] ?? 0;
  return sa === sb ? null : sa > sb ? a : b;
}

/** The colours of each guess against the word (for the guesser and spectators). */
export const swapRows = (s: Pick<SwapDoc, 'word' | 'guesses'>): LetterState[][] =>
  s.word ? s.guesses.map((g) => evaluateGuess(g, s.word!)) : [];

/** Nudges are allowed once a minute per person. */
export const NUDGE_COOLDOWN_MS = 60_000;
export const canNudge = (s: Pick<SwapDoc, 'nudge'>, me: string, now: number) =>
  !s.nudge || s.nudge.by !== me || now - s.nudge.at >= NUDGE_COOLDOWN_MS;

/** How many words the picker chooses between each round. */
export const SWAP_CHOICES = 3;

function hashId(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * The words the picker chooses from this round: the same on every device and
 * after a refresh (so there's no rerolling), and never a word already played
 * in this match.
 */
export function swapChoices(s: Pick<Swap, 'id' | 'round' | 'history'>, answers: readonly string[], count = SWAP_CHOICES): string[] {
  const used = new Set(s.history.map((h) => h.word));
  const pool = answers.filter((w) => !used.has(w));
  const rand = seededRandom(hashId(s.id) + s.round * 7919);
  const out: string[] = [];
  while (out.length < Math.min(count, pool.length)) {
    const w = pool[Math.floor(rand() * pool.length)]!;
    if (!out.includes(w)) out.push(w);
  }
  return out;
}

/** Letters from most to least common in five-letter English words. */
const LETTER_ORDER = 'earotlisncuydhpmgbfkwvzxqj';

export type WordDifficulty = 'easy' | 'medium' | 'tricky';

/** A rough guess at how hard a word is to find: rarer letters and repeats make it harder. */
export function wordDifficulty(word: string): WordDifficulty {
  const letters = [...word];
  const avg = letters.reduce((sum, l) => sum + Math.max(0, LETTER_ORDER.indexOf(l)), 0) / letters.length;
  const repeats = letters.length - new Set(letters).size;
  const score = avg + repeats * 3;
  return score < 7 ? 'easy' : score < 10 ? 'medium' : 'tricky';
}
