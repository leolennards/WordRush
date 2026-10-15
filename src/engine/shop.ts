/**
 * Wordskiis coins and the shop. Every finished game earns coins alongside
 * XP; coins buy tile colours, tile styles, keyboards, sound packs, win
 * effects, avatar frames and badges, plus streak freezes and mystery boxes.
 * Balance = starter coins + earned − spent, so it adds up across devices like
 * XP does (earned and spent are both per-device counters) and purchases merge
 * as a set.
 */
import { APPLIED_LIMIT, type Progress } from './progress';
import { seededRandom } from './blitz';
import { SKINS, type ShopSkinId } from './ranks';
import { HALLOWEEN, WINTER, inSeason, type Season } from './season';

/** Everyone starts with enough for a first look around the shop. */
export const STARTER_COINS = 150;
/** Coin rewards on top of a game's share of its XP. */
export const COIN_REWARDS = {
  perXp: 1 / 5,
  achievement: 20,
  level: 25,
  rank: 100,
  /** Solving a word with your very first guess. */
  firstGuess: 50,
  /** Finishing all of the day's quests. */
  allQuests: 40,
  /** Every 7 days of Daily streak. */
  streakWeek: 100,
} as const;
/** Today's deal: one item at this discount. */
export const DEAL_DISCOUNT = 0.3;

/** A cosmetic in the shop: free ones have no price. */
interface Cosmetic<Id extends string> {
  id: Id;
  name: string;
  description: string;
  /** Undefined = free for everyone. */
  price?: number;
  animated?: boolean;
  /** Only on sale at this time of year. */
  season?: Season;
}

export type TileStyleId =
  | 'classic' | 'rounded' | 'bubble' | 'glass' | 'pixel' | 'neon' | 'gem'
  | 'shimmer' | 'frost' | 'jelly' | 'blaze';
export type TileStyle = Cosmetic<TileStyleId>;

export const TILE_STYLES: readonly TileStyle[] = [
  { id: 'classic', name: 'Classic', description: 'The original crisp squares.' },
  { id: 'rounded', name: 'Soft', description: 'Extra-round corners, easy on the eyes.', price: 300 },
  { id: 'bubble', name: 'Bubble', description: 'Perfect circles that pop.', price: 500 },
  { id: 'pixel', name: 'Pixel', description: 'Chunky 8-bit blocks.', price: 600 },
  { id: 'glass', name: 'Glass', description: 'Glossy tiles with a shine.', price: 800 },
  { id: 'gem', name: 'Gem', description: 'Cut like jewels, with facets.', price: 1200 },
  { id: 'shimmer', name: 'Shimmer', description: 'A sweep of light glints across your tiles.', price: 1000, animated: true },
  { id: 'frost', name: 'Frost', description: 'Icy edges with twinkling sparkles.', price: 1300, animated: true },
  { id: 'neon', name: 'Neon', description: 'Glowing outlines in the dark.', price: 1400 },
  { id: 'jelly', name: 'Jelly', description: 'Squishy tiles that wobble in a wave.', price: 1500, animated: true },
  { id: 'blaze', name: 'Blaze', description: 'Tiles that flicker with fire.', price: 2000, animated: true },
];

export type WinFxId = 'confetti' | 'hearts' | 'coins' | 'stars' | 'fireworks' | 'bats' | 'snow';
export type WinFx = Cosmetic<WinFxId>;

/** What bursts out of the board when you win. */
export const WIN_EFFECTS: readonly WinFx[] = [
  { id: 'confetti', name: 'Confetti', description: 'The classic burst of tiles.' },
  { id: 'hearts', name: 'Love Hearts', description: 'A flutter of floating hearts.', price: 700 },
  { id: 'coins', name: 'Coin Shower', description: 'It rains Wordskiis coins.', price: 900 },
  { id: 'stars', name: 'Starfall', description: 'Twinkling stars shoot out and fall.', price: 1200 },
  { id: 'fireworks', name: 'Fireworks', description: 'Rockets burst into sparks.', price: 1600 },
  { id: 'bats', name: 'Bat Swarm', description: 'A spooky swarm flaps out of the board.', price: 1000, season: HALLOWEEN },
  { id: 'snow', name: 'Snowfall', description: 'Soft snowflakes drift down.', price: 1000, season: WINTER },
];

export type KeySkinId = 'classic' | 'candy' | 'typewriter' | 'mech' | 'neon';
export type KeySkin = Cosmetic<KeySkinId>;

/** The on-screen keyboard's look. */
export const KEY_SKINS: readonly KeySkin[] = [
  { id: 'classic', name: 'Classic', description: 'The standard keys.' },
  { id: 'candy', name: 'Candy Pop', description: 'Round pastel keys that squish.', price: 600 },
  { id: 'typewriter', name: 'Typewriter', description: 'Round vintage keys with metal rims.', price: 700 },
  { id: 'mech', name: 'Mechanical', description: 'Chunky keycaps you can almost hear.', price: 900 },
  { id: 'neon', name: 'Neon Glow', description: 'Glowing outlines that pulse.', price: 1000, animated: true },
];

export type SoundPackId = 'classic' | 'bubbles' | 'marimba' | 'arcade' | 'typewriter';
export type SoundPack = Cosmetic<SoundPackId>;

/** How typing, reveals and wins sound (with sound effects on). */
export const SOUND_PACKS: readonly SoundPack[] = [
  { id: 'classic', name: 'Classic', description: 'Soft, simple tones.' },
  { id: 'bubbles', name: 'Bubble Pop', description: 'Every key goes pop.', price: 500 },
  { id: 'marimba', name: 'Marimba', description: 'Warm wooden notes.', price: 600 },
  { id: 'arcade', name: '8-bit Arcade', description: 'Retro bleeps and a victory jingle.', price: 700 },
  { id: 'typewriter', name: 'Typewriter', description: 'Clacky keys and a bell.', price: 700 },
];

export type FrameId = 'none' | 'gold' | 'neon' | 'rainbow' | 'flames';
export type Frame = Cosmetic<FrameId>;

/** A ring around your avatar, shown to friends. */
export const FRAMES: readonly Frame[] = [
  { id: 'none', name: 'No frame', description: 'Just your avatar.' },
  { id: 'gold', name: 'Gold Ring', description: 'A polished gold ring.', price: 500 },
  { id: 'neon', name: 'Neon Ring', description: 'A glowing cyan ring.', price: 700 },
  { id: 'rainbow', name: 'Rainbow Ring', description: 'A spinning ring of every colour.', price: 1200, animated: true },
  { id: 'flames', name: 'Flame Ring', description: 'Your avatar, on fire.', price: 1500, animated: true },
];

export type BadgeId = 'none' | 'star' | 'heart' | 'bolt' | 'crown' | 'diamond';
export type Badge = Cosmetic<BadgeId>;

/** A small badge on your avatar, shown to friends. */
export const BADGES: readonly Badge[] = [
  { id: 'none', name: 'No badge', description: 'Keep it clean.' },
  { id: 'star', name: 'Star', description: 'A shining gold star.', price: 300 },
  { id: 'heart', name: 'Heart', description: 'Spread the love.', price: 300 },
  { id: 'bolt', name: 'Lightning', description: 'For the speedy solvers.', price: 400 },
  { id: 'crown', name: 'Crown', description: 'Word royalty.', price: 800 },
  { id: 'diamond', name: 'Diamond', description: 'Rare and brilliant.', price: 1000 },
];

export type ItemKind = 'skin' | 'tiles' | 'keys' | 'sound' | 'fx' | 'frame' | 'badge';
export type CosmeticKind = Exclude<ItemKind, 'skin'>;

export interface ShopItem {
  /** `<kind>:<id>`, e.g. `skin:galaxy`, `tiles:jelly`, `fx:hearts`. */
  id: string;
  kind: ItemKind;
  ref: string;
  name: string;
  description: string;
  price: number;
  animated?: boolean;
  season?: Season;
}

export const COSMETICS: Record<CosmeticKind, readonly Cosmetic<string>[]> = {
  tiles: TILE_STYLES,
  keys: KEY_SKINS,
  sound: SOUND_PACKS,
  fx: WIN_EFFECTS,
  frame: FRAMES,
  badge: BADGES,
};

const fromCosmetic = (kind: CosmeticKind, c: Cosmetic<string>): ShopItem => ({
  id: `${kind}:${c.id}`,
  kind,
  ref: c.id,
  name: c.name,
  description: c.description,
  price: c.price!,
  ...(c.animated || kind === 'fx' ? { animated: true } : {}),
  ...(c.season ? { season: c.season } : {}),
});

export const SHOP_ITEMS: readonly ShopItem[] = [
  ...SKINS.filter((s) => s.price !== undefined).map(
    (s): ShopItem => ({
      id: `skin:${s.id}`,
      kind: 'skin',
      ref: s.id as ShopSkinId,
      name: s.name,
      description: s.animated ? 'Animated tile colours.' : 'Tile colours.',
      price: s.price!,
      ...(s.animated ? { animated: true } : {}),
      ...(s.season ? { season: s.season } : {}),
    }),
  ),
  ...(Object.entries(COSMETICS) as [CosmeticKind, readonly Cosmetic<string>[]][]).flatMap(([kind, list]) =>
    list.filter((c) => c.price !== undefined).map((c) => fromCosmetic(kind, c)),
  ),
];

export const shopItem = (id: string) => SHOP_ITEMS.find((i) => i.id === id) ?? null;

/** Whether an item is on sale today (limited-time items only in their season). */
export const onSale = (item: Pick<ShopItem, 'season'>, date: Date) => !item.season || inSeason(item.season, date);

export const coinBalance = (p: Pick<Progress, 'coins' | 'spent'>) => Math.max(0, STARTER_COINS + p.coins - p.spent);

export const owns = (p: Pick<Progress, 'owned'>, itemId: string) => p.owned.includes(itemId);

/** A cosmetic (anything but tile colours) is usable when it's free or bought. */
export function cosmeticUnlocked(kind: CosmeticKind, id: string, owned: readonly string[]): boolean {
  const c = COSMETICS[kind].find((x) => x.id === id);
  if (!c) return false;
  return c.price === undefined || owned.includes(`${kind}:${id}`);
}

export const tileStyleUnlocked = (id: TileStyleId, owned: readonly string[]) => cosmeticUnlocked('tiles', id, owned);
export const winFxUnlocked = (id: WinFxId, owned: readonly string[]) => cosmeticUnlocked('fx', id, owned);

/** Coin bonuses a game can earn on top of its share of XP. */
export interface CoinBonus {
  id: 'firstGuess' | 'allQuests' | 'streakWeek';
  label: string;
  coins: number;
}

/** Coins for one finished game, from what it earned. */
export function coinsFor(
  xpGained: number,
  achievements: number,
  levelsGained: number,
  rankUp: boolean,
  bonuses: readonly CoinBonus[] = [],
): number {
  return (
    Math.round(xpGained * COIN_REWARDS.perXp) +
    achievements * COIN_REWARDS.achievement +
    levelsGained * COIN_REWARDS.level +
    (rankUp ? COIN_REWARDS.rank : 0) +
    bonuses.reduce((sum, b) => sum + b.coins, 0)
  );
}

/** Items that can be today's deal: everything except limited-time items. */
const DEAL_POOL = SHOP_ITEMS.filter((i) => !i.season);

/** The day's deal: the same item for everyone, changing at 00:00 UTC. */
export function dailyDeal(day: number): { item: ShopItem; price: number } {
  const rand = seededRandom(day * 2654435761 + 97);
  rand();
  const item = DEAL_POOL[Math.floor(rand() * DEAL_POOL.length)]!;
  return {
    item,
    price: Math.round((item.price * (1 - DEAL_DISCOUNT)) / 10) * 10,
  };
}

export const priceFor = (item: ShopItem, day: number) => (dailyDeal(day).item.id === item.id ? dailyDeal(day).price : item.price);

export type BuyResult =
  | { ok: true; progress: Progress; price: number }
  | { ok: false; reason: 'unknown' | 'owned' | 'funds' | 'season' };

/** Buys an item: spends its price (today's deal price when it's the deal) and adds it to what you own. */
export function buyItem(p: Progress, itemId: string, day: number, date: Date): BuyResult {
  const item = shopItem(itemId);
  if (!item) return { ok: false, reason: 'unknown' };
  if (owns(p, itemId)) return { ok: false, reason: 'owned' };
  if (!onSale(item, date)) return { ok: false, reason: 'season' };
  const price = priceFor(item, day);
  if (coinBalance(p) < price) return { ok: false, reason: 'funds' };
  return {
    ok: true,
    price,
    progress: { ...p, spent: p.spent + price, owned: [...p.owned, itemId] },
  };
}

// ---------- The daily chest ----------

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

// ---------- Mystery box ----------

export const MYSTERY_PRICE = 600;

/** What a mystery box can hold: anything you don't own yet (limited-time items excepted). */
export const mysteryPool = (p: Pick<Progress, 'owned'>) => SHOP_ITEMS.filter((i) => !i.season && !owns(p, i.id));

/** Opens a mystery box; `roll` in [0, 1) picks the prize. */
export function openMystery(
  p: Progress,
  roll: number,
): { ok: true; progress: Progress; item: ShopItem } | { ok: false; reason: 'empty' | 'funds' } {
  const pool = mysteryPool(p);
  if (!pool.length) return { ok: false, reason: 'empty' };
  if (coinBalance(p) < MYSTERY_PRICE) return { ok: false, reason: 'funds' };
  const item = pool[Math.min(pool.length - 1, Math.floor(roll * pool.length))]!;
  return { ok: true, item, progress: { ...p, spent: p.spent + MYSTERY_PRICE, owned: [...p.owned, item.id] } };
}

// ---------- Streak freezes ----------

/**
 * A streak freeze covers one missed Daily Challenge so your streak carries on.
 * Each bought freeze is `freeze:<token>` in what you own and each covered day
 * is `frozen:<day>`, so both merge across devices like other purchases.
 */
export const FREEZE_PRICE = 250;
export const MAX_FREEZES = 2;

const FREEZE_RE = /^freeze:[a-z0-9]{6,12}$/;
const FROZEN_RE = /^frozen:\d{1,6}$/;
export const isFreezeId = (id: string) => FREEZE_RE.test(id) || FROZEN_RE.test(id);

export const freezesHeld = (owned: readonly string[]) =>
  Math.max(0, owned.filter((x) => FREEZE_RE.test(x)).length - owned.filter((x) => FROZEN_RE.test(x)).length);

export const frozenDays = (owned: readonly string[]): Set<number> =>
  new Set(owned.filter((x) => FROZEN_RE.test(x)).map((x) => Number(x.slice(7))));

export function buyFreeze(p: Progress, token: string): { ok: true; progress: Progress } | { ok: false; reason: 'full' | 'funds' } {
  if (freezesHeld(p.owned) >= MAX_FREEZES) return { ok: false, reason: 'full' };
  if (coinBalance(p) < FREEZE_PRICE) return { ok: false, reason: 'funds' };
  return { ok: true, progress: { ...p, spent: p.spent + FREEZE_PRICE, owned: [...p.owned, `freeze:${token}`] } };
}

/**
 * Daily Challenges missed since your last win that no freeze covers yet.
 * Empty when there's no streak to save (never won, or the streak ended with a loss).
 */
export function missedDays(
  stats: { currentStreak: number; lastWonKey: number | null },
  today: number,
  owned: readonly string[],
): number[] {
  if (stats.lastWonKey === null || stats.currentStreak <= 0) return [];
  const frozen = frozenDays(owned);
  const missed: number[] = [];
  for (let d = stats.lastWonKey + 1; d < today; d++) if (!frozen.has(d)) missed.push(d);
  return missed;
}

/** Uses freezes for the given missed days (all or nothing). */
export function applyFreezes(p: Progress, days: readonly number[]): Progress | null {
  if (!days.length || days.length > freezesHeld(p.owned)) return null;
  return { ...p, owned: [...p.owned, ...days.map((d) => `frozen:${d}`)] };
}

// ---------- Gifts ----------

export const GIFT_COINS = [50, 100, 250, 500] as const;

export interface Gift {
  id: string;
  from: string;
  kind: 'coins' | 'item';
  coins?: number;
  item?: string;
}

/** Pays for a gift you send. */
export function payForGift(p: Progress, cost: number): Progress | null {
  if (cost <= 0 || coinBalance(p) < cost) return null;
  return { ...p, spent: p.spent + cost };
}

/** What a gift costs to send: its coins, or its item's full price. */
export const giftValue = (g: Pick<Gift, 'kind' | 'coins' | 'item'>) =>
  g.kind === 'coins' ? (g.coins ?? 0) : (shopItem(g.item ?? '')?.price ?? 0);

/**
 * Receives a gift once. An item you already own (or one this version doesn't
 * know) arrives as its value in coins instead.
 */
export function receiveGift(p: Progress, g: Gift): { progress: Progress; item: ShopItem | null; coins: number } | null {
  const key = `gift-${g.id}`;
  if (p.applied.includes(key)) return null;
  const applied = [...p.applied, key].slice(-APPLIED_LIMIT);
  const item = g.kind === 'item' ? shopItem(g.item ?? '') : null;
  if (item && !owns(p, item.id)) {
    return { item, coins: 0, progress: { ...p, applied, owned: [...p.owned, item.id] } };
  }
  const coins = g.kind === 'coins' ? Math.max(0, Math.min(500, g.coins ?? 0)) : (item?.price ?? 100);
  return { item: null, coins, progress: { ...p, applied, coins: p.coins + coins } };
}
