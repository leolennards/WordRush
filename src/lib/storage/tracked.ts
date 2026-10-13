import type { KeyValueStore } from './store';

/**
 * A store that remembers when chosen keys last changed on this device (for
 * cloud save's "newest wins"), and tells listeners about those changes.
 * Writes that come from the cloud use the quiet variants, which keep the
 * cloud's timestamp instead of stamping "now".
 */
export interface TrackedStore extends KeyValueStore {
  readonly tracked: ReadonlySet<string>;
  /** When each tracked key last changed (ms), if known. */
  changedAt(key: string): number | undefined;
  setQuiet(key: string, value: string, at: number): void;
  removeQuiet(key: string, at: number): void;
  /** Called after a tracked key changes locally. Returns an unsubscribe function. */
  onChange(cb: (key: string) => void): () => void;
}

export function isTrackedStore(store: KeyValueStore): store is TrackedStore {
  return 'tracked' in store && 'changedAt' in store;
}

export function trackChanges(store: KeyValueStore, keys: readonly string[], stampsKey: string, now: () => number): TrackedStore {
  const tracked = new Set(keys);
  const listeners = new Set<(key: string) => void>();

  const readStamps = (): Record<string, number> => {
    try {
      const d = JSON.parse(store.get(stampsKey) ?? '{}') as unknown;
      return d && typeof d === 'object' ? (d as Record<string, number>) : {};
    } catch {
      return {};
    }
  };
  const stamp = (key: string, at: number) => store.set(stampsKey, JSON.stringify({ ...readStamps(), [key]: at }));
  const changed = (key: string) => {
    if (!tracked.has(key)) return;
    stamp(key, now());
    for (const cb of listeners) cb(key);
  };

  return {
    get persistent() {
      return store.persistent;
    },
    tracked,
    get: (k) => store.get(k),
    set(k, v) {
      const before = store.get(k);
      store.set(k, v);
      if (before !== v) changed(k);
    },
    remove(k) {
      const had = store.get(k) !== null;
      store.remove(k);
      if (had) changed(k);
    },
    changedAt: (k) => readStamps()[k],
    setQuiet(k, v, at) {
      store.set(k, v);
      stamp(k, at);
    },
    removeQuiet(k, at) {
      store.remove(k);
      stamp(k, at);
    },
    onChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
