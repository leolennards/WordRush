import { expect, test, type Browser, type Page } from '@playwright/test';
import { levelFor } from '../src/engine/progress';

/** Completes the Auth emulator's fake Google sign-in popup. */
async function googlePopup(page: Page, account: { email: string; name: string }, existing: boolean) {
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  const [popup] = await Promise.all([page.waitForEvent('popup'), dialog.getByRole('button', { name: 'Sign in with Google' }).click()]);
  await popup.waitForLoadState();
  if (existing) {
    await popup.getByText(account.email).click();
  } else {
    await popup.getByRole('button', { name: /add new account/i }).click();
    await popup.getByLabel(/email/i).fill(account.email);
    await popup.getByLabel(/display name/i).fill(account.name);
    await popup.getByRole('button', { name: /sign in with google/i }).click();
  }
  await popup.waitForEvent('close');
}

async function device(browser: Browser) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    if (!localStorage.getItem('wordskiis:settings')) {
      localStorage.setItem('wordskiis:settings', JSON.stringify({ v: 1, data: { seenHelp: true, reduceMotion: true } }));
    }
  });
  return ctx.newPage();
}

const stored = (page: Page, key: string) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(`wordskiis:${k}`) ?? 'null')?.data ?? null, key);

/** Wins the current practice word in one guess and returns the XP total afterwards. */
async function winPractice(page: Page) {
  await page.goto('/#practice');
  await expect(page.getByRole('heading', { name: 'Practice' })).toBeVisible();
  const answer = (await stored(page, 'practice')).game.answer as string;
  await page.keyboard.type(answer);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await stored(page, 'progress'))?.xp ?? 0).toBeGreaterThan(0);
  return (await stored(page, 'progress')).xp as number;
}

async function signIn(page: Page, account: { email: string; name: string }, existing: boolean) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).first().click();
  await googlePopup(page, account, existing);
  await expect(page.getByRole('dialog', { name: 'Settings' }).getByText(account.email)).toBeVisible({ timeout: 15_000 });
}

test('progress made on two devices adds up once both sign in, and today’s Daily follows you', async ({ browser }) => {
  const account = { email: `sync${Date.now()}@example.com`, name: 'Sam Sync' };

  // Laptop: plays as a guest, then signs in from Settings (no Friends profile needed).
  const laptop = await device(browser);
  const laptopXp = await winPractice(laptop);
  await laptop.goto('/#daily');
  const daily = await stored(laptop, 'daily');
  const guess = ['crane', 'slate', 'pious'].find((w) => w !== daily.game.answer)!;
  await laptop.keyboard.type(guess);
  await laptop.keyboard.press('Enter');
  await expect(laptop.getByRole('row').first()).toHaveAttribute('aria-label', new RegExp(`^Row 1: ${guess[0]!.toUpperCase()} `));
  // …and climbs the Tower: clears floor 1, picks a perk, reaches floor 2.
  await laptop.goto('/#tower');
  await laptop.getByRole('button', { name: /Begin the climb/ }).click();
  await laptop.getByRole('button', { name: 'Enter floor 1' }).click();
  const floorWord = (await stored(laptop, 'tower')).game.answer as string;
  await laptop.keyboard.type(floorWord);
  await laptop.keyboard.press('Enter');
  await laptop.getByText('Choose a perk').waitFor({ timeout: 8000 });
  await laptop.locator('button', { hasText: /Heal|Lantern|Shield|Clear skies/ }).first().click();
  await expect(laptop.getByRole('button', { name: 'Enter floor 2' })).toBeVisible();
  await signIn(laptop, account, false);
  await expect(laptop.getByText(/synced across your devices/)).toBeVisible({ timeout: 15_000 });

  // Phone: earns some XP of its own as a guest first.
  const phone = await device(browser);
  const phoneXp = await winPractice(phone);
  await signIn(phone, account, true);

  // Both end up with the combined XP, and the phone continues the laptop's Daily.
  await expect.poll(async () => (await stored(phone, 'progress'))?.xp, { timeout: 20_000 }).toBe(laptopXp + phoneXp);
  await expect.poll(async () => (await stored(laptop, 'progress'))?.xp, { timeout: 20_000 }).toBe(laptopXp + phoneXp);
  await phone.goto('/#daily');
  await expect(phone.getByRole('row').first()).toHaveAttribute('aria-label', new RegExp(`^Row 1: ${guess[0]!.toUpperCase()} `));

  // The Tower run continues on the phone, and Practice is the same save on both.
  await expect.poll(async () => (await stored(phone, 'tower'))?.run?.floor, { timeout: 20_000 }).toBe(2);
  await phone.goto('/#tower');
  await expect(phone.getByRole('button', { name: 'Enter floor 2' })).toBeVisible();
  await expect
    .poll(async () => (await stored(laptop, 'practice'))?.gameNumber, { timeout: 20_000 })
    .toBe((await stored(phone, 'practice'))?.gameNumber);

  // The level shows on the phone's home screen too.
  await phone.goto('/');
  const { level } = levelFor(laptopXp + phoneXp);
  await expect(phone.getByRole('img', { name: new RegExp(`^Level ${level},`) }).first()).toBeVisible();
  const laptopAchievements = Object.keys((await stored(laptop, 'progress')).unlocked);
  expect(Object.keys((await stored(phone, 'progress')).unlocked)).toEqual(expect.arrayContaining(laptopAchievements));
});

/** A Tower run saved before cloud save existed (no change timestamps). */
function oldTowerSave(floor: number) {
  const won = ['correct', 'correct', 'correct', 'correct', 'correct'];
  return JSON.stringify({
    v: 1,
    data: {
      run: {
        id: 1,
        floor,
        hearts: 3,
        shield: false,
        lantern: false,
        calm: false,
        twists: ['none'],
        log: Array.from({ length: floor - 1 }, () => ({ answer: 'crane', won: true, twists: ['none'] })),
        phase: 'intro',
        offer: [],
        lastGameId: floor > 1 ? `tower-1-${floor - 1}` : null,
      },
      game:
        floor > 1
          ? { mode: 'tower', id: `tower-1-${floor - 1}`, answer: 'crane', guesses: ['crane'], evaluations: [won], status: 'won', hardMode: false, dayIndex: null }
          : { mode: 'tower', id: 'tower-0-0', answer: 'crane', guesses: [], evaluations: [], status: 'playing', hardMode: false, dayIndex: null },
    },
  });
}

async function deviceWithOldTower(browser: Browser, floor: number) {
  const ctx = await browser.newContext();
  await ctx.addInitScript((save) => {
    if (!localStorage.getItem('wordskiis:settings')) {
      localStorage.setItem('wordskiis:settings', JSON.stringify({ v: 1, data: { seenHelp: true, reduceMotion: true } }));
      localStorage.setItem('wordskiis:tower', save);
    }
  }, oldTowerSave(floor));
  return ctx.newPage();
}

test('saves from before cloud save: the further-along run wins, whichever device syncs first', async ({ browser }) => {
  const account = { email: `old${Date.now()}@example.com`, name: 'Olly Old' };
  // The phone (floor 1) updates and syncs first…
  const phone = await deviceWithOldTower(browser, 1);
  await signIn(phone, account, false);
  await expect(phone.getByText(/synced across your devices/)).toBeVisible({ timeout: 15_000 });
  // …then the laptop (floor 5).
  const laptop = await deviceWithOldTower(browser, 5);
  await signIn(laptop, account, true);
  await expect.poll(async () => (await stored(laptop, 'tower'))?.run?.floor, { timeout: 20_000 }).toBe(5);
  await expect.poll(async () => (await stored(phone, 'tower'))?.run?.floor, { timeout: 20_000 }).toBe(5);
  await phone.goto('/#tower');
  await expect(phone.getByRole('button', { name: 'Enter floor 5' })).toBeVisible();
});
