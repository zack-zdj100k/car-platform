import { expect, test } from '@playwright/test';

/**
 * The bar that follows the reader down a car's page.
 *
 * Its whole job is to appear at the right moment, which is a thing only a
 * browser can be asked about: it depends on where the price sits, which depends
 * on the window and on how much wording is above it.
 */
test.describe('Sticky order bar', () => {
  const CAR = '/car/jetour-x70-plus-2024';

  const bar = (page: import('@playwright/test').Page) =>
    page.locator('div.fixed').filter({ has: page.getByRole('link', { name: /order/i }) });

  test('stays away until the price has scrolled off', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(CAR);
    await page.waitForLoadState('load');

    // At the top the price is on screen, so the bar would be noise.
    await expect(bar(page)).toHaveCount(0);

    await page.mouse.wheel(0, 1400);
    await expect(bar(page)).toBeVisible();

    // The price and a way to order, and nothing else: it used to repeat the
    // car's name across the full width of the page at a reader who is looking
    // at that very car.
    await expect(bar(page).getByRole('link', { name: /order/i })).toBeVisible();
    await expect(bar(page)).not.toContainText('X70 Plus');

    // Small, and out of the way rather than across the top.
    const box = (await bar(page).boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.width).toBeLessThan(viewport.width / 2);
    expect(box.y).toBeGreaterThan(viewport.height / 2);

    // And goes away again when the real price comes back.
    await page.mouse.wheel(0, -1400);
    await expect(bar(page)).toHaveCount(0);
  });

  test('does not appear before the reader has reached the price', async ({ page }) => {
    // On a phone the price starts below the fold: announcing it over the
    // photograph the reader is still looking at would be backwards.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(CAR);
    await page.waitForLoadState('load');

    await expect(bar(page)).toHaveCount(0);
  });

  test('orders the colour the reader chose', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(CAR);
    await page.waitForLoadState('load');

    const swatches = page.locator('button[aria-pressed][aria-label]');
    if ((await swatches.count()) > 1) {
      await swatches.nth(1).click();
      await page.mouse.wheel(0, 1400);
      await expect(bar(page)).toBeVisible();
      // The colour travels with the order, as it does from the button above.
      await expect(bar(page).getByRole('link', { name: /order/i })).toHaveAttribute(
        'href',
        /color=/,
      );
    }
  });
});
