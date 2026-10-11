/**
 * Pure helpers for playing with friends: friend codes, compact result rows,
 * and race outcomes. No network or React code here.
 */
import type { GameStatus, LetterState } from './types';

// ---------- Friend codes ----------

/** No 0/O, 1/I/L, 5/S, 2/Z: easy to read aloud and type. */
export const CODE_ALPHABET = '346789ABCDEFGHJKMNPQRTUVWXY';
export const CODE_LENGTH = 6;

export function generateFriendCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  }
  return code;
}

/** "K7Q4PM" → "K7Q-4PM" for display. */
export function formatFriendCode(code: string): string {
  return code.length === CODE_LENGTH ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

/**
 * Normalises what a player typed (case, spaces, dashes). Returns null if it
 * can't be a valid code. Look-alike characters are rejected rather than
 * guessed, so a typo can never silently add the wrong person.
 */
export function parseFriendCode(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/[\s-]/g, '');
  if (cleaned.length !== CODE_LENGTH) return null;
  for (const ch of cleaned) if (!CODE_ALPHABET.includes(ch)) return null;
  return cleaned;
}

// ---------- Display names ----------

export const NAME_MAX = 20;

/** Trims, collapses whitespace and limits length. Returns null if empty. */
export function cleanDisplayName(input: string): string | null {
  const name = input.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  return name.length >= 1 ? name : null;
}

// ---------- Compact result rows (spoiler-free: colours only) ----------

const TO_CHAR: Record<LetterState, string> = { correct: 'c', present: 'p', absent: 'a' };
const FROM_CHAR: Record<string, LetterState> = { c: 'correct', p: 'present', a: 'absent' };

/** [[correct, absent, …]] → ["caaap", …] (Firestore can't store nested arrays). */
export function encodeRows(evaluations: readonly (readonly LetterState[])[]): string[] {
  return evaluations.map((row) => row.map((s) => TO_CHAR[s]).join(''));
}

export function decodeRows(rows: readonly string[]): LetterState[][] {
  return rows.map((row) => [...row].map((c) => FROM_CHAR[c] ?? 'absent'));
}

// ---------- Races ----------

export interface RacerProgress {
  status: GameStatus;
  /** Number of guesses used. */
  guesses: number;
  /** Milliseconds since the race started when the racer finished (null while playing). */
  finishedAfterMs: number | null;
}

export type RaceOutcome =
  | { state: 'ongoing' }
  | { state: 'finished'; winner: string | 'draw' };

/**
 * Decides a race between two players.
 * - The first player to solve wins (ties on time are broken by fewer guesses,
 *   then declared a draw).
 * - A player who runs out of guesses keeps waiting until the other finishes.
 * - If both fail, it's a draw.
 */
export function resolveRace(players: Record<string, RacerProgress>): RaceOutcome {
  const entries = Object.entries(players);
  if (entries.length < 2) return { state: 'ongoing' };
  const winners = entries.filter(([, p]) => p.status === 'won' && p.finishedAfterMs !== null);
  if (winners.length > 0) {
    winners.sort(([, a], [, b]) => a.finishedAfterMs! - b.finishedAfterMs! || a.guesses - b.guesses);
    const [first, second] = winners;
    if (
      second &&
      first![1].finishedAfterMs === second[1].finishedAfterMs &&
      first![1].guesses === second[1].guesses
    ) {
      return { state: 'finished', winner: 'draw' };
    }
    return { state: 'finished', winner: first![0] };
  }
  if (entries.every(([, p]) => p.status === 'lost')) return { state: 'finished', winner: 'draw' };
  return { state: 'ongoing' };
}

// ---------- Challenges ----------

export interface ChallengeResultSummary {
  status: 'won' | 'lost';
  guesses: number;
}

/**
 * Who won a challenge? Solving beats not solving; between two solves, fewer
 * guesses wins. Anything else is a tie. Returns 'a', 'b' or 'tie'.
 */
export function compareChallenge(a: ChallengeResultSummary, b: ChallengeResultSummary): 'a' | 'b' | 'tie' {
  if (a.status !== b.status) return a.status === 'won' ? 'a' : 'b';
  if (a.status === 'lost') return 'tie';
  if (a.guesses !== b.guesses) return a.guesses < b.guesses ? 'a' : 'b';
  return 'tie';
}
