import {
  applyHint,
  canToggleHardMode,
  submitGuess,
  type Dictionary,
  type GameRules,
  type GameState,
  type GuessError,
  type Mod,
} from '@/engine';

/**
 * UI-level session state wrapping the pure engine state. Everything that can
 * race (typing during the reveal animation, double Enter presses, input after
 * the game ends) is resolved here, synchronously and deterministically.
 */
export interface SessionState {
  game: GameState;
  /** Letters typed into the current row. */
  input: string;
  /** Row currently playing its reveal animation; input is locked meanwhile. */
  revealingRow: number | null;
  /** Latest rejected submission; `nonce` changes on every rejection, `row` is where it happened. */
  rejection: { error: GuessError; nonce: number; row: number } | null;
  /** Set when a submission ends the game during this session (not on restore). */
  justCompleted: boolean;
}

export type SessionAction =
  | { type: 'type'; letter: string; wordLength: number }
  | { type: 'delete' }
  | { type: 'submit'; dictionary: Dictionary; rules: GameRules; animate: boolean }
  | { type: 'reveal-done' }
  | { type: 'ack-complete' }
  | { type: 'set-hard-mode'; enabled: boolean }
  | { type: 'hint' }
  | { type: 'set-mods'; mods: Mod[] }
  | { type: 'replace'; game: GameState };

export function initSession(game: GameState): SessionState {
  return { game, input: '', revealingRow: null, rejection: null, justCompleted: false };
}

const locked = (s: SessionState) => s.game.status !== 'playing' || s.revealingRow !== null;

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'type': {
      if (locked(state) || state.input.length >= action.wordLength) return state;
      if (!/^[a-z]$/.test(action.letter)) return state;
      return { ...state, input: state.input + action.letter };
    }
    case 'delete': {
      if (locked(state) || state.input.length === 0) return state;
      return { ...state, input: state.input.slice(0, -1) };
    }
    case 'submit': {
      if (state.revealingRow !== null) return state;
      if (state.game.status !== 'playing') return state;
      const result = submitGuess(state.game, state.input, action.dictionary, action.rules);
      if (!result.ok) {
        return {
          ...state,
          rejection: {
            error: result.error,
            nonce: (state.rejection?.nonce ?? 0) + 1,
            row: state.game.guesses.length,
          },
        };
      }
      return {
        ...state,
        game: result.state,
        input: '',
        revealingRow: action.animate ? result.state.guesses.length - 1 : null,
        justCompleted: result.state.status !== 'playing',
      };
    }
    case 'reveal-done':
      return state.revealingRow === null ? state : { ...state, revealingRow: null };
    case 'ack-complete':
      return state.justCompleted ? { ...state, justCompleted: false } : state;
    case 'set-hard-mode':
      if (!canToggleHardMode(state.game) || state.game.hardMode === action.enabled) return state;
      return { ...state, game: { ...state.game, hardMode: action.enabled } };
    case 'set-mods': {
      if (!canToggleHardMode(state.game)) return state;
      const current = state.game.mods ?? [];
      if (current.length === action.mods.length && current.every((m) => action.mods.includes(m))) return state;
      return { ...state, game: { ...state.game, mods: action.mods } };
    }
    case 'hint': {
      if (locked(state)) return state;
      const game = applyHint(state.game);
      return game === state.game ? state : { ...state, game };
    }
    case 'replace':
      return initSession(action.game);
  }
}

export function rejectionMessage(error: GuessError): string {
  switch (error.kind) {
    case 'incomplete':
      return 'Not enough letters';
    case 'not-in-list':
      return 'Not in word list';
    case 'hard-mode':
      return error.message;
    case 'game-over':
      return 'This game is over';
  }
}
