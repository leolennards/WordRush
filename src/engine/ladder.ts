/**
 * Word Ladder: turn the start word into the target by changing one letter at
 * a time, every step a real word. Puzzles are built from the answer list (so
 * the shortest path only uses common words); any accepted word may be played.
 */
import { normalizeWord } from './dictionary';
import type { Dictionary, GameStatus } from './types';

export interface LadderState {
  id: string;
  start: string;
  target: string;
  /** Words played after the start, in order. */
  steps: string[];
  /** Length of the shortest path (moves). */
  par: number;
  maxMoves: number;
  status: GameStatus;
  hints: number;
}

export const LADDER = {
  /** Extra moves allowed beyond par. */
  slack: 3,
  maxHints: 2,
  minPar: 3,
  maxPar: 5,
} as const;

export type LadderError = 'incomplete' | 'not-in-list' | 'one-letter' | 'repeat' | 'game-over';

export const LADDER_ERRORS: Record<LadderError, string> = {
  incomplete: 'Not enough letters',
  'not-in-list': 'Not in word list',
  'one-letter': 'Change exactly one letter',
  repeat: 'Already on your ladder',
  'game-over': 'This ladder is finished',
};

/** Words that differ from `word` in exactly one position, from a fixed word list. */
export class LadderGraph {
  private readonly buckets = new Map<string, string[]>();

  constructor(words: readonly string[]) {
    for (const w of words) {
      for (let i = 0; i < w.length; i++) {
        const key = `${w.slice(0, i)}_${w.slice(i + 1)}`;
        const list = this.buckets.get(key);
        if (list) list.push(w);
        else this.buckets.set(key, [w]);
      }
    }
  }

  neighbors(word: string): string[] {
    const out = new Set<string>();
    for (let i = 0; i < word.length; i++) {
      for (const w of this.buckets.get(`${word.slice(0, i)}_${word.slice(i + 1)}`) ?? []) if (w !== word) out.add(w);
    }
    return [...out];
  }

  /** Shortest path from `from` to `to` (inclusive of both), or null. */
  path(from: string, to: string, avoid: ReadonlySet<string> = new Set()): string[] | null {
    if (from === to) return [from];
    const prev = new Map<string, string>([[from, '']]);
    let frontier = [from];
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const w of frontier) {
        for (const n of this.neighbors(w)) {
          if (prev.has(n) || (avoid.has(n) && n !== to)) continue;
          prev.set(n, w);
          if (n === to) {
            const path = [to];
            let cur = w;
            while (cur) {
              path.unshift(cur);
              cur = prev.get(cur)!;
            }
            return path;
          }
          next.push(n);
        }
      }
      frontier = next;
    }
    return null;
  }

  /** Words exactly `d` steps from `from`, for every distance up to `max`. */
  distances(from: string, max: number): Map<string, number> {
    const dist = new Map<string, number>([[from, 0]]);
    let frontier = [from];
    for (let d = 1; d <= max && frontier.length > 0; d++) {
      const next: string[] = [];
      for (const w of frontier) {
        for (const n of this.neighbors(w)) {
          if (dist.has(n)) continue;
          dist.set(n, d);
          next.push(n);
        }
      }
      frontier = next;
    }
    return dist;
  }
}

/** Builds a puzzle whose shortest path is between minPar and maxPar moves. */
export function makeLadder(id: string, graph: LadderGraph, words: readonly string[], random: () => number): LadderState {
  // Walk the list from a random point so a word with no long climbs is skipped, not retried.
  const base = Math.floor(random() * words.length);
  for (let attempt = 0; attempt < 200; attempt++) {
    const start = words[(base + attempt * 7919) % words.length]!;
    const dist = graph.distances(start, LADDER.maxPar);
    const far = [...dist].filter(([, d]) => d >= LADDER.minPar);
    if (far.length === 0) continue;
    // Prefer the longest climbs available.
    const best = Math.max(...far.map(([, d]) => d));
    const pool = far.filter(([, d]) => d === best);
    const [target, par] = pool[Math.floor(random() * pool.length)]!;
    return { id, start, target, steps: [], par, maxMoves: par + LADDER.slack, status: 'playing', hints: 0 };
  }
  throw new Error('Could not build a ladder');
}

export const ladderCurrent = (s: LadderState) => s.steps.at(-1) ?? s.start;
export const ladderMovesLeft = (s: LadderState) => s.maxMoves - s.steps.length;

const diffCount = (a: string, b: string) => [...a].filter((l, i) => l !== b[i]).length;

export type LadderResult = { ok: true; state: LadderState } | { ok: false; error: LadderError };

export function submitLadder(state: LadderState, raw: string, dictionary: Dictionary): LadderResult {
  if (state.status !== 'playing') return { ok: false, error: 'game-over' };
  const word = normalizeWord(raw);
  if (word.length !== state.start.length) return { ok: false, error: 'incomplete' };
  if (!dictionary.isAccepted(word) && word !== state.target) return { ok: false, error: 'not-in-list' };
  if (diffCount(word, ladderCurrent(state)) !== 1) return { ok: false, error: 'one-letter' };
  if (word === state.start || state.steps.includes(word)) return { ok: false, error: 'repeat' };
  const steps = [...state.steps, word];
  const status: GameStatus = word === state.target ? 'won' : steps.length >= state.maxMoves ? 'lost' : 'playing';
  return { ok: true, state: { ...state, steps, status } };
}

/** The next word on a shortest path from where the player is, or null. */
export function ladderNextStep(state: LadderState, graph: LadderGraph): string | null {
  const used = new Set([state.start, ...state.steps]);
  return graph.path(ladderCurrent(state), state.target, used)?.[1] ?? null;
}

/** 3 stars at par, 2 at one over (or with hints), otherwise 1; 0 if not finished. */
export function ladderStars(s: LadderState): number {
  if (s.status !== 'won') return 0;
  const over = s.steps.length - s.par;
  const stars = over <= 0 ? 3 : over === 1 ? 2 : 1;
  return s.hints > 0 ? Math.min(stars, 2) : stars;
}

/** Which letters of a step changed from the word before it. */
export const changedIndex = (prev: string, word: string) => [...word].findIndex((l, i) => l !== prev[i]);
