import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '@/lib/storage/store';
import { readVersioned, writeVersioned } from '@/lib/storage/versioned';
import { DEFAULT_SETTINGS, KEYS, dailySchema, settingsSchema, statsSchema } from '@/lib/storage/schemas';
import { createGame, emptyStats } from '@/engine';

describe('versioned storage', () => {
  it('round-trips valid data', () => {
    const store = createMemoryStore();
    writeVersioned(store, KEYS.settings, settingsSchema, { ...DEFAULT_SETTINGS, theme: 'dark' });
    expect(readVersioned(store, KEYS.settings, settingsSchema)?.theme).toBe('dark');
  });

  it('returns null for malformed JSON and quarantines it', () => {
    const store = createMemoryStore({ [KEYS.dailyStats]: '{not json' });
    expect(readVersioned(store, KEYS.dailyStats, statsSchema)).toBeNull();
    expect(store.get(`${KEYS.dailyStats}:corrupt`)).toBe('{not json');
  });

  it('rejects data without an envelope or with invalid fields', () => {
    const store = createMemoryStore({
      a: JSON.stringify({ played: 1 }),
      b: JSON.stringify({ v: 1, data: { ...emptyStats(6), wins: 5, played: 2 } }),
      c: JSON.stringify({ v: 1, data: { ...emptyStats(6), distribution: [1, 2] } }),
    });
    expect(readVersioned(store, 'a', statsSchema)).toBeNull();
    expect(readVersioned(store, 'b', statsSchema)).toBeNull();
    expect(readVersioned(store, 'c', statsSchema)).toBeNull();
  });

  it('ignores data written by a newer schema version without overwriting it', () => {
    const raw = JSON.stringify({ v: 99, data: {} });
    const store = createMemoryStore({ k: raw });
    expect(readVersioned(store, 'k', statsSchema)).toBeNull();
    expect(store.get('k')).toBe(raw);
  });

  it('fills missing settings fields with defaults', () => {
    const store = createMemoryStore({ [KEYS.settings]: JSON.stringify({ v: 1, data: { theme: 'light', sound: 'yes' } }) });
    expect(readVersioned(store, KEYS.settings, settingsSchema)).toEqual({ ...DEFAULT_SETTINGS, theme: 'light' });
  });

  it('rejects inconsistent game sessions', () => {
    const game = { ...createGame({ mode: 'daily', id: 'daily-1', answer: 'crane', dayIndex: 1 }), status: 'won' };
    const store = createMemoryStore({ [KEYS.daily]: JSON.stringify({ v: 1, data: { game } }) });
    expect(readVersioned(store, KEYS.daily, dailySchema)).toBeNull();
  });

  it('refuses to write invalid data', () => {
    const store = createMemoryStore();
    writeVersioned(store, KEYS.dailyStats, statsSchema, { ...emptyStats(6), played: -1 });
    expect(store.get(KEYS.dailyStats)).toBeNull();
  });
});
