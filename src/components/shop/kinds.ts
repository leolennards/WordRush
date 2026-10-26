import type { ItemKind } from '@/engine';
import type { Settings } from '@/lib/storage/schemas';

/** Which setting each kind of item switches on. */
export const SETTING_FOR: Record<ItemKind, keyof Settings> = {
  skin: 'skin',
  tiles: 'tileStyle',
  keys: 'keySkin',
  sound: 'soundPack',
  fx: 'winFx',
  title: 'title',
};

export const KIND_LABEL: Record<ItemKind, string> = {
  skin: 'tile colours',
  tiles: 'tile style',
  keys: 'keyboard',
  sound: 'sound pack',
  fx: 'win effect',
  title: 'profile title',
};

/** What switching an item on does, for the "unlocked" card. */
export const KIND_DETAIL: Record<ItemKind, string> = {
  skin: 'Tile colours, now on',
  tiles: 'Tile style, now on',
  keys: 'Keyboard, now on',
  sound: 'Sound pack, now on',
  fx: 'Plays when you win',
  title: 'Shown under your name',
};

/** Why something is locked, for screen readers: its price or the level that unlocks it. */
export const lockLabel = (c: { price?: number; level?: number }) =>
  c.level !== undefined ? `unlocks at level ${c.level}` : `${c.price} coins in the shop`;

/** How grand a title looks: level-50+ titles in gold, level-100 ones in rainbow. */
export function titleTier(t: { level?: number; price?: number } | undefined): 'epic' | 'legend' | undefined {
  if (!t) return undefined;
  if ((t.level ?? 0) >= 100) return 'legend';
  if ((t.level ?? 0) >= 50 || (t.price ?? 0) >= 1200) return 'epic';
  return undefined;
}
