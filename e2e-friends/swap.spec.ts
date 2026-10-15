import { expect, test, type Browser, type Page } from '@playwright/test';

async function newPlayer(browser: Browser, name: string): Promise<{ page: Page; code: string }> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/#friends');
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByLabel('Display name').fill(name);
  await page.getByRole('button', { name: 'Create my profile' }).click();
  const codeEl = page.getByText(/^[346789A-Z]{3}-[346789A-Z]{3}$/);
  await expect(codeEl).toBeVisible({ timeout: 15_000 });
  return { page, code: (await codeEl.textContent())!.replace('-', '') };
}

test('Word Swap: pick a word, watch your friend guess it live, score, then swap roles', async ({ browser }) => {
  const ann = await newPlayer(browser, 'Ann');
  const ben = await newPlayer(browser, 'Ben');
  await ben.page.getByLabel('Friend code', { exact: true }).fill(ann.code);
  await ben.page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(ann.page.getByRole('list').getByText('Ben', { exact: true })).toBeVisible();

  // Ann starts a Word Swap and picks one of the three words offered.
  await ann.page.getByRole('button', { name: 'Swap', exact: true }).click();
  await expect(ann.page).toHaveURL(/#swap\//);
  await expect(ann.page.getByText('Pick a word for Ben', { exact: true })).toBeVisible();
  const choices = ann.page.getByRole('radiogroup', { name: 'Words to choose from' }).getByRole('radio');
  await expect(choices).toHaveCount(3);
  await expect(ann.page.getByRole('button', { name: 'Choose a word' })).toBeDisabled();
  const labels = await choices.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
  const index = labels.findIndex((l) => !l.startsWith('SLATE'));
  const word = labels[index]!.slice(0, 5).toLowerCase();
  await choices.nth(index).click();
  await expect(choices.nth(index)).toHaveAttribute('aria-checked', 'true');
  await ann.page.getByRole('button', { name: `Send ${word.toUpperCase()} to Ben` }).click();

  // Ben hears about it and sees it waiting for him.
  await expect(ben.page.getByText('Ann picked a word for you. Your turn to guess!').first()).toBeVisible({ timeout: 15_000 });
  await ben.page.getByRole('button', { name: /Guess/ }).click();
  await expect(ben.page.getByRole('heading', { name: 'Word Swap vs Ann' })).toBeVisible();
  await expect(ann.page.getByText('Watching Ben')).toBeVisible();

  // Ann watches Ben type and guess, live.
  await ben.page.keyboard.type('sla');
  await expect(ann.page.getByText('Ben is typing…')).toBeVisible({ timeout: 10_000 });
  await ben.page.keyboard.type('te');
  await ben.page.keyboard.press('Enter');
  await expect(ann.page.getByRole('grid', { name: "Ben's board" }).getByRole('row').first()).toHaveAttribute(
    'aria-label',
    /^Row 1: S /,
    { timeout: 10_000 },
  );
  await ben.page.waitForTimeout(1700);
  await ben.page.keyboard.type(word);
  await ben.page.keyboard.press('Enter');

  // Ben solved it in 2: 5 points. Round 2: roles swap, Ben picks.
  await expect(ben.page.getByText('Pick a word for Ann', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(ben.page.getByText('Round 1: You solved it in 2')).toBeVisible();
  await expect(ann.page.getByText('Ben is picking a word for you')).toBeVisible({ timeout: 15_000 });
  await expect(ann.page.getByText('Ben leads by 5')).toBeVisible();

  // Ann nudges Ben, who gets told.
  await ann.page.getByRole('button', { name: 'Nudge Ben' }).click();
  await expect(ben.page.getByText(/Ann nudged you/).first()).toBeVisible({ timeout: 10_000 });
  await expect(ann.page.getByRole('button', { name: 'Nudged' })).toBeDisabled();
});
