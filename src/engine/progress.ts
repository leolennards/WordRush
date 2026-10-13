/**
 * Levels, experience points and achievements. Pure and idempotent: every
 * finished game is applied once by its id, so refreshes or duplicate effects
 * never award anything twice.
 */
import { QUEST_XP, advanceQuests, questsFor, type Quest, type QuestState } from './quests';
import type { Mod } from './types';
import { rankFor, type Rank } from './ranks';

/** XP multiplier for each mod on a won game. */
export const MOD_BONUS: Record<Mod, number> = { fog: 0.3, blind: 0.25, liar: 0.4 };

export type ProgressMode = 'daily' | 'practice' | 'blitz' | 'duo' | 'quad' | 'survival' | 'ladder' | 'duel' | 'reverse' | 'tower';

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
  /** The answers played, for the Word Book. */
  words?: { answer: string; won: boolean }[];
  /** Practice mods that were on. */
  mods?: Mod[];
  /** Daily Rush run. */
  rush?: boolean;
  /** Word Ladder: stars earned (0–3). */
  stars?: number;
  /** Bot Duel: the bot's difficulty. */
  bot?: 'easy' | 'medium' | 'hard';
  /** Reverse: rounds solved, and whether no life was lost. */
  reverseScore?: number;
  flawless?: boolean;
  /** Tower: floors cleared in the run. */
  towerFloors?: number;
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
  quadWins: number;
  duelWins: number;
  bestTower: number;
  bestReverse: number;
  /** Answers played in all modes (counted per game). */
  wordsPlayed: number;
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
  quadWins: 0,
  duelWins: 0,
  bestTower: 0,
  bestReverse: 0,
  wordsPlayed: 0,
  questsDone: 0,
  quests: null,
  applied: [],
});

export interface Achievement {
  id: string;
  title: string;
  description: string;
  /** Lucide icon name used by the UI. */
  icon: 'sparkles' | 'target' | 'crosshair' | 'shield' | 'flame' | 'calendar' | 'crown' | 'skull' | 'dumbbell' | 'medal' | 'timer' | 'zap' | 'bolt' | 'star' | 'brain' | 'scroll' | 'list' | 'map' | 'columns' | 'heart' | 'swords' | 'grid' | 'broom' | 'cloud' | 'eyeoff' | 'rocket' | 'book' | 'gem' | 'trophy' | 'ladder' | 'stairs' | 'bot' | 'castle' | 'reverse' | 'mask';
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
  { id: 'quad-win', title: 'Four of a kind', description: 'Win a Quad game.', icon: 'grid', earned: (p) => p.quadWins >= 1 },
  { id: 'quad-quick', title: 'Clean sweep', description: 'Win a Quad game in 6 guesses or fewer.', icon: 'broom', earned: (_, e) => e.mode === 'quad' && e.won && e.guesses <= 6 },
  { id: 'ladder-win', title: 'Climber', description: 'Finish a Word Ladder.', icon: 'ladder', earned: (_, e) => e.mode === 'ladder' && e.won },
  { id: 'ladder-perfect', title: 'Perfect climb', description: 'Finish a Word Ladder in par for 3 stars.', icon: 'stairs', earned: (_, e) => e.mode === 'ladder' && (e.stars ?? 0) >= 3 },
  { id: 'duel-win', title: 'Beat the bot', description: 'Win a Bot Duel.', icon: 'bot', earned: (_, e) => e.mode === 'duel' && e.won },
  { id: 'duel-hard', title: 'Machine breaker', description: 'Beat Oracle, the hardest bot.', icon: 'swords', earned: (_, e) => e.mode === 'duel' && e.won && e.bot === 'hard' },
  { id: 'tower-5', title: 'Climber of towers', description: 'Clear 5 floors in one Tower run.', icon: 'castle', earned: (_, e) => (e.towerFloors ?? 0) >= 5 },
  { id: 'tower-15', title: 'Sky high', description: 'Clear 15 floors in one Tower run.', icon: 'crown', earned: (_, e) => (e.towerFloors ?? 0) >= 15 },
  { id: 'reverse-flawless', title: 'Mind reader', description: 'Solve all 5 Reverse rounds without losing a life.', icon: 'reverse', earned: (_, e) => e.mode === 'reverse' && !!e.flawless && (e.reverseScore ?? 0) >= 5 },
  { id: 'liar-win', title: 'Lie detector', description: 'Win a Practice word with Fibber on.', icon: 'mask', earned: (_, e) => e.won && !!e.mods?.includes('liar') },
  { id: 'fog-win', title: 'Through the fog', description: 'Win a Practice word with Fog on.', icon: 'cloud', earned: (_, e) => e.won && !!e.mods?.includes('fog') },
  { id: 'blind-win', title: 'Blindfolded', description: 'Win a Practice word with Blind keys on.', icon: 'eyeoff', earned: (_, e) => e.won && !!e.mods?.includes('blind') },
  { id: 'rush', title: 'Rush hour', description: 'Play a Daily Rush.', icon: 'rocket', earned: (_, e) => !!e.rush },
  { id: 'words-100', title: 'Logophile', description: 'Play 100 words in any mode.', icon: 'book', earned: (p) => p.wordsPlayed >= 100 },
  { id: 'survival-5', title: 'Survivor', description: 'Solve 5 words in one Survival run.', icon: 'heart', earned: (_, e) => (e.survivalScore ?? 0) >= 5 },
  { id: 'survival-15', title: 'Last one standing', description: 'Solve 15 words in one Survival run.', icon: 'crown', earned: (_, e) => (e.survivalScore ?? 0) >= 15 },
  { id: 'quest-1', title: 'Quest taker', description: 'Complete a daily quest.', icon: 'scroll', earned: (p) => p.questsDone >= 1 },
  { id: 'quest-set', title: 'Full set', description: 'Complete all three daily quests in one day.', icon: 'list', earned: (p) => p.quests !== null && questsFor(p.quests.day).every((q) => (p.quests!.progress[q.id] ?? 0) >= q.target) },
  { id: 'quest-25', title: 'Adventurer', description: 'Complete 25 daily quests.', icon: 'map', earned: (p) => p.questsDone >= 25 },
  { id: 'level-5', title: 'Rising star', description: 'Reach level 5.', icon: 'star', earned: (p) => levelFor(p.xp).level >= 5 },
  { id: 'level-10', title: 'Wordsmith', description: 'Reach level 10 and the Wordsmith rank.', icon: 'crown', earned: (p) => levelFor(p.xp).level >= 10 },
  { id: 'level-25', title: 'Lexicon', description: 'Reach level 25.', icon: 'medal', earned: (p) => levelFor(p.xp).level >= 25 },
  { id: 'level-50', title: 'Virtuoso', description: 'Reach level 50.', icon: 'gem', earned: (p) => levelFor(p.xp).level >= 50 },
  { id: 'level-100', title: 'Wordskiis Legend', description: 'Reach level 100.', icon: 'trophy', earned: (p) => levelFor(p.xp).level >= 100 },
];

const MAX_GUESSES = 6;
const DUO_GUESSES = 7;
const QUAD_GUESSES = 9;
const APPLIED_LIMIT = 300;

/** XP for one finished game or run. */
export function xpFor(e: GameEvent): number {
  if (e.mode === 'blitz') return 10 + 25 * (e.blitzScore ?? 0);
  if (e.mode === 'survival') return 10 + 30 * (e.survivalScore ?? 0);
  if (e.mode === 'ladder') return e.won ? 50 + 30 * (e.stars ?? 1) : 10;
  if (e.mode === 'tower') return 10 + 45 * (e.towerFloors ?? 0);
  if (e.mode === 'reverse') return 10 + 30 * (e.reverseScore ?? 0) + (e.flawless ? 50 : 0);
  if (e.mode === 'duel') {
    if (!e.won) return 10;
    return 60 + { easy: 0, medium: 30, hard: 70 }[e.bot ?? 'easy'] + (MAX_GUESSES - e.guesses) * 10;
  }
  if (!e.won) return 10;
  if (e.mode === 'duo') return 70 + (DUO_GUESSES - e.guesses) * 15;
  if (e.mode === 'quad') return 120 + (QUAD_GUESSES - e.guesses) * 20;
  let xp = 50 + (MAX_GUESSES - e.guesses) * 15;
  if (e.hardMode) xp += 25;
  if (e.mode === 'daily') xp += 40;
  xp -= 20 * e.hints;
  const bonus = (e.mods ?? []).reduce((sum, m) => sum + MOD_BONUS[m], 0);
  return Math.max(15, Math.round(xp * (1 + bonus)));
}

/** Cumulative XP needed to reach `level` (level 1 starts at 0). */
/**
 * Cumulative XP needed to reach `level` (level 1 starts at 0): 100 for level 2,
 * then each level costs 40 more than the last. Level 100 needs ~204k XP.
 */
export const xpForLevel = (level: number) => 20 * level * (level - 1) + 60 * (level - 1);

export function levelFor(xp: number): { level: number; title: string; into: number; span: number } {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const start = xpForLevel(level);
  return {
    level,
    title: rankFor(level).rank.name,
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
  /** New rank when the level-up crossed into a new rank. */
  rankUp: Rank | null;
  /** Daily quests this event completed (their XP is included in xpGained). */
  questsCompleted: Quest[];
}

/** A run-based mode (Blitz, Survival) has no single win; everything else does. */
const isRun = (e: GameEvent) => e.mode === 'blitz' || e.mode === 'survival' || e.mode === 'tower' || e.mode === 'reverse';

/**
 * Applies a finished game once. `day` is today's daily-challenge index, used
 * for the daily quests.
 */
export function applyEvent(progress: Progress, e: GameEvent, now: number, day = 0): ApplyResult {
  if (progress.applied.includes(e.id)) {
    return { progress, xpGained: 0, unlocked: [], levelUp: null, rankUp: null, questsCompleted: [] };
  }

  const quests = advanceQuests(progress.quests, day, e);
  const xpGained = xpFor(e) + QUEST_XP * quests.completed.length;
  const next: Progress = {
    xp: progress.xp + xpGained,
    unlocked: { ...progress.unlocked },
    wins: progress.wins + (e.won && !isRun(e) && e.mode !== 'ladder' ? 1 : 0),
    practiceWins: progress.practiceWins + (e.won && e.mode === 'practice' ? 1 : 0),
    bestBlitz: Math.max(progress.bestBlitz, e.blitzScore ?? 0),
    bestSurvival: Math.max(progress.bestSurvival, e.survivalScore ?? 0),
    duoWins: progress.duoWins + (e.won && e.mode === 'duo' ? 1 : 0),
    quadWins: progress.quadWins + (e.won && e.mode === 'quad' ? 1 : 0),
    duelWins: progress.duelWins + (e.won && e.mode === 'duel' ? 1 : 0),
    bestTower: Math.max(progress.bestTower, e.towerFloors ?? 0),
    bestReverse: Math.max(progress.bestReverse, e.reverseScore ?? 0),
    wordsPlayed: progress.wordsPlayed + (e.words?.length ?? 0),
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
  const rankBefore = rankFor(before).rank;
  const rankAfter = rankFor(after).rank;
  return {
    progress: next,
    xpGained,
    unlocked,
    levelUp: after > before ? after : null,
    rankUp: rankAfter.id !== rankBefore.id ? rankAfter : null,
    questsCompleted: quests.completed,
  };
}
