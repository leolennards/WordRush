import { describe, expect, it } from 'vitest';
import {
  CODE_ALPHABET,
  cleanDisplayName,
  decodeRows,
  encodeRows,
  formatFriendCode,
  generateFriendCode,
  parseFriendCode,
  resolveRace,
  compareChallenge,
} from '@/engine';

describe('friend codes', () => {
  it('generates 6-character codes from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateFriendCode();
      expect(code).toMatch(new RegExp(`^[${CODE_ALPHABET}]{6}$`));
    }
    expect(CODE_ALPHABET).not.toMatch(/[0O1IL5S2Z]/);
  });

  it('formats and parses codes', () => {
    expect(formatFriendCode('K7Q4PM')).toBe('K7Q-4PM');
    expect(parseFriendCode(' k7q-4pm ')).toBe('K7Q4PM');
    expect(parseFriendCode('K7Q 4PM')).toBe('K7Q4PM');
  });

  it('rejects wrong lengths and look-alike characters instead of guessing', () => {
    expect(parseFriendCode('K7Q4P')).toBeNull();
    expect(parseFriendCode('K7Q4PMX')).toBeNull();
    expect(parseFriendCode('K0Q4PM')).toBeNull();
    expect(parseFriendCode('KOQ4PM')).toBeNull();
  });
});

describe('display names', () => {
  it('cleans and limits names', () => {
    expect(cleanDisplayName('  Sam   the  Great ')).toBe('Sam the Great');
    expect(cleanDisplayName('   ')).toBeNull();
    expect(cleanDisplayName('x'.repeat(40))).toHaveLength(20);
  });
});

describe('result rows', () => {
  it('round-trips evaluations without letters', () => {
    const evals = [
      ['correct', 'absent', 'present', 'absent', 'correct'],
      ['correct', 'correct', 'correct', 'correct', 'correct'],
    ] as const;
    const rows = encodeRows(evals.map((r) => [...r]));
    expect(rows).toEqual(['capac', 'ccccc']);
    expect(decodeRows(rows)).toEqual(evals.map((r) => [...r]));
  });
});

describe('race outcomes', () => {
  const playing = { status: 'playing' as const, guesses: 2, finishedAfterMs: null };
  it('is ongoing while nobody has finished', () => {
    expect(resolveRace({ a: playing, b: playing })).toEqual({ state: 'ongoing' });
    expect(resolveRace({ a: playing })).toEqual({ state: 'ongoing' });
  });
  it('first solver wins, even if the other is still playing', () => {
    expect(resolveRace({ a: { status: 'won', guesses: 4, finishedAfterMs: 50_000 }, b: playing })).toEqual({
      state: 'finished',
      winner: 'a',
    });
  });
  it('earlier finish beats fewer guesses', () => {
    expect(
      resolveRace({
        a: { status: 'won', guesses: 5, finishedAfterMs: 30_000 },
        b: { status: 'won', guesses: 2, finishedAfterMs: 40_000 },
      }),
    ).toEqual({ state: 'finished', winner: 'a' });
  });
  it('breaks exact time ties on guesses, then calls a draw', () => {
    expect(
      resolveRace({
        a: { status: 'won', guesses: 4, finishedAfterMs: 1000 },
        b: { status: 'won', guesses: 3, finishedAfterMs: 1000 },
      }),
    ).toEqual({ state: 'finished', winner: 'b' });
    expect(
      resolveRace({
        a: { status: 'won', guesses: 3, finishedAfterMs: 1000 },
        b: { status: 'won', guesses: 3, finishedAfterMs: 1000 },
      }),
    ).toEqual({ state: 'finished', winner: 'draw' });
  });
  it('a player who runs out waits for the other; both failing is a draw', () => {
    const lost = { status: 'lost' as const, guesses: 6, finishedAfterMs: 60_000 };
    expect(resolveRace({ a: lost, b: playing })).toEqual({ state: 'ongoing' });
    expect(resolveRace({ a: lost, b: { ...lost, finishedAfterMs: 70_000 } })).toEqual({
      state: 'finished',
      winner: 'draw',
    });
    expect(resolveRace({ a: lost, b: { status: 'won', guesses: 6, finishedAfterMs: 90_000 } })).toEqual({
      state: 'finished',
      winner: 'b',
    });
  });
});

describe('challenge comparison', () => {
  it('solving beats not solving, fewer guesses wins, otherwise tie', () => {
    expect(compareChallenge({ status: 'won', guesses: 6 }, { status: 'lost', guesses: 6 })).toBe('a');
    expect(compareChallenge({ status: 'lost', guesses: 6 }, { status: 'won', guesses: 6 })).toBe('b');
    expect(compareChallenge({ status: 'won', guesses: 3 }, { status: 'won', guesses: 4 })).toBe('a');
    expect(compareChallenge({ status: 'won', guesses: 4 }, { status: 'won', guesses: 4 })).toBe('tie');
    expect(compareChallenge({ status: 'lost', guesses: 6 }, { status: 'lost', guesses: 6 })).toBe('tie');
  });
});
