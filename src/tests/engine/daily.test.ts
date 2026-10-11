import { describe, expect, it } from 'vitest';
import { challengeNumber, dailyAnswer, dateForDayIndex, dayIndexFor, msUntilNextDay } from '@/engine';
import { ANSWERS } from '@/data/words/answers';
import { dictionary } from '@/data/words';

const EPOCH = '2026-10-01';

describe('daily scheduling', () => {
  it('numbers the epoch day as challenge #1', () => {
    expect(dayIndexFor(new Date('2026-10-01T00:00:00Z'), EPOCH)).toBe(0);
    expect(challengeNumber(0)).toBe(1);
    expect(challengeNumber(dayIndexFor(new Date('2026-10-11T12:00:00Z'), EPOCH))).toBe(11);
  });

  it('uses the UTC date boundary', () => {
    expect(dayIndexFor(new Date('2026-10-05T23:59:59.999Z'), EPOCH)).toBe(4);
    expect(dayIndexFor(new Date('2026-10-06T00:00:00.000Z'), EPOCH)).toBe(5);
    // 23:30 in New York on Oct 5 is already Oct 6 in UTC
    expect(dayIndexFor(new Date('2026-10-05T23:30:00-04:00'), EPOCH)).toBe(5);
  });

  it('is stable across DST changes and years', () => {
    expect(dayIndexFor(new Date('2027-10-01T00:00:00Z'), EPOCH)).toBe(365);
    expect(dayIndexFor(new Date('2027-03-28T12:00:00Z'), EPOCH)).toBe(178);
  });

  it('returns the same answer for the same date', () => {
    const a = dailyAnswer(dayIndexFor(new Date('2026-10-11T01:00:00Z'), EPOCH), ANSWERS);
    const b = dailyAnswer(dayIndexFor(new Date('2026-10-11T22:00:00Z'), EPOCH), ANSWERS);
    expect(a).toBe(b);
  });

  it('gives different answers on consecutive days', () => {
    expect(dailyAnswer(10, ANSWERS)).not.toBe(dailyAnswer(11, ANSWERS));
  });

  it('wraps around the answer list and handles pre-epoch dates', () => {
    expect(dailyAnswer(ANSWERS.length, ANSWERS)).toBe(ANSWERS[0]);
    expect(dailyAnswer(-1, ANSWERS)).toBe(ANSWERS.at(-1));
  });

  it('converts day indexes back to dates', () => {
    expect(dateForDayIndex(10, EPOCH).toISOString()).toBe('2026-10-11T00:00:00.000Z');
  });

  it('computes time until the next UTC midnight', () => {
    expect(msUntilNextDay(new Date('2026-10-11T23:59:00Z'))).toBe(60_000);
  });
});

describe('bundled word lists', () => {
  it('contains unique five-letter answers that are all accepted guesses', () => {
    expect(new Set(ANSWERS).size).toBe(ANSWERS.length);
    expect(ANSWERS.length).toBeGreaterThan(1500);
    for (const w of ANSWERS) {
      expect(w).toMatch(/^[a-z]{5}$/);
      expect(dictionary.isAccepted(w)).toBe(true);
    }
  });

  it('accepts common non-answer guesses and rejects nonsense', () => {
    expect(dictionary.isAccepted('books')).toBe(true);
    expect(dictionary.isAccepted('adieu')).toBe(true);
    expect(dictionary.isAccepted('qwert')).toBe(false);
  });
});
