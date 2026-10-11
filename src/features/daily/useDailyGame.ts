import { useCallback, useEffect } from 'react';
import { createGame, dailyAnswer, dailyGameId, type GameState } from '@/engine';
import { useServices } from '@/app/services';
import { useSettings } from '@/features/settings/SettingsContext';
import { useStats } from '@/features/stats/StatsContext';
import { KEYS, dailySchema } from '@/lib/storage/schemas';
import { readVersioned, writeVersioned } from '@/lib/storage/versioned';
import { useGameSession, type GameSession } from '@/features/game/useGameSession';

export interface DailyGame extends GameSession {
  /** True when the UTC day has rolled over while this challenge was in progress. */
  stale: boolean;
  startToday: () => void;
}

/**
 * Daily Challenge session. There is deliberately no "restart": the only game
 * available is today's, restored from storage if it was started before.
 */
export function useDailyGame(todayIndex: number): DailyGame {
  const { store, dictionary } = useServices();
  const { settings } = useSettings();
  const { record } = useStats();

  const freshGame = useCallback(
    (dayIndex: number) =>
      createGame({
        mode: 'daily',
        id: dailyGameId(dayIndex),
        answer: dailyAnswer(dayIndex, dictionary.answers),
        hardMode: settings.hardMode,
        dayIndex,
      }),
    [dictionary, settings.hardMode],
  );

  const initialGame = () => {
    const saved = readVersioned(store, KEYS.daily, dailySchema)?.game;
    // Only restore a session for today's puzzle with the expected answer
    // (guards against clock changes and dictionary version changes).
    if (saved && saved.dayIndex === todayIndex && saved.answer === dailyAnswer(todayIndex, dictionary.answers)) {
      return saved;
    }
    return freshGame(todayIndex);
  };

  const persist = useCallback((game: GameState) => writeVersioned(store, KEYS.daily, dailySchema, { game }), [store]);
  const onFinished = useCallback(
    (game: GameState) => {
      if (game.dayIndex === null) return;
      record('daily', { key: game.dayIndex, won: game.status === 'won', guesses: game.guesses.length });
    },
    [record],
  );

  const session = useGameSession({ initialGame, persist, onFinished });
  const { game } = session.session;
  const { replace } = session;

  // Day rollover: move on automatically unless the player is mid-game.
  useEffect(() => {
    if (game.dayIndex === todayIndex) return;
    if (game.status !== 'playing' || game.guesses.length === 0) replace(freshGame(todayIndex));
  }, [todayIndex, game.dayIndex, game.status, game.guesses.length, freshGame, replace]);

  const startToday = useCallback(() => replace(freshGame(todayIndex)), [replace, freshGame, todayIndex]);

  return { ...session, stale: game.dayIndex !== todayIndex, startToday };
}
