import { describe, expect, it } from 'vitest';
import {
  SHOP_ITEMS,
  STARTER_COINS,
  applyEvent,
  buyItem,
  coinBalance,
  dailyDeal,
  emptyProgress,
  mergeShared,
  sharedOf,
  skinUnlocked,
  swapChoices,
  tileStyleUnlocked,
  wordDifficulty,
  type GameEvent,
} from '@/engine';
import { ANSWERS } from '@/data/words/answers';
import { progressSchema } from '@/lib/storage/schemas';

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
    const r = buyItem(rich, item.id, 5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.price).toBe(item.price);
    expect(r.progress.owned).toEqual([item.id]);
    expect(coinBalance(r.progress)).toBe(coinBalance(rich) - item.price);
    expect(buyItem(r.progress, item.id, 5)).toEqual({
      ok: false,
      reason: 'owned',
    });
  });

  it('refuses without enough coins, and unknown items', () => {
    const pricey = SHOP_ITEMS.reduce((a, b) => (b.price > a.price ? b : a));
    expect(buyItem(emptyProgress(), pricey.id, 1)).toEqual({
      ok: false,
      reason: 'funds',
    });
    expect(buyItem(rich, 'skin:nope', 1)).toEqual({
      ok: false,
      reason: 'unknown',
    });
  });

  it('sells the daily deal at 30% off, the same item all day', () => {
    const deal = dailyDeal(42);
    expect(dailyDeal(42).item.id).toBe(deal.item.id);
    expect(deal.price).toBeLessThan(deal.item.price);
    const r = buyItem(rich, deal.item.id, 42);
    expect(r.ok && r.price).toBe(deal.price);
  });

  it('unlocks shop themes and tile styles only once bought', () => {
    expect(skinUnlocked('galaxy', 100, [])).toBe(false);
    expect(skinUnlocked('galaxy', 1, ['skin:galaxy'])).toBe(true);
    expect(skinUnlocked('ocean', 5, [])).toBe(true);
    expect(tileStyleUnlocked('classic', [])).toBe(true);
    expect(tileStyleUnlocked('neon', [])).toBe(false);
    expect(tileStyleUnlocked('neon', ['tiles:neon'])).toBe(true);
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
