import { useCallback, useEffect, useMemo, useRef } from 'react';
import { GAME, TIMING } from '@/config/game';
import { letterStatesFor } from '@/engine';
import { useSettings } from '@/features/settings/SettingsContext';
import { useToast } from '@/components/layout/Toasts';
import { usePhysicalKeyboard } from '@/hooks/usePhysicalKeyboard';
import { playCue } from '@/lib/audio/sound';
import { rejectionMessage } from './sessionReducer';
import type { GameSession } from './useGameSession';

/**
 * Everything a playable board needs besides rendering: keyboard input,
 * sounds, rejection toasts, screen-reader announcements and the end-of-game
 * hand-off. Shared by Daily, Practice, Challenge and Race screens.
 */
export function useGameScreen(
  active: GameSession,
  opts: {
    inputEnabled: boolean;
    /** Called once, shortly after a game finishes during this session. */
    onCompleted?: () => void;
    /** Toast to show on a loss (defaults to revealing the answer). */
    lossToast?: string | null;
  },
) {
  const { settings, reducedMotion } = useSettings();
  const { toast, announce } = useToast();
  const { game, input, revealingRow, rejection, justCompleted } = active.session;

  const sound = useCallback(
    (cue: Parameters<typeof playCue>[0]) => {
      if (settings.sound) playCue(cue);
    },
    [settings.sound],
  );

  // ----- Input -----
  const onLetter = useCallback(
    (l: string) => {
      if (game.status === 'playing' && revealingRow === null && input.length < GAME.wordLength) sound('key');
      active.type(l);
    },
    [active, game.status, revealingRow, input.length, sound],
  );
  usePhysicalKeyboard({ onLetter, onDelete: active.remove, onEnter: active.submit }, opts.inputEnabled);

  // ----- Rejected guesses: toast + sound (the row shake is derived below) -----
  const lastRejection = useRef(rejection?.nonce ?? 0);
  useEffect(() => {
    if (!rejection || rejection.nonce === lastRejection.current) return;
    lastRejection.current = rejection.nonce;
    if (rejection.error.kind === 'game-over') return;
    toast(rejectionMessage(rejection.error));
    sound('invalid');
  }, [rejection, toast, sound]);

  // ----- Announce each revealed row for screen readers -----
  const announcedRows = useRef<string>('');
  useEffect(() => {
    if (revealingRow !== null) {
      sound('reveal');
      return;
    }
    const row = game.guesses.length - 1;
    const tag = `${game.id}:${row}`;
    if (row < 0 || announcedRows.current === tag) return;
    const first = announcedRows.current === '' || !announcedRows.current.startsWith(`${game.id}:`);
    announcedRows.current = tag;
    if (first) return; // don't announce restored rows on load
    const evaluation = game.evaluations[row]!;
    const words = { correct: 'correct', present: 'in the word', absent: 'not in the word' } as const;
    announce(
      `Guess ${row + 1}: ${[...game.guesses[row]!].map((l, i) => `${l.toUpperCase()} ${words[evaluation[i]!]}`).join(', ')}`,
    );
  }, [revealingRow, game, announce, sound]);

  // ----- Completion -----
  // Depends only on primitives and stable callbacks: clocks re-render screens
  // every second, and the timer must not restart on each tick.
  const onCompletedRef = useRef(opts.onCompleted);
  useEffect(() => {
    onCompletedRef.current = opts.onCompleted;
  });
  const { ackComplete } = active;
  const won = game.status === 'won';
  const lossToast = opts.lossToast === undefined ? game.answer.toUpperCase() : opts.lossToast;
  const completionReady = justCompleted && revealingRow === null;
  useEffect(() => {
    if (!completionReady) return;
    sound(won ? 'win' : 'lose');
    if (won) toast('Solved!', { tone: 'success', duration: 2200 });
    else if (lossToast) toast(lossToast, { duration: 2200 });
    const t = window.setTimeout(
      () => {
        ackComplete();
        onCompletedRef.current?.();
      },
      reducedMotion ? 300 : TIMING.resultDelay + (won ? 500 : 0),
    );
    return () => window.clearTimeout(t);
  }, [completionReady, won, lossToast, ackComplete, sound, toast, reducedMotion]);

  // ----- Derived presentation state -----
  const shakeKey =
    rejection && rejection.error.kind !== 'game-over' && rejection.row === game.guesses.length ? rejection.nonce : 0;
  const celebrating = justCompleted && revealingRow === null && game.status === 'won';
  const letterStates = useMemo(() => letterStatesFor(game.guesses, game.evaluations), [game.guesses, game.evaluations]);

  return { onLetter, shakeKey, celebrating, letterStates };
}
