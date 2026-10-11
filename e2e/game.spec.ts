import { expect, test, type Page } from '@playwright/test';
import { dailyAnswer, dayIndexFor } from '../src/engine/daily';
import { ANSWERS } from '../src/data/words/answers';

const NOW = new Date('2026-10-11T12:00:00Z');
const ANSWER = dailyAnswer(dayIndexFor(NOW, '2026-10-11'), ANSWERS);
const WRONG = ANSWERS.filter((w) => w !== ANSWER).slice(0, 6);

async function open(page: Page) {
  await page.clock.setFixedTime(NOW);
  await page.goto('/');
  // First visit shows the rules; dismiss them.
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // The app opens on the home dashboard.
  await page.getByRole('button', { name: /^Play — Daily Challenge/ }).click();
}

async function guess(page: Page, word: string) {
  await page.keyboard.type(word);
  await page.keyboard.press('Enter');
}

const row = (page: Page, i: number) => page.getByRole('row').nth(i);

test('plays the daily challenge to a win with full animations', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('heading', { name: 'Daily Challenge #1' })).toBeVisible();
  await guess(page, 'qxzvj');
  await expect(page.getByText('Not in word list').first()).toBeVisible();
  for (let i = 0; i < 5; i++) await page.keyboard.press('Backspace');
  await guess(page, WRONG[0]!);
  // Typing during the reveal is ignored.
  await page.keyboard.type('zz');
  await expect(row(page, 1)).toHaveAttribute('aria-label', /empty/);
  await page.waitForTimeout(1700);
  await guess(page, ANSWER);
  const result = page.getByRole('dialog');
  await expect(result).toBeVisible({ timeout: 6000 });
  await expect(result.getByText(/You solved it in/)).toContainText('2 guesses');
  await expect(result.getByText('Next challenge in')).toBeVisible();
});

test('survives a refresh and keeps Daily and Practice independent', async ({ page }) => {
  await open(page);
  await guess(page, WRONG[0]!);
  await page.waitForTimeout(1700);
  // Mouse-click the Practice tab, then submit with the physical Enter key.
  await page.getByRole('radio', { name: 'Practice' }).first().click();
  await expect(page.getByRole('heading', { name: 'Practice' })).toBeVisible();
  await guess(page, WRONG[1]!);
  await expect(row(page, 0)).toHaveAttribute('aria-label', new RegExp(`^Row 1: ${WRONG[1]![0]!.toUpperCase()} `));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Practice' })).toBeVisible();
  await expect(row(page, 0)).toHaveAttribute('aria-label', new RegExp(`^Row 1: ${WRONG[1]![0]!.toUpperCase()} `));
  await page.getByRole('radio', { name: 'Daily' }).first().click();
  await expect(row(page, 0)).toHaveAttribute('aria-label', new RegExp(`^Row 1: ${WRONG[0]![0]!.toUpperCase()} `));
  await expect(row(page, 1)).toHaveAttribute('aria-label', /empty/);
});

test('loses after six guesses and reveals the answer', async ({ page }) => {
  await open(page);
  for (const w of WRONG) {
    await guess(page, w);
    await page.waitForTimeout(1700);
  }
  await expect(page.getByRole('dialog').getByLabel(`The answer was ${ANSWER.toUpperCase()}`)).toBeVisible({ timeout: 6000 });
});

test('applies a saved dark theme before React renders (no flash)', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('wordskiis:settings', JSON.stringify({ v: 1, data: { theme: 'dark', seenHelp: true } })),
  );
  let darkAtParse = false;
  page.on('domcontentloaded', async () => {
    darkAtParse = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(darkAtParse).toBe(true);
});

test('has no horizontal scrolling on a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await open(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  const kb = await page.getByRole('group', { name: 'Keyboard' }).boundingBox();
  const board = await page.getByRole('grid').boundingBox();
  expect(kb && board && board.y + board.height <= kb.y).toBeTruthy();
});

test('with the real ticking clock, finishing shows results, next steps, and the way home', async ({ page }) => {
  // No fixed time: the countdown re-renders every second, as for real players.
  const answer = dailyAnswer(dayIndexFor(new Date(), '2026-10-11'), ANSWERS);
  await page.goto('/');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Practice' })).toBeVisible();
  await page.getByRole('button', { name: /^Play — Daily Challenge/ }).click();
  await guess(page, answer);
  const result = page.getByRole('dialog');
  await expect(result.getByText(/You solved it in/)).toBeVisible({ timeout: 6000 });
  await result.getByRole('button', { name: 'Close' }).click();
  const panel = page.getByRole('region', { name: 'Game over' });
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: /Home/ }).click();
  await expect(page.getByRole('button', { name: /^View results — Daily Challenge/ })).toBeVisible();
  // Browser Back from the game returns to the dashboard too.
  await page.getByRole('button', { name: 'See today’s board' }).click();
  await page.goBack();
  await expect(page.getByRole('button', { name: /^View results — Daily Challenge/ })).toBeVisible();
});
