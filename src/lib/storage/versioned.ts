import type { KeyValueStore } from './store';

/**
 * Every persisted value is wrapped as `{ v: <schemaVersion>, data: <payload> }`.
 * Reads validate the payload; anything malformed yields `null` so callers fall
 * back to safe defaults. Malformed raw data is copied to `<key>:corrupt` for
 * diagnosis and is never re-saved as if it were valid.
 */
export interface Schema<T> {
  version: number;
  validate(data: unknown): T | null;
  /** Upgrade payloads from older versions. Return null if not migratable. */
  migrate?(data: unknown, fromVersion: number): T | null;
}

export function readVersioned<T>(store: KeyValueStore, key: string, schema: Schema<T>): T | null {
  const raw = store.get(key);
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    quarantine(store, key, raw);
    return null;
  }
  if (!isRecord(parsed) || typeof parsed.v !== 'number' || !('data' in parsed)) {
    quarantine(store, key, raw);
    return null;
  }
  if (parsed.v === schema.version) {
    const value = schema.validate(parsed.data);
    if (value === null) quarantine(store, key, raw);
    return value;
  }
  if (parsed.v < schema.version && schema.migrate) {
    const migrated = schema.migrate(parsed.data, parsed.v);
    const value = migrated === null ? null : schema.validate(migrated);
    if (value !== null) writeVersioned(store, key, schema, value);
    return value;
  }
  // Data from a newer app version: leave it untouched and use defaults.
  return null;
}

export function writeVersioned<T>(store: KeyValueStore, key: string, schema: Schema<T>, value: T): void {
  if (schema.validate(value) === null) {
    // Defensive: never persist state that would fail our own validation.
    if (import.meta.env.DEV) console.warn(`[wordrush] refused to save invalid data for ${key}`);
    return;
  }
  store.set(key, JSON.stringify({ v: schema.version, data: value }));
}

function quarantine(store: KeyValueStore, key: string, raw: string) {
  try {
    store.set(`${key}:corrupt`, raw);
  } catch {
    /* ignore */
  }
}

export function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}
