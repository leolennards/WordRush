import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useServices } from '@/app/services';
import { GAME } from '@/config/game';
import { RankUpOverlay } from '@/components/progress/RankUpOverlay';
import {
  applyEvent,
  buyItem,
  dayIndexFor,
  openChest,
  emptyProgress,
  type ApplyResult,
  type BuyResult,
  type GameEvent,
  type Progress,
  type Rank,
} from '@/engine';
import { KEYS, progressSchema } from '@/lib/storage/schemas';
import { readVersioned, writeVersioned } from '@/lib/storage/versioned';

interface ProgressContextValue {
  progress: Progress;
  /** Applies a finished game once; returns what it earned. */
  record: (event: GameEvent) => ApplyResult;
  /** XP earned by recent games, by event id (this session only). */
  gains: Record<string, number>;
  /** Shows the full-screen rank-up moment. */
  celebrateRank: (rank: Rank, level: number) => void;
  /** Re-reads progress from storage (after a cloud sync). */
  refresh: () => void;
  /** Buys a shop item with coins. */
  buy: (itemId: string) => BuyResult;
  /** Opens today's free coin chest; returns the coins, or null if it's already open. */
  claimChest: () => number | null;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { store, now } = useServices();
  const load = useCallback(() => readVersioned(store, KEYS.progress, progressSchema) ?? emptyProgress(), [store]);
  const [progress, setProgress] = useState(load);
  const [gains, setGains] = useState<Record<string, number>>({});
  const [rankUp, setRankUp] = useState<{ rank: Rank; level: number } | null>(null);
  const celebrateRank = useCallback((rank: Rank, level: number) => setRankUp({ rank, level }), []);
  const closeRankUp = useCallback(() => setRankUp(null), []);

  const record = useCallback(
    (event: GameEvent) => {
      // Read from storage so another tab's progress is respected.
      const at = now();
      const result = applyEvent(load(), event, at.getTime(), dayIndexFor(at, GAME.dailyEpoch));
      if (result.xpGained > 0) {
        writeVersioned(store, KEYS.progress, progressSchema, result.progress);
        setGains((g) => ({ ...g, [event.id]: result.xpGained }));
      }
      setProgress(result.progress);
      return result;
    },
    [load, store, now],
  );

  const buy = useCallback(
    (itemId: string) => {
      const result = buyItem(load(), itemId, dayIndexFor(now(), GAME.dailyEpoch));
      if (result.ok) {
        writeVersioned(store, KEYS.progress, progressSchema, result.progress);
        setProgress(result.progress);
      }
      return result;
    },
    [load, store, now],
  );

  const claimChest = useCallback(() => {
    const result = openChest(load(), dayIndexFor(now(), GAME.dailyEpoch));
    if (!result.ok) return null;
    writeVersioned(store, KEYS.progress, progressSchema, result.progress);
    setProgress(result.progress);
    return result.coins;
  }, [load, store, now]);

  const refresh = useCallback(() => setProgress(load()), [load]);
  const value = useMemo(
    () => ({ progress, record, gains, celebrateRank, refresh, buy, claimChest }),
    [progress, record, gains, celebrateRank, refresh, buy, claimChest],
  );
  return (
    <ProgressContext.Provider value={value}>
      {children}
      <RankUpOverlay show={rankUp} onClose={closeRankUp} />
    </ProgressContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}
