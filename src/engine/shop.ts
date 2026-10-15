/**
 * Wordskiis coins and the shop. Every finished game earns coins alongside
 * XP; coins buy tile themes and tile styles. Balance = starter coins +
 * earned − spent, so it adds up across devices like XP does (earned and
 * spent are both per-device counters) and purchases merge as a set.
 */
import type { Progress } from './progress';
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

export type TileStyleId = 'classic' | 'rounded' | 'bubble' | 'glass' | 'pixel' | 'neon' | 'gem';

export interface TileStyle {
  id: TileStyleId;
  name: string;
  description: string;
  /** Undefined = free for everyone. */
  price?: number;
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
    id: 'neon',
    name: 'Neon',
    description: 'Glowing outlines in the dark.',
    price: 1400,
  },
];

export interface ShopItem {
  /** `skin:<id>` or `tiles:<id>`. */
  id: string;
  kind: 'skin' | 'tiles';
  ref: ShopSkinId | TileStyleId;
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
