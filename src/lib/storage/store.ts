/**
 * Minimal key/value persistence interface. The web build uses localStorage;
 * a mobile build can supply an implementation backed by native storage.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  /** False when falling back to memory (private mode, blocked storage, …). */
  readonly persistent: boolean;
}

export function createMemoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const map = new Map(Object.entries(initial));
  return {
    persistent: false,
    get: (k) => map.get(k) ?? null,
    set: (k, v) => void map.set(k, v),
    remove: (k) => void map.delete(k),
  };
}

/**
 * localStorage-backed store that degrades to memory if storage is unavailable
 * or throws (quota exceeded, Safari private mode, disabled cookies).
 */
export function createBrowserStore(): KeyValueStore {
  let storage: Storage;
  try {
    storage = window.localStorage;
    const probe = '__wordrush_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
  } catch {
    return createMemoryStore();
  }

  const fallback = createMemoryStore();
  return {
    persistent: true,
    get(k) {
      try {
        return storage.getItem(k) ?? fallback.get(k);
      } catch {
        return fallback.get(k);
      }
    },
    set(k, v) {
      try {
        storage.setItem(k, v);
      } catch {
        fallback.set(k, v);
      }
    },
    remove(k) {
      try {
        storage.removeItem(k);
      } catch {
        /* ignore */
      }
      fallback.remove(k);
    },
  };
}
