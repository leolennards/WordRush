import { describe, expect, it } from 'vitest';
import {
  SHOP_ITEMS,
  CHEST,
  LEVEL_REWARDS,
  TILE_PALS,
  nextRewards,
  palUnlocked,
  rewardsBetween,
  PHOTO_MAX,
  cosmeticUnlocked,
  isPhotoData,
  FREEZE_PRICE,
  HALLOWEEN,
  MAX_FREEZES,
  MYSTERY_PRICE,
  STARTER_COINS,
  WINTER,
  applyFreezes,
  buyFreeze,
  effectiveStreak,
  emptyStats,
  freezesHeld,
  frozenDays,
  inSeason,
  missedDays,
  mysteryPool,
  openMystery,
  receiveGift,
  recordResult,
  seasonDaysLeft,
  shopItem,
  WIN_EFFECTS,
  applyEvent,
  buyItem,
  chestCoins,
  chestReady,
  coinBalance,
  dailyDeal,
  emptyProgress,
  mergeShared,
  openChest,
  sharedOf,
  skinUnlocked,
  swapChoices,
  tileStyleUnlocked,
  winFxUnlocked,
  wordDifficulty,
  type GameEvent,
} from '@/engine';
import { ANSWERS } from '@/data/words/answers';
import { progressSchema, settingsSchema } from '@/lib/storage/schemas';

/** A date outside every limited-time season. */
const JUNE = new Date('2026-06-15T12:00:00Z');

const win: GameEvent = {
  id: 'practice-1',
  mode: 'practice',
  won: true,
  guesses: 3,
  hardMode: false,
  hints: 0,
  seconds: null,
};

describe('coins', () => {
  it('starts everyone with starter coins', () => {
    expect(coinBalance(emptyProgress())).toBe(STARTER_COINS);
  });

  it('pays coins for a game, once', () => {
    const first = applyEvent(emptyProgress(), win, 0);
    expect(first.coinsGained).toBeGreaterThan(0);
    expect(first.progress.coins).toBe(first.coinsGained);
    const again = applyEvent(first.progress, win, 0);
    expect(again.coinsGained).toBe(0);
    expect(again.progress.coins).toBe(first.coinsGained);
  });

  it('pays extra for achievements and level-ups', () => {
    const r = applyEvent(emptyProgress(), { ...win, guesses: 1 }, 0);
    // A first-guess first win: achievements and level 2 (100 XP).
    expect(r.unlocked.length).toBeGreaterThan(0);
    expect(r.levelUp).toBe(2);
    expect(r.coinsGained).toBeGreaterThan(Math.round(r.xpGained / 5));
  });
});

describe('shop', () => {
  const rich = { ...emptyProgress(), coins: 100_000 };
  const notDeal = (day: number) => SHOP_ITEMS.find((i) => i.id !== dailyDeal(day).item.id)!;

  it('buys an item: spends its price and adds it to what you own', () => {
    const item = notDeal(5);
    const r = buyItem(rich, item.id, 5, JUNE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.price).toBe(item.price);
    expect(r.progress.owned).toEqual([item.id]);
    expect(coinBalance(r.progress)).toBe(coinBalance(rich) - item.price);
    expect(buyItem(r.progress, item.id, 5, JUNE)).toEqual({
      ok: false,
      reason: 'owned',
    });
  });

  it('refuses without enough coins, and unknown items', () => {
    const pricey = SHOP_ITEMS.reduce((a, b) => (b.price > a.price ? b : a));
    expect(buyItem(emptyProgress(), pricey.id, 1, JUNE)).toEqual({
      ok: false,
      reason: 'funds',
    });
    expect(buyItem(rich, 'skin:nope', 1, JUNE)).toEqual({
      ok: false,
      reason: 'unknown',
    });
  });

  it('sells the daily deal at 30% off, the same item all day', () => {
    const deal = dailyDeal(42);
    expect(dailyDeal(42).item.id).toBe(deal.item.id);
    expect(deal.price).toBeLessThan(deal.item.price);
    const r = buyItem(rich, deal.item.id, 42, JUNE);
    expect(r.ok && r.price).toBe(deal.price);
  });

  it('unlocks shop themes and tile styles only once bought', () => {
    expect(skinUnlocked('galaxy', 100, [])).toBe(false);
    expect(skinUnlocked('galaxy', 1, ['skin:galaxy'])).toBe(true);
    expect(skinUnlocked('ocean', 5, [])).toBe(true);
    expect(tileStyleUnlocked('classic', [], 1)).toBe(true);
    expect(tileStyleUnlocked('neon', [], 100)).toBe(false);
    expect(tileStyleUnlocked('neon', ['tiles:neon'], 1)).toBe(true);
  });

  it('sells win effects, with confetti free for everyone', () => {
    expect(winFxUnlocked('confetti', [], 1)).toBe(true);
    expect(winFxUnlocked('fireworks', [], 1)).toBe(false);
    expect(winFxUnlocked('fireworks', ['fx:fireworks'], 1)).toBe(true);
    const paid = WIN_EFFECTS.filter((f) => f.price !== undefined);
    expect(SHOP_ITEMS.filter((i) => i.kind === 'fx').map((i) => i.id)).toEqual(paid.map((f) => `fx:${f.id}`));
  });

  it('gives every item a unique id and a price', () => {
    expect(new Set(SHOP_ITEMS.map((i) => i.id)).size).toBe(SHOP_ITEMS.length);
    for (const i of SHOP_ITEMS) expect(i.price).toBeGreaterThan(0);
  });

  it('keeps purchases from every device when syncing', () => {
    const a = sharedOf({ ...emptyProgress(), owned: ['skin:citrus'] });
    const b = sharedOf({
      ...emptyProgress(),
      owned: ['tiles:glass', 'skin:citrus'],
    });
    expect(mergeShared(a, b).owned.sort()).toEqual(['skin:citrus', 'tiles:glass']);
  });

  it('stores coins and drops unknown items', () => {
    const p = progressSchema.validate({
      ...emptyProgress(),
      coins: 40,
      spent: 10,
      owned: ['skin:gold', 'bogus', 'skin:gold'],
    });
    expect(p).toMatchObject({ coins: 40, spent: 10, owned: ['skin:gold'] });
  });
});

describe('daily chest', () => {
  it('opens once a day for a fixed handful of coins', () => {
    const coins = chestCoins(10);
    expect(coins).toBeGreaterThanOrEqual(CHEST.min);
    expect(coins).toBeLessThanOrEqual(CHEST.max);
    expect(chestCoins(10)).toBe(coins);
    const r = openChest(emptyProgress(), 10);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(coinBalance(r.progress)).toBe(STARTER_COINS + coins);
    expect(chestReady(r.progress, 10)).toBe(false);
    expect(openChest(r.progress, 10)).toEqual({ ok: false });
    expect(chestReady(r.progress, 11)).toBe(true);
  });

  it('stays open on another device once synced', () => {
    const r = openChest(emptyProgress(), 3);
    if (!r.ok) throw new Error('chest should open');
    const other = mergeShared(sharedOf(emptyProgress()), sharedOf(r.progress));
    expect(chestReady(other, 3)).toBe(false);
  });
});

describe('Word Swap choices', () => {
  const swap = { id: 'abc123', round: 1, history: [] };

  it('offers three different words, the same on every device', () => {
    const choices = swapChoices(swap, ANSWERS);
    expect(choices).toHaveLength(3);
    expect(new Set(choices).size).toBe(3);
    expect(swapChoices(swap, ANSWERS)).toEqual(choices);
    expect(swapChoices({ ...swap, round: 2 }, ANSWERS)).not.toEqual(choices);
  });

  it('never offers a word already played in the match', () => {
    const pool = ['apple', 'brick', 'crane', 'delta'];
    const history = [
      {
        round: 1,
        setter: 'a',
        guesser: 'b',
        word: 'apple',
        guesses: 3,
        solved: true,
        scorer: 'b',
        points: 4,
      },
    ];
    expect(swapChoices({ id: 'x', round: 2, history }, pool)).not.toContain('apple');
  });

  it('rates words by how common their letters are', () => {
    expect(wordDifficulty('arose')).toBe('easy');
    expect(wordDifficulty('jazzy')).toBe('tricky');
  });
});

describe('more coins', () => {
  it('pays a bonus for a first-guess solve', () => {
    const r = applyEvent(emptyProgress(), { ...win, guesses: 1 }, 0);
    expect(r.coinBonuses.map((b) => b.id)).toContain('firstGuess');
    expect(applyEvent(emptyProgress(), win, 0).coinBonuses).toEqual([]);
  });

  it('pays a bonus for every week of Daily streak', () => {
    const daily = (streak: number): GameEvent => ({ ...win, id: `daily-${streak}`, mode: 'daily', streak });
    expect(applyEvent(emptyProgress(), daily(14), 0).coinBonuses.map((b) => b.id)).toContain('streakWeek');
    expect(applyEvent(emptyProgress(), daily(13), 0).coinBonuses.map((b) => b.id)).not.toContain('streakWeek');
  });
});

describe('limited-time items', () => {
  it('knows when a season is on, across the new year', () => {
    expect(inSeason(HALLOWEEN, new Date('2026-10-15T00:00:00Z'))).toBe(true);
    expect(inSeason(HALLOWEEN, new Date('2026-11-08T00:00:00Z'))).toBe(false);
    expect(inSeason(WINTER, new Date('2026-12-25T00:00:00Z'))).toBe(true);
    expect(inSeason(WINTER, new Date('2027-01-05T00:00:00Z'))).toBe(true);
    expect(inSeason(WINTER, new Date('2027-02-01T00:00:00Z'))).toBe(false);
    expect(seasonDaysLeft(HALLOWEEN, new Date('2026-11-07T10:00:00Z'))).toBe(1);
    expect(seasonDaysLeft(WINTER, new Date('2026-12-31T10:00:00Z'))).toBe(11);
  });

  it('sells them only in season, and they are never the daily deal', () => {
    const rich = { ...emptyProgress(), coins: 100_000 };
    expect(buyItem(rich, 'fx:bats', 1, JUNE)).toEqual({ ok: false, reason: 'season' });
    expect(buyItem(rich, 'fx:bats', 1, new Date('2026-10-20T00:00:00Z')).ok).toBe(true);
    for (let day = 0; day < 200; day++) expect(dailyDeal(day).item.season).toBeUndefined();
  });
});

describe('mystery box', () => {
  it('gives something you don’t own yet, never a limited-time item', () => {
    const rich = { ...emptyProgress(), coins: 100_000 };
    const r = openMystery(rich, 0.5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.item.season).toBeUndefined();
    expect(r.progress.owned).toEqual([r.item.id]);
    expect(coinBalance(r.progress)).toBe(coinBalance(rich) - MYSTERY_PRICE);
    expect(mysteryPool(r.progress)).not.toContainEqual(r.item);
  });

  it('needs coins, and something left to win', () => {
    expect(openMystery(emptyProgress(), 0.1)).toEqual({ ok: false, reason: 'funds' });
    const all = { ...emptyProgress(), coins: 100_000, owned: SHOP_ITEMS.map((i) => i.id) };
    expect(openMystery(all, 0.1)).toEqual({ ok: false, reason: 'empty' });
  });
});

describe('streak freezes', () => {
  const rich = { ...emptyProgress(), coins: 10_000 };

  it('holds up to two', () => {
    let p = rich;
    for (let i = 0; i < MAX_FREEZES; i++) {
      const r = buyFreeze(p, `token${i}0`);
      if (!r.ok) throw new Error('should buy');
      p = r.progress;
    }
    expect(freezesHeld(p.owned)).toBe(MAX_FREEZES);
    expect(buyFreeze(p, 'tokenxx')).toEqual({ ok: false, reason: 'full' });
    expect(coinBalance(p)).toBe(coinBalance(rich) - MAX_FREEZES * FREEZE_PRICE);
  });

  it('covers a missed day so the streak carries on', () => {
    const bought = buyFreeze(rich, 'abcdef12');
    if (!bought.ok) throw new Error('should buy');
    let stats = emptyStats(6);
    for (const key of [10, 11, 12]) stats = recordResult(stats, { key, won: true, guesses: 3 });
    // Day 13 missed; it's now day 14.
    expect(effectiveStreak(stats, 14)).toBe(0);
    const missed = missedDays(stats, 14, bought.progress.owned);
    expect(missed).toEqual([13]);
    const used = applyFreezes(bought.progress, missed)!;
    expect(freezesHeld(used.owned)).toBe(0);
    expect(effectiveStreak(stats, 14, frozenDays(used.owned))).toBe(3);
    const next = recordResult(stats, { key: 14, won: true, guesses: 2 }, frozenDays(used.owned));
    expect(next.currentStreak).toBe(4);
    // Without the freeze, the streak would have restarted.
    expect(recordResult(stats, { key: 14, won: true, guesses: 2 }).currentStreak).toBe(1);
  });

  it('can’t save a streak with too few freezes, or one already lost', () => {
    const bought = buyFreeze(rich, 'abcdef12');
    if (!bought.ok) throw new Error('should buy');
    expect(applyFreezes(bought.progress, [5, 6])).toBeNull();
    let stats = recordResult(emptyStats(6), { key: 1, won: true, guesses: 3 });
    stats = recordResult(stats, { key: 2, won: false, guesses: 6 });
    expect(missedDays(stats, 5, bought.progress.owned)).toEqual([]);
  });

  it('are kept when saved and synced', () => {
    const p = progressSchema.validate({ ...emptyProgress(), owned: ['freeze:abcdef12', 'frozen:40', 'freeze:BAD!'] });
    expect(p?.owned).toEqual(['freeze:abcdef12', 'frozen:40']);
  });
});

describe('gifts', () => {
  it('delivers coins once', () => {
    const r = receiveGift(emptyProgress(), { id: 'g1', from: 'x', kind: 'coins', coins: 250 });
    expect(r?.coins).toBe(250);
    expect(coinBalance(r!.progress)).toBe(STARTER_COINS + 250);
    expect(receiveGift(r!.progress, { id: 'g1', from: 'x', kind: 'coins', coins: 250 })).toBeNull();
  });

  it('delivers an item, or its price in coins if you already own it', () => {
    const r = receiveGift(emptyProgress(), { id: 'g2', from: 'x', kind: 'item', item: 'skin:galaxy' });
    expect(r?.item?.id).toBe('skin:galaxy');
    expect(r!.progress.owned).toContain('skin:galaxy');
    const again = receiveGift(r!.progress, { id: 'g3', from: 'x', kind: 'item', item: 'skin:galaxy' });
    expect(again?.item).toBeNull();
    expect(again?.coins).toBe(shopItem('skin:galaxy')!.price);
  });
});

describe('profiles', () => {
  it('accepts small JPEG photos only', () => {
    expect(isPhotoData('data:image/jpeg;base64,/9j/4AAQ')).toBe(true);
    expect(isPhotoData('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isPhotoData('https://example.com/a.jpg')).toBe(false);
    expect(isPhotoData(`data:image/jpeg;base64,${'A'.repeat(PHOTO_MAX)}`)).toBe(false);
  });

  it('keeps a valid profile in settings and drops anything else', () => {
    const ok = settingsSchema.validate({ avatar: 't3', tint: 'sky', title: 'wizard', banner: 'aurora', background: 'stars', accent: 'grape' });
    expect(ok).toMatchObject({ avatar: 't3', tint: 'sky', title: 'wizard', banner: 'aurora', background: 'stars', accent: 'grape' });
    const bad = settingsSchema.validate({ avatar: '<img>', photo: 'javascript:alert(1)', tint: 'nope', background: 'lava' });
    expect(bad).toMatchObject({ avatar: 'initial', photo: '', tint: 'auto', background: 'tiles' });
  });

  it('sells profile items, backgrounds and app colours, with free defaults', () => {
    for (const kind of ['bg', 'accent', 'title', 'banner'] as const) {
      expect(SHOP_ITEMS.some((i) => i.kind === kind)).toBe(true);
    }
    expect(cosmeticUnlocked('bg', 'tiles', [], 1)).toBe(true);
    expect(cosmeticUnlocked('bg', 'synthwave', [], 1)).toBe(false);
    expect(cosmeticUnlocked('accent', 'grape', [], 1)).toBe(true);
    expect(cosmeticUnlocked('title', 'unstumpable', ['title:unstumpable'], 1)).toBe(true);
  });
});

describe('level rewards', () => {
  it('unlocks rewards by level, never sold in the shop', () => {
    expect(cosmeticUnlocked('frame', 'bronze', [], 4)).toBe(false);
    expect(cosmeticUnlocked('frame', 'bronze', [], 5)).toBe(true);
    expect(cosmeticUnlocked('title', 'legendary', [], 99)).toBe(false);
    expect(cosmeticUnlocked('title', 'legendary', [], 100)).toBe(true);
    for (const r of LEVEL_REWARDS) expect(SHOP_ITEMS.some((i) => i.id === `${r.kind}:${r.id}`)).toBe(false);
  });

  it('spreads rewards from level 2 to 100, with something special at the top', () => {
    expect(LEVEL_REWARDS[0]!.level).toBe(2);
    expect(rewardsBetween(99, 100).length).toBeGreaterThanOrEqual(3);
    expect(rewardsBetween(1, 100).length).toBe(LEVEL_REWARDS.length);
    expect(nextRewards(23)?.level).toBe(25);
    expect(nextRewards(100)).toBeNull();
  });

  it('has Tile Pals for everyone, and some for high levels', () => {
    expect(TILE_PALS.length).toBeGreaterThanOrEqual(12);
    expect(palUnlocked('t1', 1)).toBe(true);
    expect(palUnlocked('t15', 99)).toBe(false);
    expect(palUnlocked('t15', 100)).toBe(true);
    expect(new Set(TILE_PALS.map((p) => p.id)).size).toBe(TILE_PALS.length);
  });
});
