import type { Dictionary } from './types';

/** Lower-case, trim and strip anything that is not a–z. */
export function normalizeWord(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Builds a dictionary from an ordered answer list and a list of extra accepted
 * guesses. Answers are always accepted as guesses. Duplicate and malformed
 * answers are rejected loudly so a bad data file cannot silently skew the
 * daily schedule.
 */
export function createDictionary(
  answers: readonly string[],
  accepted: readonly string[],
  wordLength: number,
): Dictionary {
  const seen = new Set<string>();
  for (const word of answers) {
    if (word.length !== wordLength || normalizeWord(word) !== word) {
      throw new Error(`Invalid answer in word list: "${word}"`);
    }
    if (seen.has(word)) throw new Error(`Duplicate answer in word list: "${word}"`);
    seen.add(word);
  }
  const acceptedSet = new Set<string>(seen);
  for (const word of accepted) {
    const n = normalizeWord(word);
    if (n.length === wordLength) acceptedSet.add(n);
  }
  return {
    answers: Object.freeze([...answers]),
    isAccepted: (word) => acceptedSet.has(word),
  };
}
