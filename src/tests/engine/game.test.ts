import { describe, expect, it } from 'vitest';
import { createDictionary, createGame, hardModeViolation, normalizeWord, submitGuess, type GameState } from '@/engine';

const rules = { wordLength: 5, maxGuesses: 6 };
const dict = createDictionary(['crane', 'slate', 'hello'], ['adieu', 'pious', 'dumpy', 'tiger', 'ghost', 'lemon', 'plumb', 'cranE'], 5);

function play(state: GameState, ...words: string[]): GameState {
  return words.reduce((s, w) => {
    const r = submitGuess(s, w, dict, rules);
    if (!r.ok) throw new Error(`Rejected ${w}: ${r.error.kind}`);
    return r.state;
  }, state);
}

describe('dictionary', () => {
  it('normalises input', () => {
    expect(normalizeWord('  CrAnE! ')).toBe('crane');
  });
  it('accepts answers and extra guesses but not arbitrary strings', () => {
    expect(dict.isAccepted('crane')).toBe(true);
    expect(dict.isAccepted('adieu')).toBe(true);
    expect(dict.isAccepted('zzzzz')).toBe(false);
    expect(dict.isAccepted('abcde')).toBe(false);
  });
  it('rejects duplicate or malformed answer lists', () => {
    expect(() => createDictionary(['crane', 'crane'], [], 5)).toThrow(/Duplicate/);
    expect(() => createDictionary(['cranes'], [], 5)).toThrow(/Invalid/);
    expect(() => createDictionary(['Crane'], [], 5)).toThrow(/Invalid/);
  });
});

describe('submitGuess', () => {
  const fresh = () => createGame({ mode: 'practice', id: 'practice-1', answer: 'crane' });

  it('detects a win', () => {
    const s = play(fresh(), 'slate', 'crane');
    expect(s.status).toBe('won');
    expect(s.guesses).toEqual(['slate', 'crane']);
  });

  it('detects a loss after six incorrect valid guesses', () => {
    const s = play(fresh(), 'slate', 'hello', 'adieu', 'pious', 'dumpy');
    expect(s.status).toBe('playing');
    const lost = play(s, 'tiger');
    expect(lost.status).toBe('lost');
    expect(lost.guesses).toHaveLength(6);
  });

  it('rejects words not in the dictionary without consuming an attempt', () => {
    const s = fresh();
    const r = submitGuess(s, 'zzzzz', dict, rules);
    expect(r).toEqual({ ok: false, error: { kind: 'not-in-list' } });
    expect(s.guesses).toHaveLength(0);
  });

  it('rejects incomplete guesses', () => {
    expect(submitGuess(fresh(), 'cra', dict, rules)).toEqual({ ok: false, error: { kind: 'incomplete' } });
  });

  it('prevents submissions after the game has ended', () => {
    const won = play(fresh(), 'crane');
    expect(submitGuess(won, 'slate', dict, rules)).toEqual({ ok: false, error: { kind: 'game-over' } });
  });

  it('is case-insensitive', () => {
    const r = submitGuess(fresh(), 'CRANE', dict, rules);
    expect(r.ok && r.state.status).toBe('won');
  });

  it('does not mutate the previous state', () => {
    const s = fresh();
    play(s, 'slate');
    expect(s.guesses).toEqual([]);
  });
});

describe('hard mode', () => {
  it('requires green letters to stay in position', () => {
    // answer crane, guess slate → a(2) and e(4) correct
    const s = play(createGame({ mode: 'practice', id: 'p', answer: 'crane', hardMode: true }), 'slate');
    const r = submitGuess(s, 'adieu', dict, rules);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.kind).toBe('hard-mode');
    expect(!r.ok && r.error.kind === 'hard-mode' && r.error.message).toBe('3rd letter must be A');
  });

  it('requires revealed amber letters to be reused', () => {
    expect(hardModeViolation('ghost', ['lemon'], [['absent', 'present', 'absent', 'absent', 'absent']])).toBe(
      'Guess must contain E',
    );
  });

  it('counts duplicate revealed letters', () => {
    // two Es revealed → next guess must include two Es
    const evals = [['present', 'absent', 'present', 'absent', 'absent'] as const].map((r) => [...r]);
    expect(hardModeViolation('crane', ['eaexx'], evals)).toBe('Guess must contain 2 Es');
    expect(hardModeViolation('geese', ['eaexx'], evals)).toBeNull();
  });

  it('does not require letters revealed as absent', () => {
    expect(hardModeViolation('crane', ['dumpy'], [['absent', 'absent', 'absent', 'absent', 'absent']])).toBeNull();
  });

  it('allows a valid follow-up guess', () => {
    const s = play(createGame({ mode: 'practice', id: 'p', answer: 'crane', hardMode: true }), 'slate');
    expect(submitGuess(s, 'crane', dict, rules).ok).toBe(true);
  });
});
