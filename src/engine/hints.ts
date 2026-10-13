import type { GameState } from './types';

/** Hints available per Practice word. */
export const MAX_HINTS = 2;

/** Positions the player already knows: found as correct in a guess, or hinted. */
function knownPositions(game: GameState): Set<number> {
  const known = new Set(game.hints ?? []);
  for (const row of game.evaluations) row.forEach((s, i) => s === 'correct' && known.add(i));
  return known;
}

/** The next position a hint would reveal, or null if no hint can be given. */
export function nextHintPosition(game: GameState): number | null {
  if (game.status !== 'playing' || (game.hints?.length ?? 0) >= MAX_HINTS) return null;
  const known = knownPositions(game);
  for (let i = 0; i < game.answer.length; i++) if (!known.has(i)) return i;
  return null;
}

/** Pure: reveals one more letter of the answer, or returns the game unchanged. */
export function applyHint(game: GameState): GameState {
  const position = nextHintPosition(game);
  if (position === null) return game;
  return { ...game, hints: [...(game.hints ?? []), position] };
}

export const hintsUsed = (game: GameState) => game.hints?.length ?? 0;
