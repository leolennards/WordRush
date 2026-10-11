import { evaluateGuess } from './evaluate';
import { hardModeViolation } from './hardMode';
import { normalizeWord } from './dictionary';
import type { Dictionary, GameMode, GameState, SubmitResult } from './types';

export interface GameRules {
  wordLength: number;
  maxGuesses: number;
}

export function createGame(params: {
  mode: GameMode;
  id: string;
  answer: string;
  hardMode?: boolean;
  dayIndex?: number | null;
}): GameState {
  return {
    mode: params.mode,
    id: params.id,
    answer: normalizeWord(params.answer),
    guesses: [],
    evaluations: [],
    status: 'playing',
    hardMode: params.hardMode ?? false,
    dayIndex: params.dayIndex ?? null,
  };
}

/** Pure: validates and applies a guess, returning a new state or an error. */
export function submitGuess(
  state: GameState,
  rawGuess: string,
  dictionary: Dictionary,
  rules: GameRules,
): SubmitResult {
  if (state.status !== 'playing') return { ok: false, error: { kind: 'game-over' } };

  const guess = normalizeWord(rawGuess);
  if (guess.length !== rules.wordLength) return { ok: false, error: { kind: 'incomplete' } };
  if (!dictionary.isAccepted(guess)) return { ok: false, error: { kind: 'not-in-list' } };

  if (state.hardMode) {
    const message = hardModeViolation(guess, state.guesses, state.evaluations);
    if (message) return { ok: false, error: { kind: 'hard-mode', message } };
  }

  const evaluation = evaluateGuess(guess, state.answer);
  const guesses = [...state.guesses, guess];
  const won = guess === state.answer;
  const status = won ? 'won' : guesses.length >= rules.maxGuesses ? 'lost' : 'playing';

  return {
    ok: true,
    evaluation,
    state: { ...state, guesses, evaluations: [...state.evaluations, evaluation], status },
  };
}

/** Hard mode may only be toggled before the first guess of a game. */
export function canToggleHardMode(state: GameState): boolean {
  return state.status === 'playing' && state.guesses.length === 0;
}
