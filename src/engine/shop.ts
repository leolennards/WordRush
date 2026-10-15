/**
 * Wordskiis coins and the shop. Every finished game earns coins alongside
 * XP; coins buy tile themes, tile styles and win effects. Balance = starter coins +
 * earned − spent, so it adds up across devices like XP does (earned and
 * spent are both per-device counters) and purchases merge as a set.
 */
import { APPLIED_LIMIT, type Progress } from './progress';
import { seededRandom } from './blitz';
import { SKINS, type ShopSkinId } from './ranks';

/** Everyone starts with enough for a first look around the shop. */
export const STARTER_COINS = 150;
/** Coin rewards on top of a game's share of its XP. */
export const COIN_REWARDS = {
  perXp: 1 / 5,
  achievement: 20,
  level: 25,
  rank: 100,
} as const;
/** Today's deal: one item at this discount. */
export const DEAL_DISCOUNT = 0.3;

export type TileStyleId =
  | 'classic' | 'rounded' | 'bubble' | 'glass' | 'pixel' | 'neon' | 'gem'
  | 'shimmer' | 'frost' | 'jelly' | 'blaze';

export interface TileStyle {
  id: TileStyleId;
  name: string;
  description: string;
  /** Undefined = free for everyone. */
  price?: number;
  animated?: boolean;
}

export const TILE_STYLES: readonly TileStyle[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'The original crisp squares.',
  },
  {
    id: 'rounded',
    name: 'Soft',
    description: 'Extra-round corners, easy on the eyes.',
    price: 300,
  },
  {
    id: 'bubble',
    name: 'Bubble',
    description: 'Perfect circles that pop.',
    price: 500,
  },
  {
    id: 'pixel',
    name: 'Pixel',
    description: 'Chunky 8-bit blocks.',
    price: 600,
  },
  {
    id: 'glass',
    name: 'Glass',
    description: 'Glossy tiles with a shine.',
    price: 800,
  },
  {
    id: 'gem',
    name: 'Gem',
    description: 'Cut like jewels, with facets.',
    price: 1200,
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    description: 'A sweep of light glints across your tiles.',
    price: 1000,
    animated: true,
  },
  {
    id: 'frost',
    name: 'Frost',
    description: 'Icy edges with twinkling sparkles.',
    price: 1300,
    animated: true,
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Glowing outlines in the dark.',
    price: 1400,
  },
  {
    id: 'jelly',
    name: 'Jelly',
    description: 'Squishy tiles that wobble in a wave.',
    price: 1500,
    animated: true,
  },
  {
    id: 'blaze',
    name: 'Blaze',
    description: 'Tiles that flicker with fire.',
    price: 2000,
    animated: true,
  },
];

export type WinFxId = 'confetti' | 'hearts' | 'coins' | 'stars' | 'fireworks';

export interface WinFx {
  id: WinFxId;
  name: string;
  description: string;
  /** Undefined = free for everyone. */
  price?: number;
}

/** What bursts out of the board when you win. */
export const WIN_EFFECTS: readonly WinFx[] = [
  { id: 'confetti', name: 'Confetti', description: 'The classic burst of tiles.' },
  { id: 'hearts', name: 'Love Hearts', description: 'A flutter of floating hearts.', price: 700 },
  { id: 'coins', name: 'Coin Shower', description: 'It rains Wordskiis coins.', price: 900 },
  { id: 'stars', name: 'Starfall', description: 'Twinkling stars shoot out and fall.', price: 1200 },
  { id: 'fireworks', name: 'Fireworks', description: 'Rockets burst into sparks.', price: 1600 },
];

export interface ShopItem {
  /** `skin:<id>`, `tiles:<id>` or `fx:<id>`. */
  id: string;
  kind: 'skin' | 'tiles' | 'fx';
  ref: ShopSkinId | TileStyleId | WinFxId;
  name: string;
  description: string;
  price: number;
  animated?: boolean;
}

export const SHOP_ITEMS: readonly ShopItem[] = [
  ...SKINS.filter((s) => s.price !== undefined).map((s): ShopItem => ({
    id: `skin:${s.id}`,
    kind: 'skin',
    ref: s.id as ShopSkinId,
    name: s.name,
    description: s.animated ? 'Animated tile colours.' : 'Tile colours.',
    price: s.price!,
    ...(s.animated ? { animated: true } : {}),
  })),
  ...TILE_STYLES.filter((t) => t.price !== undefined).map((t): ShopItem => ({
    id: `tiles:${t.id}`,
    kind: 'tiles',
    ref: t.id,
    name: t.name,
    description: t.description,
    price: t.price!,
    ...(t.animated ? { animated: true } : {}),
  })),
  ...WIN_EFFECTS.filter((f) => f.price !== undefined).map((f): ShopItem => ({
    id: `fx:${f.id}`,
    kind: 'fx',
    ref: f.id,
    name: f.name,
    description: f.description,
    price: f.price!,
    animated: true,
  })),
];

export const shopItem = (id: string) => SHOP_ITEMS.find((i) => i.id === id) ?? null;

export const coinBalance = (p: Pick<Progress, 'coins' | 'spent'>) => Math.max(0, STARTER_COINS + p.coins - p.spent);

export const owns = (p: Pick<Progress, 'owned'>, itemId: string) => p.owned.includes(itemId);

export function tileStyleUnlocked(id: TileStyleId, owned: readonly string[]): boolean {
  const t = TILE_STYLES.find((x) => x.id === id);
  if (!t) return false;
  return t.price === undefined || owned.includes(`tiles:${id}`);
}

export function winFxUnlocked(id: WinFxId, owned: readonly string[]): boolean {
  const f = WIN_EFFECTS.find((x) => x.id === id);
  if (!f) return false;
  return f.price === undefined || owned.includes(`fx:${id}`);
}

/** Coins for one finished game, from what it earned. */
export function coinsFor(xpGained: number, achievements: number, levelsGained: number, rankUp: boolean): number {
  return (
    Math.round(xpGained * COIN_REWARDS.perXp) +
    achievements * COIN_REWARDS.achievement +
    levelsGained * COIN_REWARDS.level +
    (rankUp ? COIN_REWARDS.rank : 0)
  );
}

/** The day's deal: the same item for everyone, changing at 00:00 UTC. */
export function dailyDeal(day: number): { item: ShopItem; price: number } {
  const rand = seededRandom(day * 2654435761 + 97);
  rand();
  const item = SHOP_ITEMS[Math.floor(rand() * SHOP_ITEMS.length)]!;
  return {
    item,
    price: Math.round((item.price * (1 - DEAL_DISCOUNT)) / 10) * 10,
  };
}

export const priceFor = (item: ShopItem, day: number) => (dailyDeal(day).item.id === item.id ? dailyDeal(day).price : item.price);

export type BuyResult = { ok: true; progress: Progress; price: number } | { ok: false; reason: 'unknown' | 'owned' | 'funds' };

/** Buys an item: spends its price (today's deal price when it's the deal) and adds it to what you own. */
export function buyItem(p: Progress, itemId: string, day: number): BuyResult {
  const item = shopItem(itemId);
  if (!item) return { ok: false, reason: 'unknown' };
  if (owns(p, itemId)) return { ok: false, reason: 'owned' };
  const price = priceFor(item, day);
  if (coinBalance(p) < price) return { ok: false, reason: 'funds' };
  return {
    ok: true,
    price,
    progress: { ...p, spent: p.spent + price, owned: [...p.owned, itemId] },
  };
}

/** The free daily chest: once a day, the same prize for everyone that day. */
export const CHEST = { min: 20, max: 80 } as const;

const chestId = (day: number) => `chest-${day}`;

export function chestCoins(day: number): number {
  const rand = seededRandom(day * 40503 + 11);
  rand();
  return CHEST.min + Math.round((rand() * (CHEST.max - CHEST.min)) / 5) * 5;
}

/** Whether today's chest is still closed. Claims travel with your other synced games, so it opens once across devices. */
export const chestReady = (p: Pick<Progress, 'applied'>, day: number) => !p.applied.includes(chestId(day));

export function openChest(p: Progress, day: number): { ok: true; progress: Progress; coins: number } | { ok: false } {
  if (!chestReady(p, day)) return { ok: false };
  const coins = chestCoins(day);
  return {
    ok: true,
    coins,
    progress: { ...p, coins: p.coins + coins, applied: [...p.applied, chestId(day)].slice(-APPLIED_LIMIT) },
  };
}
