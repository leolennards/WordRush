import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createGame,
  finishSurvivalWord,
  pickPracticeAnswer,
  startSurvival,
  survivalOver,
  type GameState,
  type SurvivalRun,
} from '@/engine';
import { useServices } from '@/app/services';
import { useSettings } from '@/features/settings/SettingsContext';
import { useGameSession, type GameSession } from '@/features/game/useGameSession';
import { KEYS, survivalSchema } from '@/lib/storage/schemas';
import { readVersioned, writeVersioned } from '@/lib/storage/versioned';

export interface Survival extends GameSession {
  /** Null before the first run. */
  run: SurvivalRun | null;
  over: boolean;
  start: () => void;
  /** Call once a finished word's reveal is done; loads the next word. */
  next: () => void;
}

/**
 * Survival runs are saved after every guess, so a long run survives a refresh
 * or leaving the screen. `onRunEnd` fires once when the last life is lost.
 */
export function useSurvival(avoidAnswer: string, onRunEnd: (run: SurvivalRun) => void): Survival {
  const { store, dictionary, random, now } = useServices();
  const { settings } = useSettings();

  // Read once on mount.
  const [saved] = useState(() => readVersioned(store, KEYS.survival, survivalSchema));
  const [run, setRun] = useState<SurvivalRun | null>(() => saved?.run ?? null);
  const runRef = useRef(run);
  const onEndRef = useRef(onRunEnd);
  useEffect(() => {
    onEndRef.current = onRunEnd;
  });

  const nextGame = useCallback(
    (current: SurvivalRun | null): GameState => {
      const used = current?.words.map((w) => w.answer) ?? [];
      const answer = pickPracticeAnswer(dictionary.answers, [...used, avoidAnswer], random);
      return createGame({
        mode: 'survival',
        id: `survival-${current?.id ?? 0}-${used.length + 1}`,
        answer,
        hardMode: settings.hardMode,
      });
    },
    [dictionary, random, avoidAnswer, settings.hardMode],
  );

  const initialGame = () => {
    const s = saved;
    if (!s) return nextGame(null);
    // A finished, already-counted word: move straight on to the next one.
    if (s.game.status !== 'playing' && s.run.lastWordId === s.game.id && !survivalOver(s.run)) return nextGame(s.run);
    return s.game;
  };

  const save = useCallback(
    (game: GameState, r: SurvivalRun | null) => {
      if (r) writeVersioned(store, KEYS.survival, survivalSchema, { run: r, game });
    },
    [store],
  );
  const persist = useCallback((game: GameState) => save(game, runRef.current), [save]);

  const onFinished = useCallback(
    (game: GameState) => {
      const current = runRef.current;
      if (!current || survivalOver(current)) return;
      const updated = finishSurvivalWord(current, game.id, {
        answer: game.answer,
        won: game.status === 'won',
        guesses: game.guesses.length,
      });
      if (updated === current) return;
      runRef.current = updated;
      setRun(updated);
      save(game, updated);
      if (survivalOver(updated)) onEndRef.current(updated);
    },
    [save],
  );

  const session = useGameSession({ initialGame, persist, onFinished });
  const { replace } = session;

  const start = useCallback(() => {
    const fresh = startSurvival(now().getTime());
    runRef.current = fresh;
    setRun(fresh);
    replace(nextGame(fresh));
  }, [now, replace, nextGame]);

  const next = useCallback(() => {
    const current = runRef.current;
    if (current && !survivalOver(current)) replace(nextGame(current));
  }, [replace, nextGame]);

  return { ...session, run, over: run !== null && survivalOver(run), start, next };
}
