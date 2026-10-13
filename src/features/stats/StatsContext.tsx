import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useServices } from '@/app/services';
import { GAME } from '@/config/game';
import { emptyStats, recordResult, type SoloMode, type GameResult, type Stats } from '@/engine';
import { KEYS, statsSchema } from '@/lib/storage/schemas';
import { readVersioned, writeVersioned } from '@/lib/storage/versioned';

interface StatsContextValue {
  daily: Stats;
  practice: Stats;
  record: (mode: SoloMode, result: GameResult) => void;
  /**
   * Clears all statistics. `dailyRecordedKey` marks an already-finished daily
   * challenge as recorded so restoring it later doesn't count it again.
   */
  reset: (dailyRecordedKey: number | null) => void;
  /** Re-reads statistics from storage (after a cloud sync). */
  refresh: () => void;
}

const StatsContext = createContext<StatsContextValue | null>(null);
const keyFor = (mode: SoloMode) => (mode === 'daily' ? KEYS.dailyStats : KEYS.practiceStats);

export function StatsProvider({ children }: { children: ReactNode }) {
  const { store } = useServices();
  const load = useCallback(
    (mode: SoloMode) => readVersioned(store, keyFor(mode), statsSchema) ?? emptyStats(GAME.maxGuesses),
    [store],
  );
  const [daily, setDaily] = useState(() => load('daily'));
  const [practice, setPractice] = useState(() => load('practice'));

  const record = useCallback(
    (mode: SoloMode, result: GameResult) => {
      // Read-modify-write from storage so another tab's results are respected
      // and the same result is never counted twice.
      const current = load(mode);
      const next = recordResult(current, result);
      if (next !== current) writeVersioned(store, keyFor(mode), statsSchema, next);
      (mode === 'daily' ? setDaily : setPractice)(next);
    },
    [load, store],
  );

  const reset = useCallback(
    (dailyRecordedKey: number | null) => {
      const freshDaily = { ...emptyStats(GAME.maxGuesses), lastRecordedKey: dailyRecordedKey };
      writeVersioned(store, KEYS.dailyStats, statsSchema, freshDaily);
      store.remove(KEYS.practiceStats);
      setDaily(freshDaily);
      setPractice(emptyStats(GAME.maxGuesses));
    },
    [store],
  );

  const refresh = useCallback(() => {
    setDaily(load('daily'));
    setPractice(load('practice'));
  }, [load]);
  const value = useMemo(() => ({ daily, practice, record, reset, refresh }), [daily, practice, record, reset, refresh]);
  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStats(): StatsContextValue {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error('useStats must be used inside <StatsProvider>');
  return ctx;
}
