import { describe, expect, it } from 'vitest';
import {
  averageGuesses,
  buildShareText,
  effectiveStreak,
  emptyStats,
  pickPracticeAnswer,
  recordResult,
  rememberAnswer,
  winPercentage,
  type Stats,
} from '@/engine';

const record = (s: Stats, key: number, won: boolean, guesses = 4) => recordResult(s, { key, won, guesses });

describe('statistics', () => {
  it('computes win percentage', () => {
    let s = emptyStats(6);
    expect(winPercentage(s)).toBe(0);
    s = record(s, 0, true);
    s = record(s, 1, false, 6);
    s = record(s, 2, true);
    expect(s.played).toBe(3);
    expect(s.wins).toBe(2);
    expect(winPercentage(s)).toBe(67);
  });

  it('tracks current and longest streaks', () => {
    let s = emptyStats(6);
    s = record(s, 0, true);
    s = record(s, 1, true);
    s = record(s, 2, true);
    expect(s.currentStreak).toBe(3);
    s = record(s, 3, false, 6);
    expect(s.currentStreak).toBe(0);
    expect(s.maxStreak).toBe(3);
    s = record(s, 4, true);
    expect(s.currentStreak).toBe(1);
    expect(s.maxStreak).toBe(3);
  });

  it('breaks the streak when a daily challenge is missed', () => {
    let s = emptyStats(6);
    s = record(s, 0, true);
    s = record(s, 1, true);
    expect(effectiveStreak(s, 2)).toBe(2); // today not yet played
    expect(effectiveStreak(s, 3)).toBe(0); // day 2 missed
    s = record(s, 3, true); // played day 3 after missing day 2
    expect(s.currentStreak).toBe(1);
    expect(s.maxStreak).toBe(2);
  });

  it('records the guess distribution for wins only', () => {
    let s = emptyStats(6);
    s = record(s, 0, true, 3);
    s = record(s, 1, true, 3);
    s = record(s, 2, true, 6);
    s = record(s, 3, false, 6);
    expect(s.distribution).toEqual([0, 0, 2, 0, 0, 1]);
    expect(averageGuesses(s)).toBe(4);
    expect(averageGuesses(emptyStats(6))).toBeNull();
  });

  it('ignores duplicate or out-of-order results', () => {
    let s = emptyStats(6);
    s = record(s, 5, true);
    const again = record(s, 5, true);
    expect(again).toBe(s);
    expect(record(s, 4, false)).toBe(s);
    expect(s.played).toBe(1);
  });

  it('keeps independent stats objects independent', () => {
    const daily = record(emptyStats(6), 10, true);
    const practice = record(emptyStats(6), 1, false);
    expect(daily.wins).toBe(1);
    expect(practice.wins).toBe(0);
    expect(daily.lastRecordedKey).toBe(10);
  });
});

describe('share text', () => {
  const evals = [
    ['absent', 'present', 'absent', 'absent', 'correct'],
    ['correct', 'correct', 'correct', 'correct', 'correct'],
  ] as const;

  it('formats a win without the answer', () => {
    const text = buildShareText({
      brand: 'WordRush',
      label: '#11',
      evaluations: evals.map((r) => [...r]),
      won: true,
      maxGuesses: 6,
      hardMode: false,
      highContrast: false,
      darkSquares: true,
      url: 'https://example.com',
    });
    expect(text).toBe('WordRush #11 2/6\n\n⬛🟨⬛⬛🟩\n🟩🟩🟩🟩🟩\n\nhttps://example.com');
  });

  it('formats a loss as X/6 with hard mode and high contrast markers', () => {
    const rows = Array.from({ length: 6 }, () => ['absent', 'absent', 'present', 'absent', 'correct'] as const);
    const text = buildShareText({
      brand: 'WordRush',
      label: 'Practice',
      evaluations: rows.map((r) => [...r]),
      won: false,
      maxGuesses: 6,
      hardMode: true,
      highContrast: true,
      darkSquares: false,
    });
    const lines = text.split('\n');
    expect(lines[0]).toBe('WordRush Practice X/6*');
    expect(lines).toHaveLength(8);
    expect(lines[2]).toBe('⬜⬜🟦⬜🟧');
  });
});

describe('practice selection', () => {
  it('avoids recent answers', () => {
    const answers = ['aaaaa', 'bbbbb', 'ccccc'];
    for (let i = 0; i < 20; i++) {
      expect(pickPracticeAnswer(answers, ['aaaaa', 'bbbbb'], Math.random)).toBe('ccccc');
    }
  });

  it('falls back to the full list when everything is excluded', () => {
    expect(pickPracticeAnswer(['aaaaa'], ['aaaaa'], () => 0)).toBe('aaaaa');
  });

  it('keeps the recent list bounded and de-duplicated', () => {
    expect(rememberAnswer(['a', 'b', 'c'], 'b', 3)).toEqual(['a', 'c', 'b']);
    expect(rememberAnswer(['a', 'b', 'c'], 'd', 3)).toEqual(['b', 'c', 'd']);
  });
});
