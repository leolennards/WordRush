import { useCallback, useEffect, useReducer } from 'react';
import { GAME, TIMING } from '@/config/game';
import type { GameState } from '@/engine';
import { useServices } from '@/app/services';
import { useSettings } from '@/features/settings/SettingsContext';
import { initSession, sessionReducer, type SessionState } from './sessionReducer';

export const RULES = { wordLength: GAME.wordLength, maxGuesses: GAME.maxGuesses } as const;

/** Total time for a row reveal (last tile's delay + its flip). */
export function revealDuration(reducedMotion: boolean): number {
  return reducedMotion ? 0 : TIMING.flipStagger * (GAME.wordLength - 1) + TIMING.flipDuration;
}

export interface GameSession {
  session: SessionState;
  type: (letter: string) => void;
  remove: () => void;
  submit: () => void;
  replace: (game: GameState) => void;
  ackComplete: () => void;
}

/**
 * Shared React binding for a single game (daily or practice). Persistence and
 * stats recording are delegated to the mode-specific hooks via callbacks.
 */
export function useGameSession(params: {
  initialGame: () => GameState;
  persist: (game: GameState) => void;
  onFinished: (game: GameState) => void;
}): GameSession {
  const { dictionary } = useServices();
  const { settings, reducedMotion } = useSettings();
  const { persist, onFinished } = params;
  const [session, dispatch] = useReducer(sessionReducer, undefined, () => initSession(params.initialGame()));
  const { game, revealingRow } = session;

  useEffect(() => {
    persist(game);
    if (game.status !== 'playing') onFinished(game);
  }, [game, persist, onFinished]);

  // Unlock input once the reveal animation has finished.
  useEffect(() => {
    if (revealingRow === null) return;
    const t = window.setTimeout(() => dispatch({ type: 'reveal-done' }), revealDuration(reducedMotion));
    return () => window.clearTimeout(t);
  }, [revealingRow, reducedMotion]);

  // Keep the current game's hard mode in sync with the setting while allowed.
  useEffect(() => {
    dispatch({ type: 'set-hard-mode', enabled: settings.hardMode });
  }, [settings.hardMode, game.id]);

  const type = useCallback((letter: string) => dispatch({ type: 'type', letter, wordLength: GAME.wordLength }), []);
  const remove = useCallback(() => dispatch({ type: 'delete' }), []);
  const submit = useCallback(
    () => dispatch({ type: 'submit', dictionary, rules: RULES, animate: !reducedMotion }),
    [dictionary, reducedMotion],
  );
  const replace = useCallback((g: GameState) => dispatch({ type: 'replace', game: g }), []);
  const ackComplete = useCallback(() => dispatch({ type: 'ack-complete' }), []);

  return { session, type, remove, submit, replace, ackComplete };
}
