import { describe, expect, it } from 'vitest';
import {
  MULTI,
  QUESTS,
  QUEST_XP,
  SURVIVAL,
  advanceQuests,
  applyEvent,
  buildMultiShareText,
  createMulti,
  emptyProgress,
  finishSurvivalWord,
  multiBoard,
  multiKeyStates,
  multiSolved,
  questsFor,
  startSurvival,
  submitMulti,
  survivalOver,
  xpFor,
  type Dictionary,
  type GameEvent,
} from '@/engine';
import { multiSchema, progressSchema } from '@/lib/storage/schemas';

const dict: Dictionary = { answers: ['crane', 'slate'], isAccepted: (w) => /^[a-z]{5}$/.test(w) };
const DUO = MULTI.duo.maxGuesses;
const play = (words: string[], answers = ['crane', 'slate'], max = DUO) => {
  let s = createMulti('duo-1', answers, max);
  for (const w of words) {
    const r = submitMulti(s, w, dict);
    if (!r.ok) throw new Error(r.error.kind);
    s = r.state;
  }
  return s;
};

describe('duo and quad', () => {
  it('checks each guess against every word and stops a board once solved', () => {
    const s = play(['crane', 'blimp']);
    expect(multiSolved(s, 0)).toBe(true);
    expect(s.evaluations[0]).toHaveLength(1);
    expect(s.evaluations[1]).toHaveLength(2);
    expect(s.status).toBe('playing');
    expect(multiBoard(s, 0)).toMatchObject({ status: 'won', guesses: ['crane'] });
    expect(multiBoard(s, 1).guesses).toEqual(['crane', 'blimp']);
  });

  it('is won when all words are found, and lost after the last guess', () => {
    expect(play(['crane', 'slate']).status).toBe('won');
    const lost = play(Array.from({ length: DUO }, () => 'blimp'));
    expect(lost.status).toBe('lost');
    expect(submitMulti(lost, 'crane', dict)).toEqual({ ok: false, error: { kind: 'game-over' } });
  });

  it('plays four words in Quad with nine guesses', () => {
    const answers = ['crane', 'slate', 'blimp', 'mound'];
    const s = play(['crane', 'slate', 'blimp'], answers, MULTI.quad.maxGuesses);
    expect(s.status).toBe('playing');
    expect(play(['crane', 'slate', 'blimp', 'mound'], answers, MULTI.quad.maxGuesses).status).toBe('won');
    expect(multiKeyStates(s).m).toEqual([undefined, undefined, undefined, 'present']);
  });

  it('rejects incomplete and unknown words without using a guess', () => {
    const s = createMulti('duo-1', ['crane', 'slate'], DUO);
    expect(submitMulti(s, 'cra', dict)).toEqual({ ok: false, error: { kind: 'incomplete' } });
    const strict: Dictionary = { ...dict, isAccepted: () => false };
    expect(submitMulti(s, 'qqqqq', strict)).toEqual({ ok: false, error: { kind: 'not-in-list' } });
  });

  it('gives split keyboard colours and hides a solved word’s part', () => {
    const keys = multiKeyStates(play(['slate']));
    expect(keys.a).toEqual(['correct', undefined]);
    expect(keys.s).toEqual(['absent', undefined]);
  });

  it('shares the grids without the words', () => {
    const text = buildMultiShareText({ brand: 'W', mode: 'duo', state: play(['crane', 'slate']), highContrast: false, darkSquares: false });
    expect(text.split('\n')[0]).toBe(`W Duo 2/${DUO}`);
    expect(text).not.toMatch(/crane|slate/i);
  });

  it('survives a save and reload, including older saves', () => {
    const schema = multiSchema(2, DUO);
    const saved = JSON.parse(JSON.stringify({ game: play(['crane']), number: 3 }));
    expect(schema.validate(saved)?.game.guesses).toEqual(['crane']);
    delete saved.game.maxGuesses;
    expect(schema.validate(saved)?.game.maxGuesses).toBe(DUO);
    expect(schema.validate({ ...saved, game: { ...saved.game, answers: ['x'] } })).toBeNull();
    expect(multiSchema(4, 9).validate(saved)).toBeNull();
  });
});

describe('survival', () => {
  it('costs a life for a miss and gives one back for a quick solve', () => {
    let run = startSurvival(1);
    run = finishSurvivalWord(run, 'w1', { answer: 'crane', won: false, guesses: 6 });
    expect(run.lives).toBe(SURVIVAL.lives - 1);
    run = finishSurvivalWord(run, 'w2', { answer: 'slate', won: true, guesses: 3 });
    expect(run.lives).toBe(SURVIVAL.lives);
    expect(run.score).toBe(1);
    run = finishSurvivalWord(run, 'w3', { answer: 'blimp', won: true, guesses: 2 });
    expect(run.lives).toBe(SURVIVAL.maxLives); // capped
  });

  it('never counts a word twice and ends at zero lives', () => {
    let run = startSurvival(1);
    const miss = { answer: 'crane', won: false, guesses: 6 };
    run = finishSurvivalWord(run, 'w1', miss);
    expect(finishSurvivalWord(run, 'w1', miss)).toBe(run);
    run = finishSurvivalWord(run, 'w2', miss);
    run = finishSurvivalWord(run, 'w3', miss);
    expect(survivalOver(run)).toBe(true);
    expect(finishSurvivalWord(run, 'w4', miss)).toBe(run);
  });
});

describe('daily quests', () => {
  const ev = (over: Partial<GameEvent>): GameEvent => ({
    id: 'x',
    mode: 'practice',
    won: true,
    guesses: 4,
    hardMode: false,
    hints: 0,
    seconds: null,
    ...over,
  });

  it('picks three different quests, the same for everyone on a day', () => {
    const today = questsFor(5).map((q) => q.id);
    expect(new Set(today).size).toBe(3);
    expect(questsFor(5).map((q) => q.id)).toEqual(today);
    const week = new Set(Array.from({ length: 14 }, (_, d) => questsFor(d).map((q) => q.id).join()));
    expect(week.size).toBeGreaterThan(5);
  });

  it('advances, completes once, and resets on a new day', () => {
    const day = Array.from({ length: 200 }, (_, d) => d).find((d) => questsFor(d).some((q) => q.id === 'practice-3'))!;
    let state = null;
    let completed = 0;
    for (let i = 0; i < 4; i++) {
      const r = advanceQuests(state, day, ev({ id: `p${i}` }));
      state = r.state;
      completed += r.completed.filter((q) => q.id === 'practice-3').length;
    }
    expect(completed).toBe(1);
    expect(state!.progress['practice-3']).toBe(3);
    expect(advanceQuests(state, day + 1, ev({ mode: 'blitz', won: false })).state.day).toBe(day + 1);
  });

  it('adds quest XP and counts toward quest achievements', () => {
    const day = Array.from({ length: 200 }, (_, d) => d).find((d) => questsFor(d).some((q) => q.id === 'duo-win'))!;
    const r = applyEvent(emptyProgress(), ev({ id: 'duo-1', mode: 'duo', guesses: 3 }), 1, day);
    expect(r.questsCompleted.map((q) => q.id)).toContain('duo-win');
    expect(r.xpGained).toBeGreaterThanOrEqual(QUEST_XP);
    expect(r.progress.unlocked['quest-1']).toBeDefined();
    expect(r.progress.unlocked['duo-win']).toBeDefined();
    expect(r.progress.unlocked['duo-quick']).toBeDefined();
    expect(xpFor(ev({ mode: 'quad', guesses: 5 }))).toBeGreaterThan(xpFor(ev({ mode: 'duo', guesses: 5 })));
    // Round-trips through storage.
    expect(progressSchema.validate(JSON.parse(JSON.stringify(r.progress)))?.quests).toEqual(r.progress.quests);
  });

  it('has unique quest ids', () => {
    expect(new Set(QUESTS.map((q) => q.id)).size).toBe(QUESTS.length);
  });
});

describe('mods', () => {
  const ev = (over: Partial<GameEvent>): GameEvent => ({
    id: 'p',
    mode: 'practice',
    won: true,
    guesses: 4,
    hardMode: false,
    hints: 0,
    seconds: null,
    ...over,
  });
  it('are worth more XP and unlock their achievements', () => {
    expect(xpFor(ev({ mods: ['fog'] }))).toBeGreaterThan(xpFor(ev({})));
    expect(xpFor(ev({ mods: ['fog', 'blind'] }))).toBeGreaterThan(xpFor(ev({ mods: ['fog'] })));
    const r = applyEvent(emptyProgress(), ev({ mods: ['fog', 'blind'] }), 1);
    expect(r.unlocked.map((a) => a.id)).toEqual(expect.arrayContaining(['fog-win', 'blind-win']));
  });
});
