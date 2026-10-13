import { describe, expect, it } from 'vitest';
import {
  LADDER,
  LadderGraph,
  RANKS,
  SKINS,
  applyEvent,
  emptyProgress,
  ladderNextStep,
  ladderStars,
  levelFor,
  makeLadder,
  rankFor,
  skinUnlocked,
  submitLadder,
  xpForLevel,
  type Dictionary,
  type LadderState,
} from '@/engine';
import { ANSWERS } from '@/data/words/answers';
import { dictionary } from '@/data/words';
import { ladderSchema } from '@/lib/storage/schemas';

describe('ranks', () => {
  it('names every level, with Legend at 100', () => {
    expect(rankFor(1).rank.name).toBe('Rookie');
    expect(rankFor(4).rank.name).toBe('Rookie');
    expect(rankFor(5).rank.name).toBe('Apprentice');
    expect(rankFor(99).rank.name).toBe('Mythic');
    expect(rankFor(100).rank.name).toBe('Wordskiis Legend');
    expect(rankFor(250)).toMatchObject({ next: null });
    expect(levelFor(xpForLevel(100)).title).toBe('Wordskiis Legend');
  });

  it('grows effects with rank and keeps ranks in order', () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i]!.minLevel).toBeGreaterThan(RANKS[i - 1]!.minLevel);
      expect(RANKS[i]!.effects).toBeGreaterThanOrEqual(RANKS[i - 1]!.effects);
    }
    expect(RANKS.at(-1)!.effects).toBe(5);
  });

  it('has a level curve that keeps level 100 a long-term goal', () => {
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(100)).toBeGreaterThan(150_000);
    for (let l = 2; l < 120; l++) expect(xpForLevel(l + 1) - xpForLevel(l)).toBeGreaterThan(xpForLevel(l) - xpForLevel(l - 1));
  });

  it('reports a rank-up only when the rank changes', () => {
    const near = { ...emptyProgress(), xp: xpForLevel(5) - 5 };
    const win = { id: 'p', mode: 'practice' as const, won: true, guesses: 3, hardMode: false, hints: 0, seconds: null };
    expect(applyEvent(near, win, 1).rankUp?.name).toBe('Apprentice');
    const mid = { ...emptyProgress(), xp: xpForLevel(6) - 5 };
    const r = applyEvent(mid, win, 1);
    expect(r.levelUp).toBe(6);
    expect(r.rankUp).toBeNull();
  });

  it('unlocks tile themes by level', () => {
    expect(skinUnlocked('classic', 1)).toBe(true);
    expect(skinUnlocked('ocean', 4)).toBe(false);
    expect(skinUnlocked('ocean', 5)).toBe(true);
    expect(skinUnlocked('prism', 99)).toBe(false);
    expect(new Set(SKINS.map((s) => s.id)).size).toBe(SKINS.length);
  });
});

describe('word ladder', () => {
  const graph = new LadderGraph(ANSWERS);
  const accept: Dictionary = { answers: ANSWERS, isAccepted: (w) => dictionary.isAccepted(w) };

  it('builds puzzles whose shortest path matches par, every time', () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 25; i++) {
      const l = makeLadder(`ladder-${i}`, graph, ANSWERS, random);
      const path = graph.path(l.start, l.target)!;
      expect(path.length - 1).toBe(l.par);
      expect(l.par).toBeGreaterThanOrEqual(LADDER.minPar);
      expect(l.par).toBeLessThanOrEqual(LADDER.maxPar);
      expect(l.maxMoves).toBe(l.par + LADDER.slack);
    }
  });

  const ladder = (): LadderState => ({
    id: 'l',
    start: 'cold',
    target: 'warm',
    steps: [],
    par: 4,
    maxMoves: 7,
    status: 'playing',
    hints: 0,
  });
  const four: Dictionary = { answers: [], isAccepted: (w) => ['cord', 'card', 'ward', 'warm', 'cold', 'bold'].includes(w) };
  const play = (words: string[], s = ladder()) =>
    words.reduce((st, w) => {
      const r = submitLadder(st, w, four);
      if (!r.ok) throw new Error(r.error);
      return r.state;
    }, s);

  it('accepts one-letter changes and wins at the target', () => {
    const s = play(['cord', 'card', 'ward', 'warm']);
    expect(s.status).toBe('won');
    expect(ladderStars(s)).toBe(3);
    expect(ladderStars({ ...s, hints: 1 })).toBe(2);
  });

  it('rejects bad moves without using one', () => {
    const s = ladder();
    expect(submitLadder(s, 'warm', four)).toEqual({ ok: false, error: 'one-letter' });
    expect(submitLadder(s, 'cold', four)).toEqual({ ok: false, error: 'one-letter' });
    expect(submitLadder(s, 'colx', four)).toEqual({ ok: false, error: 'not-in-list' });
    expect(submitLadder(play(['bold']), 'cold', four)).toEqual({ ok: false, error: 'repeat' });
  });

  it('runs out of moves', () => {
    const s = play(['bold'], { ...ladder(), maxMoves: 1 });
    expect(s.status).toBe('lost');
  });

  it('hints the next word on a shortest path from where you are', () => {
    const l = makeLadder('x', graph, ANSWERS, () => 0.37);
    const next = ladderNextStep(l, graph)!;
    expect(graph.path(next, l.target)!.length - 1).toBe(l.par - 1);
    expect(submitLadder(l, next, accept).ok).toBe(true);
  });

  it('survives a save and reload', () => {
    const game = { ...ladder(), start: 'crane', target: 'slate', steps: ['crate'] };
    const saved = JSON.parse(JSON.stringify({ game, number: 2 }));
    expect(ladderSchema.validate(saved)?.game.steps).toEqual(['crate']);
    expect(ladderSchema.validate({ ...saved, game: { ...saved.game, steps: ['x'] } })).toBeNull();
  });
});
