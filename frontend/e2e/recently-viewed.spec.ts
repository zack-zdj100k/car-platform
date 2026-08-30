import { expect, test } from '@playwright/test';
import { adminTokenOrSkip } from './admin-session';

/**
 * "Recently viewed", from the browser.
 *
 * This is the test that would have caught the fault it exists for. The feature
 * never worked from a real browser and every backend test passed the whole
 * time, because the tests called the API directly with a token — which is
 * exactly what the browser could not do. The page is rendered on the site's
 * server, where the reader's token does not exist, so every view arrived
 * anonymous: no history for anyone, and administrators counted as visitors.
 */

const EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@carplatform.dev';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? '';

test('a signed-in reader sees the car they opened in their history', async ({ page, request }) => {
  // Only to establish that this account may administer; the browser signs in
  // for itself below, exactly as a customer's would.
  await adminTokenOrSkip(request);

  // Sign in through the site itself, so the browser holds the session the same
  // way a customer's would.
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password|mot de passe/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in|se connecter/i }).click();
  await page.waitForURL(/\/dashboard/);

  await page.goto('/cars');
  await expect(page.getByTestId('car-card').first()).toBeVisible();
  await page.getByTestId('car-card').first().locator('a').first().click();
  await page.waitForURL(/\/car\//);

  /*
   * Matched on the car's own address rather than its displayed name: a card
   * shows "Bingo Long Range" and the history shows "Bingo", so comparing the
   * words fails while the feature works perfectly — which is what this
   * assertion did at first.
   */
  const slug = new URL(page.url()).pathname.split('/').pop()!;

  // The view is reported after hydration, not while rendering.
  await page.waitForResponse(
    (response) => response.url().includes('/view') && response.request().method() === 'POST',
    { timeout: 10_000 },
  );

  await page.goto('/dashboard/recent');
  await expect(page.locator(`a[href*="/car/${slug}"]`).first()).toBeVisible({ timeout: 10_000 });
});

test('an administrator browsing is not counted as a visitor', async ({ page, request }) => {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
  const probe = await adminTokenOrSkip(request);
  const accessToken = probe;

  const before = await request.get(`${api}/analytics/overview`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const viewsBefore = (await before.json()).views.total;

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password|mot de passe/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in|se connecter/i }).click();
  await page.waitForURL(/\/dashboard/);

  await page.goto('/cars');
  await expect(page.getByTestId('car-card').first()).toBeVisible();
  await page.getByTestId('car-card').first().locator('a').first().click();
  await page.waitForURL(/\/car\//);
  await page.waitForResponse(
    (response) => response.url().includes('/view') && response.request().method() === 'POST',
    { timeout: 10_000 },
  );

  const after = await request.get(`${api}/analytics/overview`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  /*
   * The owner reading their own catalogue is not an audience, and counting them
   * makes a quiet site look busy to the one person who needs the truth from it.
   */
  expect((await after.json()).views.total).toBe(viewsBefore);
});
