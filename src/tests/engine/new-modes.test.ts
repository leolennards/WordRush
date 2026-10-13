import { describe, expect, it } from 'vitest';
import {
  BOTS,
  TOWER,
  botCandidates,
  botGuess,
  checkReverse,
  choosePerk,
  evaluateGuess,
  fibPosition,
  fibRow,
  finishFloor,
  makeReverseRound,
  startTower,
  twistsFor,
  type LetterState,
  type TowerRun,
} from '@/engine';
import { ANSWERS } from '@/data/words/answers';
import { dictionary } from '@/data/words';

const seeded = (seed = 7) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe('fibber', () => {
  const row: LetterState[] = ['correct', 'absent', 'present', 'absent', 'absent'];
  it('changes exactly one tile, the same way every time', () => {
    const lied = fibRow('practice-3', 1, row);
    expect(lied.filter((s, i) => s !== row[i])).toHaveLength(1);
    expect(fibRow('practice-3', 1, row)).toEqual(lied);
    expect(lied[fibPosition('practice-3', 1, row)!]).not.toBe(row[fibPosition('practice-3', 1, row)!]);
  });
  it('never lies on a solved row', () => {
    const won: LetterState[] = ['correct', 'correct', 'correct', 'correct', 'correct'];
    expect(fibRow('g', 4, won)).toEqual(won);
    expect(fibPosition('g', 4, won)).toBeNull();
  });
});

describe('reverse', () => {
  it('makes rounds with 2–4 lit tiles that its example satisfies', () => {
    const random = seeded();
    for (let i = 0; i < 30; i++) {
      const r = makeReverseRound(ANSWERS, random);
      const lit = r.pattern.filter((s) => s !== 'absent').length;
      expect(lit).toBeGreaterThanOrEqual(2);
      expect(lit).toBeLessThanOrEqual(4);
      expect(checkReverse(r, r.example, dictionary)).toEqual({ ok: true });
    }
  });
  it('rejects the answer itself and explains wrong patterns', () => {
    const r = makeReverseRound(ANSWERS, seeded(3));
    expect(checkReverse(r, r.answer, dictionary)).toEqual({ ok: false, error: 'is-answer' });
    expect(checkReverse(r, 'qqqqq', dictionary)).toEqual({ ok: false, error: 'not-in-list' });
    const other = ANSWERS.find((w) => w !== r.answer && evaluateGuess(w, r.answer).join() !== r.pattern.join())!;
    expect(checkReverse(r, other, dictionary)).toEqual({ ok: false, error: 'wrong', pattern: evaluateGuess(other, r.answer) });
  });
});

describe('bot', () => {
  it('only keeps answers consistent with its feedback', () => {
    const answer = ANSWERS[42]!;
    const g = 'crane';
    const candidates = botCandidates(ANSWERS, [g], [evaluateGuess(g, answer)]);
    expect(candidates).toContain(answer);
    for (const c of candidates) expect(evaluateGuess(g, c)).toEqual(evaluateGuess(g, answer));
  });
  it('the hard bot solves almost every word within six guesses', () => {
    const random = seeded(11);
    let solved = 0;
    const sample = ANSWERS.filter((_, i) => i % 40 === 0);
    for (const answer of sample) {
      const guesses: string[] = [];
      const evals: LetterState[][] = [];
      for (let t = 0; t < 6; t++) {
        const g = botGuess(BOTS.hard, ANSWERS, guesses, evals, random);
        guesses.push(g);
        evals.push(evaluateGuess(g, answer));
        if (g === answer) {
          solved++;
          break;
        }
      }
    }
    expect(solved / sample.length).toBeGreaterThan(0.85);
  });
});

describe('tower', () => {
  it('adds twists as you climb, never mixing Fibber with Hard mode', () => {
    const random = seeded(5);
    expect(twistsFor(1, random)).toEqual(['none']);
    expect(twistsFor(3, random)).toHaveLength(1);
    for (let i = 0; i < 50; i++) {
      const t = twistsFor(8, random);
      expect(t).toHaveLength(2);
      expect(t.includes('liar') && t.includes('hard')).toBe(false);
    }
  });
  it('offers two different perks after a cleared floor, and applies them', () => {
    const random = seeded(9);
    const run = finishFloor({ ...startTower(1, random), phase: 'playing' }, 'f1', 'crane', true, random);
    expect(run.phase).toBe('perk');
    expect(new Set(run.offer).size).toBe(2);
    expect(run.offer).not.toContain('heal'); // already at full hearts
    const next = choosePerk({ ...run, offer: ['shield', 'calm'] }, 'calm', random);
    expect(next).toMatchObject({ floor: 2, phase: 'intro', twists: ['none'] });
  });
  it('costs a heart for a miss unless shielded, and ends at zero', () => {
    const random = seeded(2);
    let run: TowerRun = { ...startTower(1, random), phase: 'playing', shield: true };
    run = { ...finishFloor(run, 'a', 'crane', false, random), phase: 'playing' };
    expect(run.hearts).toBe(TOWER.hearts);
    expect(run.shield).toBe(false);
    const hurt = finishFloor(run, 'b', 'slate', false, random);
    expect(hurt).toMatchObject({ hearts: TOWER.hearts - 1, phase: 'intro', floor: 3 });
    const over = finishFloor({ ...hurt, hearts: 1, phase: 'playing' }, 'c', 'blimp', false, random);
    expect(over).toMatchObject({ hearts: 0, phase: 'over' });
    // The same floor is never counted twice.
    expect(finishFloor({ ...over, phase: 'playing' }, 'c', 'blimp', false, random).log).toHaveLength(over.log.length);
  });
});
