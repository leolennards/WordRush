/**
 * Reverse: the answer is shown; find any real word that would produce the
 * given colour pattern against it.
 */
import { evaluateGuess } from './evaluate';
import { normalizeWord } from './dictionary';
import type { Dictionary, LetterState } from './types';

export const REVERSE = { rounds: 5, lives: 3 } as const;

export interface ReverseRound {
  answer: string;
  pattern: LetterState[];
  /** One word that fits (shown if the round is missed). */
  example: string;
}

const samePattern = (a: readonly LetterState[], b: readonly LetterState[]) => a.every((s, i) => s === b[i]);

/** A round with a pattern that's neither trivial nor impossible. */
export function makeReverseRound(answers: readonly string[], random: () => number, avoid: readonly string[] = []): ReverseRound {
  for (let attempt = 0; attempt < 200; attempt++) {
    const answer = answers[Math.floor(random() * answers.length)]!;
    if (avoid.includes(answer)) continue;
    const example = answers[Math.floor(random() * answers.length)]!;
    if (example === answer) continue;
    const pattern = evaluateGuess(example, answer);
    const hits = pattern.filter((s) => s !== 'absent').length;
    if (hits < 2 || hits > 4) continue; // keep it interesting
    return { answer, pattern, example };
  }
  const answer = answers[0]!;
  const example = answers[1]!;
  return { answer, pattern: evaluateGuess(example, answer), example };
}

export type ReverseCheck =
  | { ok: true }
  | { ok: false; error: 'incomplete' | 'not-in-list' | 'is-answer' }
  | { ok: false; error: 'wrong'; pattern: LetterState[] };

export function checkReverse(round: ReverseRound, raw: string, dictionary: Dictionary): ReverseCheck {
  const word = normalizeWord(raw);
  if (word.length !== round.answer.length) return { ok: false, error: 'incomplete' };
  if (!dictionary.isAccepted(word)) return { ok: false, error: 'not-in-list' };
  if (word === round.answer) return { ok: false, error: 'is-answer' };
  const pattern = evaluateGuess(word, round.answer);
  return samePattern(pattern, round.pattern) ? { ok: true } : { ok: false, error: 'wrong', pattern };
}
