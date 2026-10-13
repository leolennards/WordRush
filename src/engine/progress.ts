/**
 * Levels, experience points and achievements. Pure and idempotent: every
 * finished game is applied once by its id, so refreshes or duplicate effects
 * never award anything twice.
 */
import { QUEST_XP, advanceQuests, questsFor, type Quest, type QuestState } from './quests';

export type ProgressMode = 'daily' | 'practice' | 'blitz' | 'duo' | 'survival';

export interface GameEvent {
  /** Unique per game or run: `daily-12`, `practice-40`, `blitz-<start ms>`. */
  id: string;
  mode: ProgressMode;
  won: boolean;
  /** Guesses used (0 for a Blitz run). */
  guesses: number;
  hardMode: boolean;
  hints: number;
  /** Seconds from the first letter to the end, when known. */
  seconds: number | null;
  /** Daily: the streak after this game. */
  streak?: number;
  /** Blitz: words solved in the run. */
  blitzScore?: number;
  /** Survival: words solved in the run. */
  survivalScore?: number;
}

export interface Progress {
  xp: number;
  /** Achievement id → time unlocked (ms since epoch). */
  unlocked: Record<string, number>;
  wins: number;
  practiceWins: number;
  bestBlitz: number;
  bestSurvival: number;
  duoWins: number;
  /** Total daily quests completed. */
  questsDone: number;
  /** Today's quest progress (reset when the UTC day changes). */
  quests: QuestState | null;
  /** Recently applied event ids (bounded). */
  applied: string[];
}

export const emptyProgress = (): Progress => ({
  xp: 0,
  unlocked: {},
  wins: 0,
  practiceWins: 0,
  bestBlitz: 0,
  bestSurvival: 0,
  duoWins: 0,
  questsDone: 0,
  quests: null,
  applied: [],
});

export interface Achievement {
  id: string;
  title: string;
  description: string;
  /** Lucide icon name used by the UI. */
  icon: 'sparkles' | 'target' | 'crosshair' | 'shield' | 'flame' | 'calendar' | 'crown' | 'skull' | 'dumbbell' | 'medal' | 'timer' | 'zap' | 'bolt' | 'star' | 'brain' | 'scroll' | 'list' | 'map' | 'columns' | 'heart' | 'swords';
  /** True once this event (with the updated progress) earns it. */
  earned: (p: Progress, e: GameEvent) => boolean;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first-win', title: 'First word', description: 'Win your first game.', icon: 'sparkles', earned: (p) => p.wins >= 1 },
  { id: 'ace', title: 'Hole in one', description: 'Solve a word on your first guess.', icon: 'target', earned: (_, e) => e.won && e.guesses === 1 },
  { id: 'sharp', title: 'Sharpshooter', description: 'Solve a word in two guesses.', icon: 'crosshair', earned: (_, e) => e.won && e.guesses === 2 },
  { id: 'clutch', title: 'Clutch', description: 'Solve a word on your final guess.', icon: 'shield', earned: (_, e) => e.won && e.guesses === 6 },
  { id: 'no-help', title: 'No help needed', description: 'Solve a Practice word in three guesses or fewer without hints.', icon: 'brain', earned: (_, e) => e.mode === 'practice' && e.won && e.guesses <= 3 && e.hints === 0 },
  { id: 'streak-3', title: 'On a roll', description: 'Reach a 3-day Daily streak.', icon: 'flame', earned: (_, e) => (e.streak ?? 0) >= 3 },
  { id: 'streak-7', title: 'Week warrior', description: 'Reach a 7-day Daily streak.', icon: 'calendar', earned: (_, e) => (e.streak ?? 0) >= 7 },
  { id: 'streak-30', title: 'Unstoppable', description: 'Reach a 30-day Daily streak.', icon: 'crown', earned: (_, e) => (e.streak ?? 0) >= 30 },
  { id: 'hard', title: 'Hardcore', description: 'Win a game in Hard mode.', icon: 'skull', earned: (_, e) => e.won && e.hardMode },
  { id: 'speed', title: 'Speedster', description: 'Solve a word in under 60 seconds.', icon: 'timer', earned: (_, e) => e.won && e.seconds !== null && e.seconds < 60 },
  { id: 'practice-10', title: 'Practice makes perfect', description: 'Win 10 Practice games.', icon: 'dumbbell', earned: (p) => p.practiceWins >= 10 },
  { id: 'wins-50', title: 'Half century', description: 'Win 50 games.', icon: 'medal', earned: (p) => p.wins >= 50 },
  { id: 'blitz-5', title: 'Blitzed', description: 'Solve 5 words in one Blitz run.', icon: 'zap', earned: (_, e) => (e.blitzScore ?? 0) >= 5 },
  { id: 'blitz-10', title: 'Lightning', description: 'Solve 10 words in one Blitz run.', icon: 'bolt', earned: (_, e) => (e.blitzScore ?? 0) >= 10 },
  { id: 'duo-win', title: 'Double trouble', description: 'Win a Duo game.', icon: 'columns', earned: (p) => p.duoWins >= 1 },
  { id: 'duo-quick', title: 'Twin strike', description: 'Win a Duo game in 4 guesses or fewer.', icon: 'swords', earned: (_, e) => e.mode === 'duo' && e.won && e.guesses <= 4 },
  { id: 'survival-5', title: 'Survivor', description: 'Solve 5 words in one Survival run.', icon: 'heart', earned: (_, e) => (e.survivalScore ?? 0) >= 5 },
  { id: 'survival-15', title: 'Last one standing', description: 'Solve 15 words in one Survival run.', icon: 'crown', earned: (_, e) => (e.survivalScore ?? 0) >= 15 },
  { id: 'quest-1', title: 'Quest taker', description: 'Complete a daily quest.', icon: 'scroll', earned: (p) => p.questsDone >= 1 },
  { id: 'quest-set', title: 'Full set', description: 'Complete all three daily quests in one day.', icon: 'list', earned: (p) => p.quests !== null && questsFor(p.quests.day).every((q) => (p.quests!.progress[q.id] ?? 0) >= q.target) },
  { id: 'quest-25', title: 'Adventurer', description: 'Complete 25 daily quests.', icon: 'map', earned: (p) => p.questsDone >= 25 },
  { id: 'level-5', title: 'Rising star', description: 'Reach level 5.', icon: 'star', earned: (p) => levelFor(p.xp).level >= 5 },
  { id: 'level-10', title: 'Word legend', description: 'Reach level 10.', icon: 'crown', earned: (p) => levelFor(p.xp).level >= 10 },
];

const MAX_GUESSES = 6;
const DUO_GUESSES = 7;
const APPLIED_LIMIT = 300;

/** XP for one finished game or run. */
export function xpFor(e: GameEvent): number {
  if (e.mode === 'blitz') return 10 + 25 * (e.blitzScore ?? 0);
  if (e.mode === 'survival') return 10 + 30 * (e.survivalScore ?? 0);
  if (!e.won) return 10;
  if (e.mode === 'duo') return 70 + (DUO_GUESSES - e.guesses) * 15;
  let xp = 50 + (MAX_GUESSES - e.guesses) * 15;
  if (e.hardMode) xp += 25;
  if (e.mode === 'daily') xp += 40;
  xp -= 20 * e.hints;
  return Math.max(15, xp);
}

/** Cumulative XP needed to reach `level` (level 1 starts at 0). */
export const xpForLevel = (level: number) => 50 * level * (level - 1);

const TITLES = ['Rookie', 'Letter Hunter', 'Word Seeker', 'Wordsmith', 'Lexicon Pro', 'Vocab Ace', 'Word Wizard', 'Grandmaster'];

export function levelFor(xp: number): { level: number; title: string; into: number; span: number } {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const start = xpForLevel(level);
  return {
    level,
    title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))]!,
    into: xp - start,
    span: xpForLevel(level + 1) - start,
  };
}

export interface ApplyResult {
  progress: Progress;
  xpGained: number;
  unlocked: Achievement[];
  /** New level when this event levelled the player up. */
  levelUp: number | null;
  /** Daily quests this event completed (their XP is included in xpGained). */
  questsCompleted: Quest[];
}

/** A run-based mode (Blitz, Survival) has no single win; everything else does. */
const isRun = (e: GameEvent) => e.mode === 'blitz' || e.mode === 'survival';

/**
 * Applies a finished game once. `day` is today's daily-challenge index, used
 * for the daily quests.
 */
export function applyEvent(progress: Progress, e: GameEvent, now: number, day = 0): ApplyResult {
  if (progress.applied.includes(e.id)) return { progress, xpGained: 0, unlocked: [], levelUp: null, questsCompleted: [] };

  const quests = advanceQuests(progress.quests, day, e);
  const xpGained = xpFor(e) + QUEST_XP * quests.completed.length;
  const next: Progress = {
    xp: progress.xp + xpGained,
    unlocked: { ...progress.unlocked },
    wins: progress.wins + (e.won && !isRun(e) ? 1 : 0),
    practiceWins: progress.practiceWins + (e.won && e.mode === 'practice' ? 1 : 0),
    bestBlitz: Math.max(progress.bestBlitz, e.blitzScore ?? 0),
    bestSurvival: Math.max(progress.bestSurvival, e.survivalScore ?? 0),
    duoWins: progress.duoWins + (e.won && e.mode === 'duo' ? 1 : 0),
    questsDone: progress.questsDone + quests.completed.length,
    quests: quests.state,
    applied: [...progress.applied, e.id].slice(-APPLIED_LIMIT),
  };

  const unlocked: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!next.unlocked[a.id] && a.earned(next, e)) {
      next.unlocked[a.id] = now;
      unlocked.push(a);
    }
  }

  const before = levelFor(progress.xp).level;
  const after = levelFor(next.xp).level;
  return { progress: next, xpGained, unlocked, levelUp: after > before ? after : null, questsCompleted: quests.completed };
}
