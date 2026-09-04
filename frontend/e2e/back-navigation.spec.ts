import { expect, test } from '@playwright/test';

/**
 * "Back" returning the reader where they were.
 *
 * These links used to point at a fixed address — the catalogue, from a
 * vehicle's page. Right from the catalogue and wrong from everywhere else: a
 * customer who opened a car from their favourites or their appointments pressed
 * Back and landed somewhere they had never been, with their place in the list
 * lost.
 */
test('from favourites, back goes to favourites', async ({ page }) => {
  test.setTimeout(120_000);
  const password = 'TestPass123';
  const email = `back-${Date.now()}@example.com`;

  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Back Tester');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create Account' }).click();
  await page.waitForURL(/\/dashboard$/);

  await page.goto('/cars');
  await page.getByTestId('car-card').first().getByRole('link').first().click();
  await page.waitForURL(/\/car\//);
  await page.getByRole('button', { name: /^favourite$/i }).click();
  await page.waitForTimeout(600);

  await page.goto('/dashboard/favorites');
  await page.getByRole('link', { name: /view details/i }).first().click();
  await page.waitForURL(/\/car\//);

  await page.getByRole('link', { name: /back to all cars/i }).click();
  await page.waitForTimeout(1200);
  expect(page.url()).toContain('/dashboard/favorites');
});

test('arriving cold, back goes to the catalogue', async ({ page, request }) => {
  test.setTimeout(120_000);

  // A shared link or a search result: there is no history of ours behind it,
  // and "back" must not walk the reader off the site.
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
  const list = await (await request.get(`${api}/cars?pageSize=1`)).json();
  const slug = list.data?.[0]?.slug;
  test.skip(!slug, 'no vehicles in the catalogue');

  await page.goto(`/car/${slug}`);
  await page.getByRole('link', { name: /back to all cars/i }).click();
  await page.waitForTimeout(1200);
  expect(page.url()).toContain('/cars');
});
