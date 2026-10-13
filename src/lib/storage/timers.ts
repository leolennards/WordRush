import type { KeyValueStore } from './store';
import { KEYS, timersSchema } from './schemas';
import { readVersioned, writeVersioned } from './versioned';

const KEEP = 8;

/** Remembers when a game's first letter was typed (only the first call counts). */
export function markStarted(store: KeyValueStore, gameId: string, now: number): void {
  const timers = readVersioned(store, KEYS.timers, timersSchema) ?? {};
  if (timers[gameId] !== undefined) return;
  const entries = [...Object.entries(timers), [gameId, now] as const].slice(-KEEP);
  writeVersioned(store, KEYS.timers, timersSchema, Object.fromEntries(entries));
}

/** Whole seconds since the game started, or null if its start wasn't seen. */
export function secondsSinceStart(store: KeyValueStore, gameId: string, now: number): number | null {
  const started = readVersioned(store, KEYS.timers, timersSchema)?.[gameId];
  return started === undefined ? null : Math.max(0, Math.round((now - started) / 1000));
}
