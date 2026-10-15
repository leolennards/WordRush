import { expect, test, type Browser, type Page } from '@playwright/test';

async function newPlayer(browser: Browser, name: string, coins = 0): Promise<{ page: Page; code: string }> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript((coins) => {
    if (localStorage.getItem('wordskiis:progress')) return;
    localStorage.setItem(
      'wordskiis:progress',
      JSON.stringify({ v: 1, data: { xp: 0, unlocked: {}, applied: [], coins, spent: 0, owned: [] } }),
    );
  }, coins);
  await page.goto('/#friends');
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByLabel('Display name').fill(name);
  await page.getByRole('button', { name: 'Create my profile' }).click();
  const codeEl = page.getByText(/^[346789A-Z]{3}-[346789A-Z]{3}$/);
  await expect(codeEl).toBeVisible({ timeout: 15_000 });
  return { page, code: (await codeEl.textContent())!.replace('-', '') };
}

test('Gifts: send a friend coins, and they open it once', async ({ browser }) => {
  const ann = await newPlayer(browser, 'Ann', 1000);
  const ben = await newPlayer(browser, 'Ben');
  await ben.page.getByLabel('Friend code', { exact: true }).fill(ann.code);
  await ben.page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(ann.page.getByRole('list').getByText('Ben', { exact: true })).toBeVisible();

  // Ann sends Ben 250 coins (she has 150 + 1000).
  await ann.page.getByRole('button', { name: 'Send Ben a gift' }).click();
  const dialog = ann.page.getByRole('dialog', { name: 'Send Ben a gift' });
  await dialog.getByRole('radio', { name: '250' }).click();
  await dialog.getByRole('button', { name: 'Send for 250 coins' }).click();
  await expect(ann.page.getByText('Gift sent to Ben!').first()).toBeVisible({ timeout: 10_000 });
  await expect(ann.page.getByRole('button', { name: /^900 coins/ })).toBeVisible();

  // Ben gets a gift card, opens it, and the coins land.
  await expect(ben.page.getByText('Ann sent you a gift!')).toBeVisible({ timeout: 15_000 });
  await ben.page.getByRole('button', { name: 'Open', exact: true }).click();
  const reveal = ben.page.getByRole('dialog', { name: 'Gift from Ann' });
  await expect(reveal.getByText('250 coins!')).toBeVisible({ timeout: 10_000 });
  await reveal.getByRole('button', { name: 'Nice!' }).click();
  await expect(ben.page.getByRole('button', { name: /^400 coins/ })).toBeVisible();
  await expect(ben.page.getByText('Ann sent you a gift!')).toHaveCount(0);
});
