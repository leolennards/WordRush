/**
 * Duo and Quad: several hidden words solved at once. Every guess is checked
 * against each unsolved word; a word's board stops once it is solved.
 * Pure and serialisable.
 */
import { evaluateGuess, letterStatesFor } from './evaluate';
import { normalizeWord } from './dictionary';
import type { Dictionary, GameState, GameStatus, GuessError, LetterState } from './types';

export type MultiMode = 'duo' | 'quad';

export const MULTI: Record<MultiMode, { name: string; words: number; maxGuesses: number }> = {
  duo: { name: 'Duo', words: 2, maxGuesses: 7 },
  quad: { name: 'Quad', words: 4, maxGuesses: 9 },
};

export interface MultiState {
  id: string;
  answers: string[];
  guesses: string[];
  /** Per word: one row per guess made while that word was unsolved. */
  evaluations: LetterState[][][];
  status: GameStatus;
  maxGuesses: number;
}

export function createMulti(id: string, answers: string[], maxGuesses: number): MultiState {
  return {
    id,
    answers: answers.map(normalizeWord),
    guesses: [],
    evaluations: answers.map(() => []),
    status: 'playing',
    maxGuesses,
  };
}

/** True once word `k` has been guessed. */
export const multiSolved = (s: MultiState, k: number) =>
  s.guesses.slice(0, s.evaluations[k]?.length ?? 0).includes(s.answers[k]!);

export const multiSolvedCount = (s: MultiState) => s.answers.filter((_, k) => multiSolved(s, k)).length;

export type MultiResult = { ok: true; state: MultiState } | { ok: false; error: GuessError };

export function submitMulti(state: MultiState, raw: string, dictionary: Dictionary, wordLength = 5): MultiResult {
  if (state.status !== 'playing') return { ok: false, error: { kind: 'game-over' } };
  const guess = normalizeWord(raw);
  if (guess.length !== wordLength) return { ok: false, error: { kind: 'incomplete' } };
  if (!dictionary.isAccepted(guess)) return { ok: false, error: { kind: 'not-in-list' } };

  const evaluations = state.evaluations.map((rows, k) =>
    multiSolved(state, k) ? rows : [...rows, evaluateGuess(guess, state.answers[k]!)],
  );
  const next: MultiState = { ...state, guesses: [...state.guesses, guess], evaluations };
  const won = next.answers.every((_, k) => multiSolved(next, k));
  next.status = won ? 'won' : next.guesses.length >= next.maxGuesses ? 'lost' : 'playing';
  return { ok: true, state: next };
}

/** One word's board as a regular game, for rendering with the shared Board. */
export function multiBoard(s: MultiState, k: number): GameState {
  const rows = s.evaluations[k]!.length;
  return {
    mode: 'practice',
    id: `${s.id}-${k}`,
    answer: s.answers[k]!,
    guesses: s.guesses.slice(0, rows),
    evaluations: s.evaluations[k]!,
    status: multiSolved(s, k) ? 'won' : s.status === 'lost' ? 'lost' : 'playing',
    hardMode: false,
    dayIndex: null,
  };
}

/** Keyboard colours per word, in word order. Solved words leave their part blank. */
export function multiKeyStates(s: MultiState): Record<string, (LetterState | undefined)[]> {
  const perWord = s.answers.map((_, k) => (multiSolved(s, k) ? {} : letterStatesFor(s.guesses, s.evaluations[k]!)));
  const out: Record<string, (LetterState | undefined)[]> = {};
  for (const l of new Set(perWord.flatMap((m) => Object.keys(m)))) out[l] = perWord.map((m) => m[l]);
  return out;
}
