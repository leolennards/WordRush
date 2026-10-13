/**
 * Tower: climb floor after floor. Every floor is a word with a twist that
 * gets nastier as you rise; clearing a floor lets you pick a perk, and a
 * missed floor costs a heart.
 */
import type { Mod } from './types';

export type Twist = 'none' | 'fog' | 'blind' | 'liar' | 'hard';
export type Perk = 'heal' | 'lantern' | 'shield' | 'calm';

export const TOWER = { hearts: 3, maxHearts: 3 } as const;

export const TWISTS: Record<Twist, { name: string; description: string }> = {
  none: { name: 'Calm floor', description: 'No twist. Catch your breath.' },
  fog: { name: 'Fog', description: 'Only your latest guess stays visible.' },
  blind: { name: 'Blind keys', description: 'The keyboard shows no colours.' },
  liar: { name: 'Fibber', description: 'Every row tells exactly one lie.' },
  hard: { name: 'Hard mode', description: 'Revealed hints must be used.' },
};

export const PERKS: Record<Perk, { name: string; description: string }> = {
  heal: { name: 'Heal', description: 'Get a heart back (up to 3).' },
  lantern: { name: 'Lantern', description: 'Start the next floor with one letter revealed.' },
  shield: { name: 'Shield', description: 'Your next missed floor costs no heart.' },
  calm: { name: 'Clear skies', description: 'The next floor has no twist.' },
};

export interface TowerRun {
  id: number;
  /** Floor being played (1-based). */
  floor: number;
  hearts: number;
  shield: boolean;
  /** Effects bought for the next floor. */
  lantern: boolean;
  calm: boolean;
  /** Twists of the current floor. */
  twists: Twist[];
  /** Floors cleared and missed, in order. */
  log: { answer: string; won: boolean; twists: Twist[] }[];
  phase: 'intro' | 'playing' | 'perk' | 'over';
  /** Perks offered after a cleared floor. */
  offer: Perk[];
  /** Id of the last floor game counted. */
  lastGameId: string | null;
}

const pick = <T>(list: readonly T[], random: () => number) => list[Math.floor(random() * list.length)]!;

/** Twists for a floor: none on floor 1, one from floor 2, two from floor 6. */
export function twistsFor(floor: number, random: () => number): Twist[] {
  if (floor <= 1) return ['none'];
  const pool: Twist[] = floor < 4 ? ['fog', 'blind', 'hard'] : ['fog', 'blind', 'liar', 'hard'];
  const first = pick(pool, random);
  if (floor < 6) return [first];
  // Fibber and Hard mode don't mix (hard mode would enforce hidden truths).
  const second = pick(
    pool.filter((t) => t !== first && !(first === 'liar' && t === 'hard') && !(first === 'hard' && t === 'liar')),
    random,
  );
  return [first, second];
}

export function startTower(now: number, random: () => number): TowerRun {
  return {
    id: now,
    floor: 1,
    hearts: TOWER.hearts,
    shield: false,
    lantern: false,
    calm: false,
    twists: twistsFor(1, random),
    log: [],
    phase: 'intro',
    offer: [],
    lastGameId: null,
  };
}

export const towerMods = (twists: readonly Twist[]): Mod[] =>
  twists.filter((t): t is Mod => t === 'fog' || t === 'blind' || t === 'liar');

/** Pure: records a finished floor game. */
export function finishFloor(run: TowerRun, gameId: string, answer: string, won: boolean, random: () => number): TowerRun {
  if (run.lastGameId === gameId || run.phase !== 'playing') return run;
  const log = [...run.log, { answer, won, twists: run.twists }];
  if (won) {
    const all: Perk[] = ['heal', 'lantern', 'shield', 'calm'];
    const usable = all.filter((p) => !(p === 'heal' && run.hearts >= TOWER.maxHearts) && !(p === 'shield' && run.shield));
    const first = pick(usable, random);
    const second = pick(usable.filter((p) => p !== first), random);
    return { ...run, log, phase: 'perk', offer: [first, second], lastGameId: gameId };
  }
  const shielded = run.shield;
  const hearts = shielded ? run.hearts : run.hearts - 1;
  if (hearts <= 0) return { ...run, log, hearts: 0, phase: 'over', lastGameId: gameId };
  return nextFloor({ ...run, log, hearts, shield: false, lastGameId: gameId }, random);
}

/** Pure: applies the chosen perk and moves to the next floor. */
export function choosePerk(run: TowerRun, perk: Perk, random: () => number): TowerRun {
  if (run.phase !== 'perk' || !run.offer.includes(perk)) return run;
  const next = {
    ...run,
    hearts: perk === 'heal' ? Math.min(TOWER.maxHearts, run.hearts + 1) : run.hearts,
    shield: run.shield || perk === 'shield',
    lantern: perk === 'lantern',
    calm: perk === 'calm',
  };
  return nextFloor(next, random);
}

function nextFloor(run: TowerRun, random: () => number): TowerRun {
  const floor = run.floor + 1;
  return { ...run, floor, twists: run.calm ? ['none'] : twistsFor(floor, random), calm: false, phase: 'intro', offer: [] };
}

export const towerScore = (run: TowerRun) => run.log.filter((l) => l.won).length;
