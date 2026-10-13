import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  BLITZ,
  MAX_HINTS,
  applyEvent,
  applyHint,
  blitzRemaining,
  buildBlitzShareText,
  buildShareText,
  createGame,
  emptyProgress,
  finishBlitzWord,
  formatClock,
  levelFor,
  nextHintPosition,
  startBlitz,
  xpFor,
  xpForLevel,
  type GameEvent,
  type GameState,
} from '@/engine';
import { parseEntry, parseWiktionary } from '@/lib/dictionary/define';
import { validateGameState } from '@/lib/storage/schemas';

const event = (over: Partial<GameEvent> = {}): GameEvent => ({
  id: 'practice-1',
  mode: 'practice',
  won: true,
  guesses: 4,
  hardMode: false,
  hints: 0,
  seconds: null,
  ...over,
});

describe('hints', () => {
  const game = (over: Partial<GameState> = {}): GameState => ({
    ...createGame({ mode: 'practice', id: 'practice-1', answer: 'crane' }),
    ...over,
  });

  it('reveals the first position the player has not found yet', () => {
    const g = game({ guesses: ['cloud'], evaluations: [['correct', 'absent', 'absent', 'absent', 'absent']] });
    expect(nextHintPosition(g)).toBe(1);
    const once = applyHint(g);
    expect(once.hints).toEqual([1]);
    expect(nextHintPosition(once)).toBe(2);
  });

  it(`allows at most ${MAX_HINTS} hints and none after the game ends`, () => {
    let g = game();
    for (let i = 0; i < 5; i++) g = applyHint(g);
    expect(g.hints).toHaveLength(MAX_HINTS);
    expect(nextHintPosition(game({ status: 'won' }))).toBeNull();
  });

  it('survives a save and reload, and rejects bad hint data', () => {
    const g = applyHint(game());
    expect(validateGameState(JSON.parse(JSON.stringify(g)))?.hints).toEqual([0]);
    expect(validateGameState({ ...g, hints: [9] })).toBeNull();
    expect(validateGameState({ ...g, hints: undefined })).not.toHaveProperty('hints');
  });

  it('marks hints in the share text', () => {
    const text = buildShareText({
      brand: 'Wordskiis',
      label: 'Practice',
      evaluations: [['correct', 'correct', 'correct', 'correct', 'correct']],
      won: true,
      maxGuesses: 6,
      hardMode: false,
      hints: 2,
      highContrast: false,
      darkSquares: false,
    });
    expect(text.split('\n')[0]).toBe('Wordskiis Practice 1/6 (2 hints)');
  });
});

describe('levels and achievements', () => {
  it('rewards fewer guesses, hard mode and the daily, and charges for hints', () => {
    expect(xpFor(event({ guesses: 2 }))).toBeGreaterThan(xpFor(event({ guesses: 5 })));
    expect(xpFor(event({ hardMode: true }))).toBeGreaterThan(xpFor(event()));
    expect(xpFor(event({ mode: 'daily' }))).toBeGreaterThan(xpFor(event()));
    expect(xpFor(event({ hints: 2 }))).toBeLessThan(xpFor(event()));
    expect(xpFor(event({ won: false }))).toBe(10);
    expect(xpFor(event({ mode: 'blitz', guesses: 0, blitzScore: 4 }))).toBe(110);
  });

  it('computes levels from cumulative XP', () => {
    expect(levelFor(0)).toMatchObject({ level: 1, into: 0, span: 100 });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100)).toMatchObject({ level: 2, into: 0, span: 140 });
    expect(levelFor(xpForLevel(5) + 1).level).toBe(5);
  });

  it('applies each game only once', () => {
    const first = applyEvent(emptyProgress(), event(), 1000);
    expect(first.xpGained).toBeGreaterThan(0);
    const again = applyEvent(first.progress, event(), 2000);
    expect(again.xpGained).toBe(0);
    expect(again.progress).toBe(first.progress);
  });

  it('unlocks achievements with the time they were earned', () => {
    const r = applyEvent(emptyProgress(), event({ guesses: 1, hardMode: true, seconds: 20 }), 1234);
    const ids = r.unlocked.map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(['first-win', 'ace', 'hard', 'speed', 'no-help']));
    expect(r.progress.unlocked.ace).toBe(1234);
    // Not unlocked twice.
    const next = applyEvent(r.progress, event({ id: 'practice-2', guesses: 1 }), 5000);
    expect(next.unlocked.map((a) => a.id)).not.toContain('ace');
  });

  it('tracks streak, practice and Blitz achievements and the best Blitz score', () => {
    let p = emptyProgress();
    p = applyEvent(p, event({ id: 'daily-3', mode: 'daily', streak: 7 }), 1).progress;
    expect(p.unlocked['streak-3']).toBeDefined();
    expect(p.unlocked['streak-7']).toBeDefined();
    for (let i = 0; i < 10; i++) p = applyEvent(p, event({ id: `practice-${i + 10}`, guesses: 5 }), 1).progress;
    expect(p.unlocked['practice-10']).toBeDefined();
    const blitz = applyEvent(p, event({ id: 'blitz-1', mode: 'blitz', guesses: 0, blitzScore: 6 }), 1);
    expect(blitz.progress.bestBlitz).toBe(6);
    expect(blitz.unlocked.map((a) => a.id)).toContain('blitz-5');
    expect(blitz.progress.wins).toBe(p.wins); // a Blitz run is not a "win"
  });

  it('reports a level-up', () => {
    const r = applyEvent({ ...emptyProgress(), xp: 95 }, event(), 1);
    expect(r.levelUp).toBe(2);
  });

  it('has unique achievement ids', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});

describe('blitz', () => {
  it('adds time for a solve and removes time for a miss', () => {
    let run = startBlitz(0);
    expect(blitzRemaining(run, 0)).toBe(BLITZ.startMs);
    run = finishBlitzWord(run, { answer: 'crane', won: true, guesses: 3 });
    run = finishBlitzWord(run, { answer: 'slate', won: false, guesses: 6 });
    expect(run.solved).toBe(1);
    expect(run.missed).toBe(1);
    expect(run.endsAt).toBe(BLITZ.startMs + BLITZ.bonusMs - BLITZ.penaltyMs);
    expect(blitzRemaining(run, run.endsAt + 5)).toBe(0);
  });

  it('formats the clock', () => {
    expect(formatClock(90_000)).toBe('1:30');
    expect(formatClock(4_001)).toBe('0:05');
    expect(formatClock(0)).toBe('0:00');
  });

  it('shares a run without revealing words', () => {
    const text = buildBlitzShareText({
      brand: 'Wordskiis',
      solved: 2,
      results: [true, false, true],
      highContrast: false,
      darkSquares: true,
      url: 'https://x.test',
    });
    expect(text).toBe('Wordskiis Blitz: 2 words\n\n🟩⬛🟩\n\nhttps://x.test');
  });
});

describe('word meanings', () => {
  it('picks the first definition from the dictionary API response', () => {
    const data = [
      { meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: ' A large bird. ', example: 'a crane flew' }] }] },
    ];
    expect(parseEntry('crane', data)).toMatchObject({
      word: 'crane',
      partOfSpeech: 'noun',
      definition: 'A large bird.',
      example: 'a crane flew',
    });
    const rich = parseEntry('crane', [
      {
        phonetic: '/kreɪn/',
        phonetics: [{ audio: '' }, { audio: 'https://audio.test/crane.mp3' }],
        meanings: [
          { partOfSpeech: 'noun', synonyms: ['derrick'], definitions: [{ definition: 'A bird.' }, { definition: 'A machine.' }, { definition: 'Third.' }] },
          { partOfSpeech: 'verb', definitions: [{ definition: 'To stretch the neck.', example: 'she craned' }] },
        ],
      },
    ]);
    expect(rich).toMatchObject({ phonetic: '/kreɪn/', audio: 'https://audio.test/crane.mp3' });
    expect(rich!.senses).toHaveLength(2);
    expect(rich!.senses[0]!.definitions).toHaveLength(2); // capped
    expect(rich!.senses[0]!.synonyms).toEqual(['derrick']);
    expect(parseEntry('crane', { title: 'No Definitions Found' })).toBeNull();
    expect(parseEntry('crane', [{ meanings: [] }])).toBeNull();
  });

  it('falls back to Wiktionary entries, as plain text', () => {
    const data = {
      fr: [{ partOfSpeech: 'Noun', definitions: [{ definition: 'French only' }] }],
      en: [
        {
          partOfSpeech: 'Noun',
          definitions: [
            { definition: '' },
            { definition: 'A <a href="/wiki/bird">bird</a> &amp; more.', examples: ['The <b>crane</b> flew.'] },
          ],
        },
        { partOfSpeech: 'Verb', definitions: [{ definition: 'To stretch.' }] },
      ],
    };
    const r = parseWiktionary('crane', data);
    expect(r).toMatchObject({ partOfSpeech: 'noun', definition: 'A bird & more.', example: 'The crane flew.' });
    expect(r!.senses.map((x) => x.partOfSpeech)).toEqual(['noun', 'verb']);
    expect(parseWiktionary('crane', { title: 'Not found' })).toBeNull();
  });
});
