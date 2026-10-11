import { describe, expect, it } from 'vitest';
import { evaluateGuess, letterStatesFor } from '@/engine';

const C = 'correct';
const P = 'present';
const A = 'absent';

describe('evaluateGuess', () => {
  it('marks every letter correct for an exact match', () => {
    expect(evaluateGuess('crane', 'crane')).toEqual([C, C, C, C, C]);
  });

  it('marks letters absent when they do not occur', () => {
    expect(evaluateGuess('dumpy', 'crane')).toEqual([A, A, A, A, A]);
  });

  it('marks misplaced letters present', () => {
    // answer: crane ; guess: nacre — all letters exist, none in place except none
    expect(evaluateGuess('nacre', 'crane')).toEqual([P, P, P, P, C]);
  });

  it('does not over-mark a guessed duplicate when the answer has one copy', () => {
    // answer has one E (position 5); guess has E at 2 and 5
    expect(evaluateGuess('geese', 'crane')).toEqual([A, A, A, A, C]);
    // one E in answer, not at either guessed position → only the first is present
    expect(evaluateGuess('eerie', 'tiger')).toEqual([P, A, P, P, A]);
  });

  it('prioritises an exact match over an earlier misplaced duplicate', () => {
    // answer: abbey ; guess: babes → B at index 2 is exact; the other B is present
    expect(evaluateGuess('kebab', 'abbey')).toEqual([A, P, C, P, P]);
  });

  it('handles duplicate letters in the answer', () => {
    // answer has two Ls; guess has one misplaced L
    expect(evaluateGuess('lunar', 'hello')).toEqual([P, A, A, A, A]);
    // guess has both Ls in place
    expect(evaluateGuess('belly', 'hello')).toEqual([A, C, C, C, A]);
  });

  it('handles three copies in the guess and two in the answer', () => {
    // answer: sassy (s×3) vs guess: sissy → s at 0,2,3 correct
    expect(evaluateGuess('sissy', 'sassy')).toEqual([C, A, C, C, C]);
    // answer: geese (e×3) ; guess: eerie (e×3): e0 present, e1 present? let's verify precisely
    expect(evaluateGuess('eerie', 'geese')).toEqual([P, C, A, A, C]);
  });

  it('throws for mismatched lengths', () => {
    expect(() => evaluateGuess('abc', 'crane')).toThrow();
  });
});

describe('letterStatesFor', () => {
  it('keeps the best state per letter', () => {
    const states = letterStatesFor(
      ['nacre', 'crane'],
      [evaluateGuess('nacre', 'crane'), evaluateGuess('crane', 'crane')],
    );
    expect(states).toMatchObject({ c: C, r: C, a: C, n: C, e: C });
  });

  it('never downgrades a correct letter to present', () => {
    const states = letterStatesFor(['crane', 'nacre'], [
      [C, A, A, A, A],
      [A, A, P, A, A],
    ]);
    expect(states.c).toBe(C);
    expect(states.n).toBe(A);
  });
});
