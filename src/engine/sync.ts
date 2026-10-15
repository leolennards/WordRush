/**
 * Cloud save: merging progress between devices signed in to the same account.
 *
 * Counters (XP, wins, …) are a grow-only counter per device: each device
 * stores only what it earned itself, and every device shows its own share
 * plus everyone else's. That adds up play on several devices exactly, even
 * before they first sync, and never counts anything twice.
 *
 * Everything else merges by keeping the best of both: personal bests (max),
 * achievements (union, earliest time), applied game ids (union), daily
 * statistics (the side that has seen the most recent day), shop purchases (union), today's daily game
 * (the further-along board) and the Word Book (union, newest play wins).
 */
import { emptyProgress, type Progress } from './progress';
import type { QuestState } from './quests';
import type { Stats } from './stats';
import type { GameState } from './types';

export const COUNTERS = ['xp', 'wins', 'practiceWins', 'duoWins', 'quadWins', 'duelWins', 'wordsPlayed', 'questsDone', 'coins', 'spent'] as const;
export const BESTS = ['bestBlitz', 'bestSurvival', 'bestTower', 'bestReverse'] as const;

export type Counter = (typeof COUNTERS)[number];
export type Best = (typeof BESTS)[number];
export type Counters = Record<Counter, number>;

/** The parts of progress that merge without per-device bookkeeping. */
export interface SharedProgress {
  unlocked: Record<string, number>;
  applied: string[];
  bests: Record<Best, number>;
  quests: QuestState | null;
  /** Shop items bought on any device. */
  owned: string[];
}

const APPLIED_LIMIT = 300;

export const zeroCounters = (): Counters => Object.fromEntries(COUNTERS.map((k) => [k, 0])) as Counters;

export const countersOf = (p: Progress): Counters => Object.fromEntries(COUNTERS.map((k) => [k, p[k]])) as Counters;

export const addCounters = (a: Counters, b: Counters): Counters =>
  Object.fromEntries(COUNTERS.map((k) => [k, (a[k] ?? 0) + (b[k] ?? 0)])) as Counters;

/** a − b, never below zero (a reset on one device must not go negative). */
export const subtractCounters = (a: Counters, b: Counters): Counters =>
  Object.fromEntries(COUNTERS.map((k) => [k, Math.max(0, (a[k] ?? 0) - (b[k] ?? 0))])) as Counters;

export const sameCounters = (a: Counters, b: Counters) => COUNTERS.every((k) => (a[k] ?? 0) === (b[k] ?? 0));

export function sharedOf(p: Progress): SharedProgress {
  return {
    unlocked: p.unlocked,
    applied: p.applied,
    bests: Object.fromEntries(BESTS.map((k) => [k, p[k]])) as Record<Best, number>,
    quests: p.quests,
    owned: p.owned,
  };
}

function mergeQuests(a: QuestState | null, b: QuestState | null): QuestState | null {
  if (!a || !b) return a ?? b;
  if (a.day !== b.day) return a.day > b.day ? a : b;
  const progress: Record<string, number> = { ...a.progress };
  for (const [id, n] of Object.entries(b.progress)) progress[id] = Math.max(progress[id] ?? 0, n);
  return { day: a.day, progress };
}

export function mergeShared(a: SharedProgress, b: SharedProgress | null): SharedProgress {
  if (!b) return a;
  const unlocked: Record<string, number> = { ...a.unlocked };
  for (const [id, at] of Object.entries(b.unlocked)) unlocked[id] = unlocked[id] === undefined ? at : Math.min(unlocked[id]!, at);
  const seen = new Set<string>();
  const applied = [...b.applied, ...a.applied].filter((id) => !seen.has(id) && (seen.add(id), true)).slice(-APPLIED_LIMIT);
  const bests = Object.fromEntries(BESTS.map((k) => [k, Math.max(a.bests[k] ?? 0, b.bests[k] ?? 0)])) as Record<Best, number>;
  const owned = [...new Set([...a.owned, ...(b.owned ?? [])])];
  return { unlocked, applied, bests, quests: mergeQuests(a.quests, b.quests), owned };
}

export function composeProgress(counters: Counters, shared: SharedProgress): Progress {
  return { ...emptyProgress(), ...counters, ...shared.bests, unlocked: shared.unlocked, applied: shared.applied, quests: shared.quests, owned: shared.owned };
}

/**
 * One device's view after syncing. `base` is the other devices' share as of
 * the last sync, so this device's own share is local − base.
 */
export function reconcileProgress(params: {
  local: Progress;
  base: Counters;
  /** Every device's share in the cloud, by device id (may include this one). */
  devices: Record<string, Counters>;
  deviceId: string;
  remoteShared: SharedProgress | null;
}): { progress: Progress; own: Counters; others: Counters } {
  const own = subtractCounters(countersOf(params.local), params.base);
  let others = zeroCounters();
  for (const [id, c] of Object.entries(params.devices)) if (id !== params.deviceId) others = addCounters(others, c);
  const shared = mergeShared(sharedOf(params.local), params.remoteShared);
  return { progress: composeProgress(addCounters(own, others), shared), own, others };
}

/** Statistics: keep the side that has seen the most recent game (then the one with more games). */
export function mergeStats(a: Stats, b: Stats | null): Stats {
  if (!b) return a;
  const ka = a.lastRecordedKey ?? -Infinity;
  const kb = b.lastRecordedKey ?? -Infinity;
  if (kb !== ka) return kb > ka ? b : a;
  return b.played > a.played ? b : a;
}

/** Today's daily game: the later day, then the board with more guesses (finished wins ties). */
export function mergeDaily(a: GameState | null, b: GameState | null): GameState | null {
  if (!a || !b) return a ?? b;
  const da = a.dayIndex ?? -1;
  const db = b.dayIndex ?? -1;
  if (da !== db) return da > db ? a : b;
  if (a.guesses.length !== b.guesses.length) return b.guesses.length > a.guesses.length ? b : a;
  if (a.status === 'playing' && b.status !== 'playing') return b;
  return a;
}

export interface BookEntry {
  word: string;
  mode: string;
  won: boolean;
  at: number;
}

/** Word Book: union by word; the most recent play of a word wins. Oldest first, at most `limit`. */
export function mergeWordbook(a: readonly BookEntry[], b: readonly BookEntry[] | null, limit = 1000): BookEntry[] {
  if (!b) return [...a];
  const byWord = new Map<string, BookEntry>();
  for (const e of [...a, ...b]) {
    const prev = byWord.get(e.word);
    if (!prev || e.at > prev.at) byWord.set(e.word, e);
  }
  return [...byWord.values()].sort((x, y) => x.at - y.at).slice(-limit);
}

/** A synced game save: the raw stored text of each of its keys (null = absent), and when it last changed. */
export interface SectionSnapshot {
  /** 0 when this device has no record of when it changed (saves from before sync existed). */
  at: number;
  data: Record<string, string | null>;
}

/**
 * Newest change wins. When neither side knows (both unstamped, e.g. the first
 * sync after updating), the one that's further along wins, as judged by `weigh`.
 */
export function decideSection(
  local: SectionSnapshot,
  remote: SectionSnapshot | null,
  weigh: (s: SectionSnapshot) => number,
): 'pull' | 'push' | 'none' {
  const hasLocal = Object.values(local.data).some((v) => v !== null);
  if (!remote) return hasLocal ? 'push' : 'none';
  const keys = new Set([...Object.keys(local.data), ...Object.keys(remote.data)]);
  if ([...keys].every((k) => (local.data[k] ?? null) === (remote.data[k] ?? null))) return 'none';
  if (remote.at !== local.at) return remote.at > local.at ? 'pull' : 'push';
  return weigh(local) > weigh(remote) ? 'push' : 'pull';
}
