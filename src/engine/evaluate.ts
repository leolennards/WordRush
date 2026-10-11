import type { LetterState } from './types';

/**
 * Frequency-aware evaluation of a guess against an answer.
 *
 * Pass 1 marks exact matches and counts the remaining (unmatched) answer
 * letters. Pass 2 walks the guess left to right and marks a letter `present`
 * only while an unmatched copy of it is still available; otherwise `absent`.
 * This guarantees a letter is never highlighted more times than it occurs.
 *
 * Both arguments must be normalised and of equal length.
 */
export function evaluateGuess(guess: string, answer: string): LetterState[] {
  if (guess.length !== answer.length) {
    throw new Error(`Guess length ${guess.length} does not match answer length ${answer.length}`);
  }
  const result: LetterState[] = new Array<LetterState>(guess.length).fill('absent');
  const remaining = new Map<string, number>();

  for (let i = 0; i < answer.length; i++) {
    const a = answer[i]!;
    if (guess[i] === a) {
      result[i] = 'correct';
    } else {
      remaining.set(a, (remaining.get(a) ?? 0) + 1);
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'correct') continue;
    const g = guess[i]!;
    const left = remaining.get(g) ?? 0;
    if (left > 0) {
      result[i] = 'present';
      remaining.set(g, left - 1);
    }
  }

  return result;
}

const RANK: Record<LetterState, number> = { absent: 1, present: 2, correct: 3 };

/** Best-known state of each letter across all evaluated guesses (for the keyboard). */
export function letterStatesFor(
  guesses: readonly string[],
  evaluations: readonly (readonly LetterState[])[],
): Record<string, LetterState> {
  const states: Record<string, LetterState> = {};
  guesses.forEach((guess, row) => {
    const evaluation = evaluations[row];
    if (!evaluation) return;
    [...guess].forEach((letter, i) => {
      const next = evaluation[i];
      if (!next) return;
      const prev = states[letter];
      if (!prev || RANK[next] > RANK[prev]) states[letter] = next;
    });
  });
  return states;
}
