import { useCallback } from 'react';
import { GAME } from '@/config/game';
import { createGame, pickPracticeAnswer, rememberAnswer, type GameState } from '@/engine';
import { useServices } from '@/app/services';
import { useSettings } from '@/features/settings/SettingsContext';
import { useStats } from '@/features/stats/StatsContext';
import { KEYS, practiceSchema } from '@/lib/storage/schemas';
import { readVersioned, writeVersioned } from '@/lib/storage/versioned';
import { useGameSession, type GameSession } from '@/features/game/useGameSession';

export interface PracticeGame extends GameSession {
  gameNumber: number;
  /** Starts another practice word. An unfinished game with guesses counts as a loss. */
  newGame: () => void;
  /** Clears practice progress and starts again from word 1 (used by "Reset statistics"). */
  reset: () => void;
  /** Picks up the saved practice game again (after a cloud sync). */
  reload: () => void;
}

const PREFIX = 'practice-';
export const practiceGameId = (n: number) => `${PREFIX}${n}`;
export const practiceGameNumber = (game: GameState) => Number(game.id.slice(PREFIX.length)) || 0;

/**
 * Unlimited practice. Stored under its own key so it can never overwrite the
 * daily session, and recorded into separate practice statistics.
 */
export function usePracticeGame(avoidAnswer: string): PracticeGame {
  const { store, dictionary, random } = useServices();
  const { settings } = useSettings();
  const { record } = useStats();

  const nextGame = useCallback(
    (previousNumber: number): GameState => {
      const recent = readVersioned(store, KEYS.practice, practiceSchema)?.recent ?? [];
      const answer = pickPracticeAnswer(dictionary.answers, [...recent, avoidAnswer], random);
      return createGame({
        mode: 'practice',
        id: practiceGameId(previousNumber + 1),
        answer,
        hardMode: settings.hardMode,
      });
    },
    [store, dictionary, random, avoidAnswer, settings.hardMode],
  );

  const initialGame = () => {
    const saved = readVersioned(store, KEYS.practice, practiceSchema);
    return saved?.game ?? nextGame(saved?.gameNumber ?? 0);
  };

  const persist = useCallback(
    (game: GameState) => {
      const saved = readVersioned(store, KEYS.practice, practiceSchema);
      writeVersioned(store, KEYS.practice, practiceSchema, {
        game,
        gameNumber: practiceGameNumber(game),
        recent: rememberAnswer(saved?.recent ?? [], game.answer, GAME.practiceRecentLimit),
      });
    },
    [store],
  );

  const onFinished = useCallback(
    (game: GameState) =>
      record('practice', { key: practiceGameNumber(game), won: game.status === 'won', guesses: game.guesses.length }),
    [record],
  );

  const session = useGameSession({ initialGame, persist, onFinished, followMods: true });
  const { game } = session.session;
  const { replace } = session;

  const newGame = useCallback(() => {
    if (game.status === 'playing' && game.guesses.length > 0) {
      record('practice', { key: practiceGameNumber(game), won: false, guesses: game.guesses.length });
    }
    replace(nextGame(practiceGameNumber(game)));
  }, [game, record, replace, nextGame]);

  const reset = useCallback(() => {
    store.remove(KEYS.practice);
    replace(nextGame(0));
  }, [store, replace, nextGame]);

  const reload = useCallback(() => {
    const saved = readVersioned(store, KEYS.practice, practiceSchema);
    replace(saved?.game ?? nextGame(saved?.gameNumber ?? 0));
  }, [store, replace, nextGame]);

  return { ...session, gameNumber: practiceGameNumber(game), newGame, reset, reload };
}
