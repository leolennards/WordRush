/**
 * Daily quests: three small goals per UTC day, the same for everyone, each
 * worth bonus XP. Progress comes from the same game events as XP.
 */
import type { GameEvent } from './progress';

export interface Quest {
  id: string;
  title: string;
  target: number;
  /** How much this finished game advances the quest. */
  count: (e: GameEvent) => number;
}

const word = (e: GameEvent) => e.mode === 'daily' || e.mode === 'practice';

export const QUESTS: readonly Quest[] = [
  { id: 'play-daily', title: 'Play today’s Daily Challenge', target: 1, count: (e) => (e.mode === 'daily' ? 1 : 0) },
  { id: 'practice-3', title: 'Win 3 Practice words', target: 3, count: (e) => (e.mode === 'practice' && e.won ? 1 : 0) },
  { id: 'quick-4', title: 'Solve a word in 4 guesses or fewer', target: 1, count: (e) => (word(e) && e.won && e.guesses <= 4 ? 1 : 0) },
  { id: 'blitz-5', title: 'Score 5 or more in one Blitz run', target: 1, count: (e) => ((e.blitzScore ?? 0) >= 5 ? 1 : 0) },
  { id: 'blitz-2', title: 'Play 2 Blitz runs', target: 2, count: (e) => (e.mode === 'blitz' ? 1 : 0) },
  { id: 'duo-win', title: 'Win a Duo game', target: 1, count: (e) => (e.mode === 'duo' && e.won ? 1 : 0) },
  { id: 'quad-win', title: 'Win a Quad game', target: 1, count: (e) => (e.mode === 'quad' && e.won ? 1 : 0) },
  { id: 'survive-3', title: 'Reach 3 words in Survival', target: 1, count: (e) => ((e.survivalScore ?? 0) >= 3 ? 1 : 0) },
  { id: 'hard-win', title: 'Win a game in Hard mode', target: 1, count: (e) => (word(e) && e.won && e.hardMode ? 1 : 0) },
  { id: 'no-hints', title: 'Solve a Practice word without hints', target: 1, count: (e) => (e.mode === 'practice' && e.won && e.hints === 0 ? 1 : 0) },
  { id: 'speedy', title: 'Solve a word in under 2 minutes', target: 1, count: (e) => (e.won && e.seconds !== null && e.seconds < 120 ? 1 : 0) },
  { id: 'mod-win', title: 'Win a Practice word with a mod on', target: 1, count: (e) => (e.mode === 'practice' && e.won && (e.mods?.length ?? 0) > 0 ? 1 : 0) },
  { id: 'rush', title: 'Play today’s Daily Rush', target: 1, count: (e) => (e.rush ? 1 : 0) },
  { id: 'words-10', title: 'Play 10 words in any mode', target: 10, count: (e) => e.words?.length ?? 0 },
  { id: 'ladder', title: 'Finish a Word Ladder', target: 1, count: (e) => (e.mode === 'ladder' && e.won ? 1 : 0) },
  { id: 'duel-win', title: 'Beat a bot in Bot Duel', target: 1, count: (e) => (e.mode === 'duel' && e.won ? 1 : 0) },
  { id: 'tower-3', title: 'Clear 3 floors in one Tower run', target: 1, count: (e) => ((e.towerFloors ?? 0) >= 3 ? 1 : 0) },
  { id: 'reverse-3', title: 'Solve 3 rounds in one Reverse game', target: 1, count: (e) => ((e.reverseScore ?? 0) >= 3 ? 1 : 0) },
  { id: 'swap', title: 'Play a round of Word Swap', target: 1, count: (e) => (e.mode === 'swap' ? 1 : 0) },
  { id: 'wins-5', title: 'Win 5 games of any kind', target: 5, count: (e) => ((word(e) || e.mode === 'duo' || e.mode === 'quad') && e.won ? 1 : 0) },
];

export const QUEST_XP = 60;
export const QUESTS_PER_DAY = 3;

/** Deterministic pick of the day's quests (a seeded shuffle). */
export function questsFor(day: number): Quest[] {
  let seed = (day * 2654435761) >>> 0 || 1;
  const rnd = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const pool = [...QUESTS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, QUESTS_PER_DAY);
}

export interface QuestState {
  day: number;
  /** Quest id → progress (capped at the target). */
  progress: Record<string, number>;
}

/** Pure: advances the day's quests. Returns the quests that just completed. */
export function advanceQuests(
  state: QuestState | null,
  day: number,
  e: GameEvent,
): { state: QuestState; completed: Quest[] } {
  const current: QuestState = state && state.day === day ? state : { day, progress: {} };
  const progress = { ...current.progress };
  const completed: Quest[] = [];
  for (const q of questsFor(day)) {
    const before = progress[q.id] ?? 0;
    if (before >= q.target) continue;
    const after = Math.min(q.target, before + q.count(e));
    progress[q.id] = after;
    if (after >= q.target) completed.push(q);
  }
  return { state: { day, progress }, completed };
}
