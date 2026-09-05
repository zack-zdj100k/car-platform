import { expect, test } from '@playwright/test';

/**
 * The customer's own photograph.
 *
 * This was a text field asking for a path on a server the customer has never
 * seen. It is the file now, and it saves as soon as it is chosen rather than
 * waiting for the form below it — an upload is its own action with its own
 * outcome.
 */

/** A real 1×1 PNG. The API reads the bytes, so an invented one is refused. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test('a customer uploads and removes their own picture', async ({ page }) => {
  test.setTimeout(120_000);
  const email = `avatar-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
  const password = 'TestPass123';

  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Avatar Tester');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/dashboard/profile');

  // No path field any more — the file itself.
  await expect(page.getByPlaceholder('/images/')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^upload$/i })).toBeVisible();

  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });

  // The picture is saved on its own, without pressing Save below.
  await expect(page.getByRole('button', { name: /replace/i })).toBeVisible({ timeout: 20_000 });
  // The uploaded file itself, not the site's logo — which also carries alt="".
  await expect(page.locator('img[src*="/uploads/"], img[src*="res.cloudinary"]').first()).toBeVisible();

  await page.getByRole('button', { name: /^remove$/i }).click();
  await expect(page.getByRole('button', { name: /^upload$/i })).toBeVisible({ timeout: 20_000 });
});
