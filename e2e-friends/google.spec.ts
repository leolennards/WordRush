import { expect, test, type Page } from '@playwright/test';

/** Completes the Auth emulator's fake Google sign-in popup. */
async function googlePopup(page: Page, click: () => Promise<void>, account: { email: string; name: string }, existing = false) {
  const [popup] = await Promise.all([page.waitForEvent('popup'), click()]);
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

async function openFriends(page: Page) {
  await page.goto('/#friends');
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
  await page.keyboard.press('Escape');
}

test('a guest saves their profile to Google and gets it back on another device', async ({ browser }) => {
  const account = { email: `carol${Date.now()}@example.com`, name: 'Carol Jones' };

  // Device 1: guest profile, then "Save with Google" links it.
  const d1 = await (await browser.newContext()).newPage();
  await openFriends(d1);
  await d1.getByLabel('Display name').fill('Carol');
  await d1.getByRole('button', { name: 'Create my profile' }).click();
  const code = (await d1.getByText(/^[346789A-Z]{3}-[346789A-Z]{3}$/).textContent())!;
  await expect(d1.getByText('Guest profile')).toBeVisible();
  await googlePopup(d1, () => d1.getByRole('button', { name: 'Save with Google' }).click(), account);
  await expect(d1.getByText(account.email)).toBeVisible();
  await expect(d1.getByText(code, { exact: true })).toBeVisible(); // same profile kept

  // Device 2: starts as a fresh guest, signs in with the same Google account.
  const d2 = await (await browser.newContext()).newPage();
  await openFriends(d2);
  await expect(d2.getByRole('button', { name: 'Create my profile' })).toBeVisible();
  await googlePopup(d2, () => d2.getByRole('button', { name: 'Sign in with Google' }).click(), account, true);
  await expect(d2.getByText(code, { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(d2.getByRole('heading', { name: /Carol/ })).toBeVisible();

  // Signing out continues as a new guest on this device.
  await d2.getByRole('button', { name: 'Sign out' }).click();
  await d2.getByRole('alert').getByRole('button', { name: 'Sign out' }).click();
  await expect(d2.getByRole('button', { name: 'Create my profile' })).toBeVisible({ timeout: 15_000 });
});

test('a brand-new Google account gets its first name suggested', async ({ browser }) => {
  const account = { email: `dana${Date.now()}@example.com`, name: 'Dana Smith' };
  const page = await (await browser.newContext()).newPage();
  await openFriends(page);
  await googlePopup(page, () => page.getByRole('button', { name: 'Sign in with Google' }).click(), account);
  await expect(page.getByLabel('Display name')).toHaveValue('Dana');
  await page.getByRole('button', { name: 'Create my profile' }).click();
  await expect(page.getByText(account.email)).toBeVisible();
});
