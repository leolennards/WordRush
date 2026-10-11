import { describe, expect, it } from 'vitest';
import { createDictionary, createGame } from '@/engine';
import { initSession, sessionReducer, type SessionAction, type SessionState } from '@/features/game/sessionReducer';

const dictionary = createDictionary(['crane', 'slate'], ['adieu'], 5);
const rules = { wordLength: 5, maxGuesses: 6 };
const fresh = () => initSession(createGame({ mode: 'daily', id: 'daily-0', answer: 'crane', dayIndex: 0 }));
const run = (s: SessionState, ...actions: SessionAction[]) => actions.reduce(sessionReducer, s);
const type = (w: string): SessionAction[] => [...w].map((letter) => ({ type: 'type', letter, wordLength: 5 }));
const submit: SessionAction = { type: 'submit', dictionary, rules, animate: true };

describe('session reducer', () => {
  it('locks input during the reveal so rapid Enter presses cannot double-submit', () => {
    let s = run(fresh(), ...type('slate'), submit);
    expect(s.revealingRow).toBe(0);
    s = run(s, submit, submit, ...type('adieu'), submit);
    expect(s.game.guesses).toEqual(['slate']);
    expect(s.input).toBe('');
    expect(s.rejection).toBeNull();
    s = run(s, { type: 'reveal-done' }, ...type('adieu'), submit);
    expect(s.game.guesses).toEqual(['slate', 'adieu']);
  });

  it('records which row a rejection happened on', () => {
    const s = run(fresh(), ...type('zzzzz'), submit);
    expect(s.rejection).toMatchObject({ error: { kind: 'not-in-list' }, row: 0, nonce: 1 });
    expect(s.input).toBe('zzzzz');
  });

  it('ignores non-letters, overflow and input after the game ends', () => {
    let s = run(fresh(), { type: 'type', letter: '1', wordLength: 5 }, ...type('cranes'));
    expect(s.input).toBe('crane');
    s = run(s, submit, { type: 'reveal-done' });
    expect(s.game.status).toBe('won');
    expect(s.justCompleted).toBe(true);
    s = run(s, ...type('slate'), submit, { type: 'delete' });
    expect(s.input).toBe('');
    expect(s.game.guesses).toHaveLength(1);
    expect(run(s, { type: 'ack-complete' }).justCompleted).toBe(false);
  });

  it('only allows hard mode to change before the first guess', () => {
    let s = run(fresh(), { type: 'set-hard-mode', enabled: true });
    expect(s.game.hardMode).toBe(true);
    s = run(s, ...type('slate'), submit, { type: 'set-hard-mode', enabled: false });
    expect(s.game.hardMode).toBe(true);
  });
});
