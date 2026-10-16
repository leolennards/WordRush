/**
 * Level rewards: every few levels unlocks something, and the higher you go
 * the more special it gets (animated frames, banners and tile styles, and a
 * set of Wordskiis Legend rewards at level 100).
 */
import { COSMETICS, type CosmeticKind } from './shop';
import { SKINS } from './ranks';
import { TILE_PALS } from './profile';

export interface LevelReward {
  level: number;
  kind: CosmeticKind | 'skin' | 'pal';
  id: string;
  name: string;
  animated?: boolean;
}

export const LEVEL_REWARDS: readonly LevelReward[] = [
  ...(Object.entries(COSMETICS) as [CosmeticKind, readonly { id: string; name: string; level?: number; animated?: boolean }[]][]).flatMap(
    ([kind, list]) =>
      list
        .filter((c) => c.level !== undefined)
        .map((c): LevelReward => ({ level: c.level!, kind, id: c.id, name: c.name, ...(c.animated ? { animated: true } : {}) })),
  ),
  ...SKINS.filter((s) => !s.free && s.price === undefined).map(
    (s): LevelReward => ({ level: s.minLevel, kind: 'skin', id: s.id, name: s.name, ...(s.animated ? { animated: true } : {}) }),
  ),
  ...TILE_PALS.filter((p) => p.level !== undefined).map((p): LevelReward => ({ level: p.level!, kind: 'pal', id: p.id, name: p.name })),
].sort((a, b) => a.level - b.level);

/** Rewards for reaching levels after `from`, up to and including `to`. */
export const rewardsBetween = (from: number, to: number) => LEVEL_REWARDS.filter((r) => r.level > from && r.level <= to);

/** The next level that brings a reward, and what it brings. */
export function nextRewards(level: number): { level: number; rewards: LevelReward[] } | null {
  const next = LEVEL_REWARDS.find((r) => r.level > level);
  return next ? { level: next.level, rewards: LEVEL_REWARDS.filter((r) => r.level === next.level) } : null;
}

/** What each kind of reward is called. */
export const REWARD_KIND: Record<LevelReward['kind'], string> = {
  skin: 'Tile colours',
  tiles: 'Tile style',
  keys: 'Keyboard',
  sound: 'Sound pack',
  fx: 'Win effect',
  bg: 'Background',
  accent: 'App colour',
  frame: 'Frame',
  badge: 'Badge',
  title: 'Title',
  banner: 'Banner',
  pal: 'Tile Pal',
};
