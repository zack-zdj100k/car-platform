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
    page.locator('div.fixed').filter({ has: page.getByRole('link', { name: /appointment/i }) });

  /**
   * Scrolls until the price is above the window.
   *
   * `mouse.wheel` immediately after `goto` was landing before the page had any
   * height to scroll: the scroll went nowhere, the price stayed on screen, the
   * pill correctly stayed away, and the test failed for a reason that had
   * nothing to do with the pill. This waits for the thing it is scrolling past.
   */
  async function scrollPastThePrice(page: import('@playwright/test').Page) {
    const price = page.locator('main').getByText(/\$|DA|US/).first();
    await price.waitFor();
    await page.evaluate(() => window.scrollTo(0, 2000));
    await page.waitForFunction(() => window.scrollY > 500);
  }

  test('appears even when the reader scrolls straight away', async ({ page }) => {
    /*
     * The trigger used to require having seen the price intersect the viewport
     * at least once. A reader who scrolls the moment the page loads never
     * produces that event, and the pill then never appeared again for the whole
     * page — which is exactly how a real reader behaves.
     */
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(CAR);
    await scrollPastThePrice(page);

    await expect(bar(page)).toBeVisible({ timeout: 5000 });
  });

  test('sits in the bottom right corner of the window', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(CAR);
    await page.waitForLoadState('load');
    await scrollPastThePrice(page);
    await expect(bar(page)).toBeVisible();

    const viewport = page.viewportSize()!;

    /*
     * Measured against the window, not against an ancestor. `position: fixed`
     * is captured by any ancestor with a transform, a filter or a
     * backdrop-filter — in Safari the pill was caught by one and sat halfway up
     * the page under the gallery. It is portalled to the body now.
     *
     * Polled rather than read once: it slides up into place, and reading the
     * box mid-animation measures where it was a moment ago. That is what made
     * this fail one run in ten while passing fifteen times in a row alone.
     */
    await expect
      .poll(async () => {
        // Null while it is still sliding in; that is a "not yet", not a failure.
        const box = await bar(page).boundingBox();
        if (!box) return false;
        return box.y + box.height > viewport.height - 40 && box.x + box.width > viewport.width - 40;
      })
      .toBe(true);
  });

  test('stays away until the price has scrolled off', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(CAR);
    await page.waitForLoadState('load');

    // At the top the price is on screen, so the bar would be noise.
    await expect(bar(page)).toHaveCount(0);

    await scrollPastThePrice(page);
    await expect(bar(page)).toBeVisible();

    // The price and a way to order, and nothing else: it used to repeat the
    // car's name across the full width of the page at a reader who is looking
    // at that very car.
    await expect(bar(page).getByRole('link', { name: /appointment/i })).toBeVisible();
    await expect(bar(page)).not.toContainText('X70 Plus');

    // Small, and out of the way rather than across the top.
    const box = (await bar(page).boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.width).toBeLessThan(viewport.width / 2);
    expect(box.y).toBeGreaterThan(viewport.height / 2);

    // And goes away again when the real price comes back.
    await page.evaluate(() => window.scrollTo(0, 0));
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
      await scrollPastThePrice(page);
      await expect(bar(page)).toBeVisible();
      // The colour travels with the order, as it does from the button above.
      await expect(bar(page).getByRole('link', { name: /appointment/i })).toHaveAttribute(
        'href',
        /color=/,
      );
    }
  });
});
