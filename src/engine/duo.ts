/**
 * Duo: two hidden words solved at once. Every guess is checked against both
 * words; a word's board stops once it is solved. Pure and serialisable.
 */
import { evaluateGuess, letterStatesFor } from './evaluate';
import { normalizeWord } from './dictionary';
import type { Dictionary, GameState, GameStatus, GuessError, LetterState } from './types';

export const DUO_MAX_GUESSES = 7;

export interface DuoState {
  id: string;
  answers: [string, string];
  guesses: string[];
  /** Per word: one row per guess made while that word was unsolved. */
  evaluations: [LetterState[][], LetterState[][]];
  status: GameStatus;
}

export function createDuo(id: string, answers: [string, string]): DuoState {
  return {
    id,
    answers: [normalizeWord(answers[0]), normalizeWord(answers[1])],
    guesses: [],
    evaluations: [[], []],
    status: 'playing',
  };
}

/** True once word `k` has been guessed. */
export const duoSolved = (s: DuoState, k: 0 | 1) => s.guesses.slice(0, s.evaluations[k].length).includes(s.answers[k]);

export type DuoResult = { ok: true; state: DuoState } | { ok: false; error: GuessError };

export function submitDuo(state: DuoState, raw: string, dictionary: Dictionary, wordLength = 5): DuoResult {
  if (state.status !== 'playing') return { ok: false, error: { kind: 'game-over' } };
  const guess = normalizeWord(raw);
  if (guess.length !== wordLength) return { ok: false, error: { kind: 'incomplete' } };
  if (!dictionary.isAccepted(guess)) return { ok: false, error: { kind: 'not-in-list' } };

  const evaluations = state.evaluations.map((rows, k) =>
    duoSolved(state, k as 0 | 1) ? rows : [...rows, evaluateGuess(guess, state.answers[k as 0 | 1])],
  ) as DuoState['evaluations'];
  const guesses = [...state.guesses, guess];
  const next: DuoState = { ...state, guesses, evaluations };
  const won = duoSolved(next, 0) && duoSolved(next, 1);
  next.status = won ? 'won' : guesses.length >= DUO_MAX_GUESSES ? 'lost' : 'playing';
  return { ok: true, state: next };
}

/** One word's board as a regular game, for rendering with the shared Board. */
export function duoBoard(s: DuoState, k: 0 | 1): GameState {
  const rows = s.evaluations[k].length;
  const solved = duoSolved(s, k);
  return {
    mode: 'practice',
    id: `${s.id}-${k}`,
    answer: s.answers[k],
    guesses: s.guesses.slice(0, rows),
    evaluations: s.evaluations[k],
    status: solved ? 'won' : s.status === 'lost' ? 'lost' : 'playing',
    hardMode: false,
    dayIndex: null,
  };
}

/** Keyboard colours per word: [word 1, word 2]. Solved words leave their half blank. */
export function duoKeyStates(s: DuoState): Record<string, [LetterState | undefined, LetterState | undefined]> {
  const [a, b] = [0, 1].map((k) =>
    duoSolved(s, k as 0 | 1) ? {} : letterStatesFor(s.guesses, s.evaluations[k as 0 | 1]),
  ) as [Record<string, LetterState>, Record<string, LetterState>];
  const out: Record<string, [LetterState | undefined, LetterState | undefined]> = {};
  for (const l of new Set([...Object.keys(a), ...Object.keys(b)])) out[l] = [a[l], b[l]];
  return out;
}
