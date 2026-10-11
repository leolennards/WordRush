import type { LetterState } from './types';

const ordinal = (n: number) => ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'][n - 1] ?? `${n}th`;

/**
 * Hard-mode check: every revealed hint must be used in subsequent guesses.
 *
 * - A letter marked `correct` must stay in the same position.
 * - For each letter, the guess must contain at least as many copies as were
 *   revealed (correct + present) in any single previous guess. This is the
 *   duplicate-aware rule: revealing two amber Es requires two Es next time.
 *
 * Returns a human-readable error, or null when the guess is allowed.
 */
export function hardModeViolation(
  guess: string,
  guesses: readonly string[],
  evaluations: readonly (readonly LetterState[])[],
): string | null {
  for (let row = 0; row < guesses.length; row++) {
    const prev = guesses[row]!;
    const evaluation = evaluations[row];
    if (!evaluation) continue;

    for (let i = 0; i < prev.length; i++) {
      if (evaluation[i] === 'correct' && guess[i] !== prev[i]) {
        return `${ordinal(i + 1)} letter must be ${prev[i]!.toUpperCase()}`;
      }
    }

    const required = new Map<string, number>();
    for (let i = 0; i < prev.length; i++) {
      if (evaluation[i] !== 'absent') required.set(prev[i]!, (required.get(prev[i]!) ?? 0) + 1);
    }
    for (const [letter, count] of required) {
      const have = [...guess].filter((c) => c === letter).length;
      if (have < count) {
        return count > 1
          ? `Guess must contain ${count} ${letter.toUpperCase()}s`
          : `Guess must contain ${letter.toUpperCase()}`;
      }
    }
  }
  return null;
}
