import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COUNTERS,
  emptyProgress,
  decideSection,
  mergeDaily,
  mergeStats,
  mergeWordbook,
  reconcileProgress,
  sharedOf,
  zeroCounters,
  type Counters,
  type GameState,
  type SectionSnapshot,
  type SharedProgress,
  type Stats,
} from '@/engine';
import { useServices } from '@/app/services';
import { useFriends } from '@/features/friends/FriendsContext';
import { useProgress } from '@/features/progress/ProgressContext';
import { useStats } from '@/features/stats/StatsContext';
import { useWords } from '@/features/words/WordsContext';
import type { SaveDoc } from '@/features/friends/api';
import {
  KEYS,
  dailySchema,
  progressSchema,
  statsSchema,
  syncMetaSchema,
  validateGameState,
  wordbookSchema,
  SYNC_SECTIONS,
  type SyncMeta,
  type SyncSection,
} from '@/lib/storage/schemas';
import { isTrackedStore } from '@/lib/storage/tracked';
import { readVersioned, writeVersioned } from '@/lib/storage/versioned';

export type SyncStatus = 'off' | 'syncing' | 'synced' | 'error';

/** Debounce for pushing local changes (a game end can change several things at once). */
const PUSH_DELAY_MS = 1500;

const parse = <T>(text: string | undefined, check: (d: unknown) => T | null): T | null => {
  if (!text) return null;
  try {
    return check(JSON.parse(text));
  } catch {
    return null;
  }
};

function parseCounters(text: string): Counters {
  const out = zeroCounters();
  const d = parse(text, (x) => (x && typeof x === 'object' ? (x as Record<string, unknown>) : null));
  if (d) for (const k of COUNTERS) if (typeof d[k] === 'number' && d[k] >= 0) out[k] = Math.floor(d[k] as number);
  return out;
}

function parseShared(text: string | undefined): SharedProgress | null {
  return parse(text, (d) => {
    // Re-use the progress validator for the shared fields.
    const p = progressSchema.validate({ ...emptyProgress(), ...(d as object), ...(d as { bests?: object }).bests });
    return p ? sharedOf(p) : null;
  });
}

const toSection = (x: unknown): SectionSnapshot | null => {
  if (!x || typeof x !== 'object') return null;
  const { at, data } = x as { at?: unknown; data?: unknown };
  if (typeof at !== 'number' || !data || typeof data !== 'object') return null;
  const clean: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(data)) if (typeof v === 'string' || v === null) clean[k] = v;
  return { at, data: clean };
};

/** How far along a save is, for the very first sync (when neither side has a timestamp). */
function weigh(name: SyncSection, snap: SectionSnapshot): number {
  const read = (key: string): Record<string, unknown> | null => {
    try {
      const d = (JSON.parse(snap.data[key] ?? 'null') as { data?: unknown } | null)?.data;
      return d && typeof d === 'object' ? (d as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  const num = (x: unknown) => (typeof x === 'number' ? x : 0);
  switch (name) {
    case 'practice':
      return num(read(KEYS.practice)?.gameNumber) * 10 + num(read(KEYS.practiceStats)?.played);
    case 'tower': {
      const run = read(KEYS.tower)?.run as { floor?: unknown; log?: unknown[] } | undefined;
      return num(run?.floor) * 100 + (run?.log?.length ?? 0);
    }
    case 'survival':
      return ((read(KEYS.survival)?.run as { words?: unknown[] } | undefined)?.words?.length ?? 0) + 1;
    case 'duo':
      return num(read(KEYS.duo)?.number);
    case 'quad':
      return num(read(KEYS.quad)?.number);
    case 'ladder':
      return num(read(KEYS.ladder)?.number);
    case 'rush':
      return num(read(KEYS.rush)?.day) * 1000 + num(read(KEYS.rush)?.solved);
    case 'settings':
      return 0;
  }
}

const randomId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/**
 * Keeps this device's progress, statistics, today's Daily and Word Book in
 * step with the signed-in Google account's cloud save. Runs only while
 * signed in with Google.
 */
export function useCloudSync(
  daily: { game: GameState; replace: (game: GameState) => void },
  /** Called with the game saves that were just replaced by newer ones from another device. */
  onPulled: (sections: SyncSection[]) => void,
): SyncStatus {
  const { store } = useServices();
  const { cloud } = useFriends();
  const progressCtx = useProgress();
  const stats = useStats();
  const words = useWords();
  const [status, setStatus] = useState<SyncStatus>('syncing');

  // The latest cloud document (undefined until the first read arrives).
  const remote = useRef<SaveDoc | null | undefined>(undefined);
  const running = useRef(false);
  const again = useRef(false);
  const latest = useRef({ cloud, daily, progressCtx, stats, words, onPulled });
  useEffect(() => {
    latest.current = { cloud, daily, progressCtx, stats, words, onPulled };
  });

  const reconcile = useCallback(async () => {
    const { cloud: c, daily: d, progressCtx: pc, stats: st, words: w, onPulled: pulledCb } = latest.current;
    if (!c || remote.current === undefined) return;
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    setStatus('syncing');
    try {
      const doc = remote.current;
      const meta: SyncMeta = readVersioned(store, KEYS.sync, syncMetaSchema) ?? { deviceId: randomId(), uid: null, base: zeroCounters() };
      const base = meta.uid === c.uid ? meta.base : zeroCounters();

      // Progress: per-device counters + merged shared parts.
      const localProgress = readVersioned(store, KEYS.progress, progressSchema) ?? emptyProgress();
      const devices: Record<string, Counters> = {};
      for (const [id, text] of Object.entries(doc?.devices ?? {})) devices[id] = parseCounters(text);
      const merged = reconcileProgress({
        local: localProgress,
        base,
        devices,
        deviceId: meta.deviceId,
        remoteShared: parseShared(doc?.shared),
      });

      // Statistics, today's Daily and the Word Book.
      const statsOf = (text: string | undefined): Stats | null => parse(text, (x) => statsSchema.validate(x));
      const localDaily = readVersioned(store, KEYS.dailyStats, statsSchema);
      // (Practice statistics stay per device: practice games are numbered separately on each one.)
      const dailyStats = localDaily ? mergeStats(localDaily, statsOf(doc?.dailyStats)) : statsOf(doc?.dailyStats);
      const localGame = readVersioned(store, KEYS.daily, dailySchema)?.game ?? null;
      const remoteGame = parse(doc?.daily, (x) => {
        const g = validateGameState(x);
        return g && g.mode === 'daily' ? g : null;
      });
      const game = mergeDaily(localGame, remoteGame);
      const localBook = readVersioned(store, KEYS.wordbook, wordbookSchema) ?? [];
      const book = mergeWordbook(localBook, parse(doc?.wordbook, (x) => wordbookSchema.validate(x)));

      // Apply what changed locally.
      const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
      let changed = false;
      if (!same(merged.progress, localProgress)) {
        writeVersioned(store, KEYS.progress, progressSchema, merged.progress);
        pc.refresh();
        changed = true;
      }
      if (dailyStats && !same(dailyStats, localDaily)) {
        writeVersioned(store, KEYS.dailyStats, statsSchema, dailyStats);
        changed = true;
      }
      if (changed) st.refresh();
      if (game && !same(game, localGame) && game.dayIndex === d.game.dayIndex) {
        writeVersioned(store, KEYS.daily, dailySchema, { game });
        d.replace(game);
      }
      if (!same(book, localBook)) {
        writeVersioned(store, KEYS.wordbook, wordbookSchema, book);
        w.refresh();
      }
      writeVersioned(store, KEYS.sync, syncMetaSchema, { deviceId: meta.deviceId, uid: c.uid, base: merged.others });

      // Whole game saves (Tower run, Practice, settings…): the newest change wins.
      const sessions: Record<string, string> = {};
      const pulled: SyncSection[] = [];
      if (isTrackedStore(store)) {
        for (const [name, keys] of Object.entries(SYNC_SECTIONS) as [SyncSection, readonly string[]][]) {
          const local: SectionSnapshot = {
            at: Math.max(0, ...keys.map((k) => store.changedAt(k) ?? 0)),
            data: Object.fromEntries(keys.map((k) => [k, store.get(k)])),
          };
          const theirs = parse(doc?.sessions?.[name], toSection);
          const decision = decideSection(local, theirs, (snap) => weigh(name, snap));
          if (decision === 'pull' && theirs) {
            for (const k of keys) {
              const value = theirs.data[k] ?? null;
              if (value === null) store.removeQuiet(k, theirs.at);
              else store.setQuiet(k, value, theirs.at);
            }
            pulled.push(name);
          } else if (decision === 'push') {
            // Saves from before sync existed go up unstamped (at 0), so another device's unstamped save is
            // compared by how far along it is, whichever device syncs first. The next real change stamps it.
            sessions[name] = JSON.stringify({ at: local.at, data: local.data });
          }
        }
      }
      if (pulled.length) pulledCb(pulled);

      // Push anything the cloud doesn't have yet.
      const own = JSON.stringify(merged.own);
      const sections = {
        shared: JSON.stringify(sharedOf(merged.progress)),
        ...(dailyStats ? { dailyStats: JSON.stringify(dailyStats) } : {}),
        ...(game ? { daily: JSON.stringify(game) } : {}),
        wordbook: JSON.stringify(book),
      };
      const stale =
        doc?.devices?.[meta.deviceId] !== own ||
        Object.keys(sessions).length > 0 ||
        (Object.keys(sections) as (keyof typeof sections)[]).some((k) => doc?.[k] !== sections[k]);
      if (stale) await c.write(meta.deviceId, own, { ...sections, ...(Object.keys(sessions).length ? { sessions } : {}) });
      setStatus('synced');
    } catch {
      setStatus('error');
    } finally {
      running.current = false;
      if (again.current) {
        again.current = false;
        void reconcileRef.current();
      }
    }
  }, [store]);
  const reconcileRef = useRef(reconcile);
  useEffect(() => {
    reconcileRef.current = reconcile;
  });

  // Follow the cloud document while signed in.
  const uid = cloud?.uid ?? null;
  useEffect(() => {
    remote.current = undefined;
    if (!cloud) return;
    return cloud.watch(
      (save) => {
        remote.current = save;
        void reconcile();
      },
      () => setStatus('error'),
    );
    // Re-subscribe only when the account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, reconcile]);

  // Push local changes shortly after they happen.
  const { progress } = progressCtx;
  const dailyGame = daily.game;
  useEffect(() => {
    if (!uid || remote.current === undefined) return;
    const t = window.setTimeout(() => void reconcile(), PUSH_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [uid, progress, stats.daily, words.book, dailyGame, reconcile]);

  // Game saves (Tower, Practice, settings…) change in many places: follow the store itself.
  useEffect(() => {
    if (!uid || !isTrackedStore(store)) return;
    let t: number | undefined;
    const off = store.onChange(() => {
      window.clearTimeout(t);
      t = window.setTimeout(() => void reconcileRef.current(), PUSH_DELAY_MS);
    });
    return () => {
      off();
      window.clearTimeout(t);
    };
  }, [uid, store]);

  return cloud ? status : 'off';
}
