/**
 * Fibber: every submitted row tells exactly one lie — one tile shows the
 * wrong colour. The winning row never lies. Deterministic per game and row,
 * so a refresh shows the same lies.
 */
import type { LetterState } from './types';

const STATES: readonly LetterState[] = ['correct', 'present', 'absent'];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The position that lies in a row (null for an all-correct row). */
export function fibPosition(gameId: string, row: number, evaluation: readonly LetterState[]): number | null {
  if (evaluation.every((s) => s === 'correct')) return null;
  return hash(`${gameId}:${row}`) % evaluation.length;
}

/** The row as the player sees it: one tile's colour swapped for another. */
export function fibRow(gameId: string, row: number, evaluation: readonly LetterState[]): LetterState[] {
  const pos = fibPosition(gameId, row, evaluation);
  if (pos === null) return [...evaluation];
  const truth = evaluation[pos]!;
  const others = STATES.filter((s) => s !== truth);
  const lie = others[hash(`${gameId}:${row}:lie`) % others.length]!;
  return evaluation.map((s, i) => (i === pos ? lie : s));
}

export const fibRows = (gameId: string, evaluations: readonly (readonly LetterState[])[]) =>
  evaluations.map((e, r) => fibRow(gameId, r, e));
