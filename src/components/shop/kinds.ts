import type { ItemKind } from '@/engine';
import type { Settings } from '@/lib/storage/schemas';

/** Which setting each kind of item switches on. */
export const SETTING_FOR: Record<ItemKind, keyof Settings> = {
  skin: 'skin',
  tiles: 'tileStyle',
  keys: 'keySkin',
  sound: 'soundPack',
  fx: 'winFx',
  bg: 'background',
  accent: 'accent',
  frame: 'frame',
  badge: 'badge',
  title: 'title',
  banner: 'banner',
};

export const KIND_LABEL: Record<ItemKind, string> = {
  skin: 'tile colours',
  tiles: 'tile style',
  keys: 'keyboard',
  sound: 'sound pack',
  fx: 'win effect',
  bg: 'background',
  accent: 'app colour',
  frame: 'avatar frame',
  badge: 'avatar badge',
  title: 'profile title',
  banner: 'profile banner',
};

/** What switching an item on does, for the "unlocked" card. */
export const KIND_DETAIL: Record<ItemKind, string> = {
  skin: 'Tile colours, now on',
  tiles: 'Tile style, now on',
  keys: 'Keyboard, now on',
  sound: 'Sound pack, now on',
  fx: 'Plays when you win',
  bg: 'Background, now on',
  accent: 'App colour, now on',
  frame: 'Your friends will see it',
  badge: 'Your friends will see it',
  title: 'Shown under your name',
  banner: 'On your profile card',
};
