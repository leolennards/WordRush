import { describe, expect, it } from 'vitest';
import { canNudge, finishRound, roundOver, roundPoints, swapLeader, swapRows, swapTurn, type SwapDoc } from '@/engine';

const base = (over: Partial<SwapDoc> = {}): SwapDoc => ({
  players: ['ann', 'ben'],
  createdAt: 1,
  updatedAt: 1,
  round: 1,
  scores: { ann: 0, ben: 0 },
  setter: 'ann',
  guesser: 'ben',
  state: 'guessing',
  word: 'crane',
  guesses: [],
  live: '',
  history: [],
  nudge: null,
  ...over,
});

describe('word swap', () => {
  it('scores 7 − guesses for a solve, and 3 to the picker for a stump', () => {
    expect(roundPoints(true, 1)).toBe(6);
    expect(roundPoints(true, 6)).toBe(1);
    expect(roundPoints(false, 6)).toBe(3);
  });

  it('finishes a solved round: guesser scores, roles swap, round advances', () => {
    const next = finishRound(base({ guesses: ['slate', 'crane'] }), 50);
    expect(next).toMatchObject({ round: 2, setter: 'ben', guesser: 'ann', state: 'picking', word: null, guesses: [], live: '' });
    expect(next.scores).toEqual({ ann: 0, ben: 5 });
    expect(next.history[0]).toMatchObject({ round: 1, solved: true, scorer: 'ben', points: 5, word: 'crane', guesses: 2 });
  });

  it('gives the picker the points when the guesser is stumped', () => {
    const six = ['slate', 'pious', 'dumpy', 'ghoul', 'fifth', 'jazzy'];
    expect(roundOver(base({ guesses: six }))).toBe(true);
    const next = finishRound(base({ guesses: six }), 50);
    expect(next.scores).toEqual({ ann: 3, ben: 0 });
  });

  it('knows whose turn it is and who leads', () => {
    expect(swapTurn(base({ state: 'picking' }), 'ann')).toBe('pick');
    expect(swapTurn(base({ state: 'picking' }), 'ben')).toBe('wait-pick');
    expect(swapTurn(base(), 'ben')).toBe('guess');
    expect(swapTurn(base(), 'ann')).toBe('watch');
    expect(swapLeader(base({ scores: { ann: 4, ben: 9 } }))).toBe('ben');
    expect(swapLeader(base())).toBeNull();
  });

  it('colours guesses for spectators, and limits nudges to once a minute', () => {
    expect(swapRows(base({ guesses: ['crane'] }))[0]).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
    const nudged = base({ nudge: { by: 'ann', at: 1000 } });
    expect(canNudge(nudged, 'ann', 30_000)).toBe(false);
    expect(canNudge(nudged, 'ann', 61_001)).toBe(true);
    expect(canNudge(nudged, 'ben', 2000)).toBe(true);
  });
});
