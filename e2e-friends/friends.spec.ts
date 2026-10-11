import { expect, test, type Browser, type Page } from '@playwright/test';
import { ANSWERS } from '../src/data/words/answers';

async function newPlayer(browser: Browser, name: string): Promise<{ page: Page; code: string }> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/#friends');
  // First visit shows the rules; dismiss them.
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByLabel('Display name').fill(name);
  await page.getByRole('button', { name: 'Create my profile' }).click();
  const codeEl = page.getByText(/^[346789A-Z]{3}-[346789A-Z]{3}$/);
  await expect(codeEl).toBeVisible({ timeout: 15_000 });
  const code = (await codeEl.textContent())!.replace('-', '');
  return { page, code };
}

/** Reads the answer of the friend game currently open from this device's saved game. */
async function savedAnswer(page: Page, mode: 'challenge' | 'race'): Promise<string> {
  const id = page.url().split(`#${mode}/`)[1]!;
  await expect
    .poll(() => page.evaluate((k) => localStorage.getItem(k), `wordskiis:${mode}:${id}`))
    .not.toBeNull();
  const raw = await page.evaluate((k) => localStorage.getItem(k)!, `wordskiis:${mode}:${id}`);
  return JSON.parse(raw).data.game.answer as string;
}

async function guess(page: Page, word: string) {
  await page.keyboard.type(word);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1700);
}

test('two friends add each other by code, then play a challenge and a live race', async ({ browser }) => {
  const alice = await newPlayer(browser, 'Alice');
  const bob = await newPlayer(browser, 'Bob');
  expect(alice.code).not.toBe(bob.code);

  // --- Adding friends ---
  await bob.page.getByLabel('Friend code', { exact: true }).fill(bob.code);
  await bob.page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(bob.page.getByRole('alert')).toHaveText('That’s your own code');

  await bob.page.getByLabel('Friend code', { exact: true }).fill('QQQ-QQQ');
  await bob.page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(bob.page.getByRole('alert')).toHaveText('No player has that code');

  await bob.page.getByLabel('Friend code', { exact: true }).fill(`${alice.code.slice(0, 3)}-${alice.code.slice(3)}`.toLowerCase());
  await bob.page.getByRole('button', { name: 'Add', exact: true }).click();
  // Both players see each other, live.
  await expect(bob.page.getByRole('list').getByText('Alice', { exact: true })).toBeVisible();
  await expect(alice.page.getByRole('list').getByText('Bob', { exact: true })).toBeVisible();

  // --- Challenge: Alice sends, both play, results compare ---
  await alice.page.getByRole('button', { name: 'Challenge' }).click();
  await expect(alice.page).toHaveURL(/#challenge\//);
  const word = await savedAnswer(alice.page, 'challenge');
  await guess(alice.page, word);
  const aliceResult = alice.page.getByRole('region', { name: 'Challenge result' });
  await expect(aliceResult).toBeVisible({ timeout: 8000 });
  await expect(aliceResult).toContainText('Waiting for Bob');

  // Bob sees the challenge waiting and a badge in the header.
  await expect(bob.page.getByRole('button', { name: /Friends \(1 waiting\)/ })).toBeVisible();
  await bob.page.getByRole('button', { name: 'Play', exact: true }).click();
  const wrong = ANSWERS.filter((w) => w !== word).slice(0, 6);
  for (const w of wrong) await guess(bob.page, w);
  await expect(bob.page.getByRole('region', { name: 'Challenge result' })).toContainText('Alice wins.', { timeout: 8000 });
  // Alice's screen updates live once Bob finishes.
  await expect(aliceResult).toContainText('You win!', { timeout: 8000 });

  // --- Live race: Bob invites, Alice accepts, countdown, Alice solves first ---
  await bob.page.getByRole('region', { name: 'Challenge result' }).getByRole('button', { name: 'Friends' }).click();
  await bob.page.getByRole('button', { name: 'Race' }).click();
  await expect(bob.page.getByText('Waiting for Alice to accept…')).toBeVisible();

  await alice.page.getByRole('region', { name: 'Challenge result' }).getByRole('button', { name: 'Friends' }).click();
  await alice.page.getByRole('button', { name: 'Accept' }).click();
  await expect(alice.page).toHaveURL(/#race\//);

  // Typing during the countdown does nothing.
  await alice.page.keyboard.type('abc');
  await expect(alice.page.getByRole('row').first()).toHaveAttribute('aria-label', /empty/);

  const raceWord = await savedAnswer(alice.page, 'race');
  await alice.page.waitForTimeout(3800); // countdown

  const bobWrong = ANSWERS.find((w) => w !== raceWord && !w.includes(raceWord[0]!))!;
  await guess(bob.page, bobWrong);
  // Alice sees Bob's progress live (colours only).
  await expect(alice.page.getByText('1 of 6 guesses')).toBeVisible({ timeout: 8000 });

  await guess(alice.page, raceWord);
  await expect(alice.page.getByRole('region', { name: 'Race result' })).toContainText('You won the race!', { timeout: 8000 });
  await expect(bob.page.getByRole('region', { name: 'Race result' })).toContainText('Alice won this one.', { timeout: 8000 });
  // Bob can no longer type once the race is over.
  await bob.page.keyboard.type('crane');
  await expect(bob.page.getByRole('group', { name: 'Keyboard' })).toHaveCount(0);
});
