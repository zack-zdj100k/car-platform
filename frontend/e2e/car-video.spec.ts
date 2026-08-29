import { expect, test } from '@playwright/test';

/**
 * A car's own video.
 *
 * The clips used to be TikTok links, which sent a customer away from the car,
 * the price and the order button. They are uploaded files now, so everything
 * below is about them playing where the customer already is.
 */

const CAR_WITH_VIDEO = '/car/jetour-x70-plus-2024';

test.describe('Car video', () => {
  test('offers a way to the video without playing it here', async ({ page }) => {
    await page.goto(CAR_WITH_VIDEO);
    await page.waitForLoadState('load');

    /*
     * A button, not an embedded player. The clip belongs on the Videos page
     * beside every other car's; embedded here it put a second large moving
     * thing on a page that already leads with the gallery, and pushed the price
     * and the order button down.
     */
    const watch = page.locator('main a[href^="/videos#"]');
    await expect(watch).toHaveCount(1);
    await expect(watch).toBeVisible();
    await expect(page.locator('main video')).toHaveCount(0);

    // And nothing sends the customer off to TikTok to watch the car.
    await expect(page.locator('main a[href*="tiktok.com"]')).toHaveCount(0);
  });

  test('the card carries a watch button that leads to the video', async ({ page }) => {
    await page.goto('/cars');
    await page.waitForLoadState('load');

    const watch = page.getByTestId('car-card').locator('a[href^="/videos#"]').first();
    await expect(watch).toBeVisible();

    const href = await watch.getAttribute('href');
    await watch.click();

    // Client-side navigation: waiting on a load event would return at once,
    // before the route had changed at all.
    await page.waitForURL('**/videos#*');

    const slug = href!.split('#')[1];
    expect(page.url()).toContain(`/videos#${slug}`);

    // And the car it points at is really on that page.
    await expect(page.locator(`#${slug}`)).toBeVisible();
  });

  test('cars without a video have no watch button', async ({ page }) => {
    await page.goto('/cars');
    // The catalogue arrives after a fetch; counting before it does counts zero.
    await expect(page.getByTestId('car-card').first()).toBeVisible();

    const cards = await page.getByTestId('car-card').count();
    const buttons = await page.getByTestId('car-card').locator('a[href^="/videos#"]').count();

    // Only the cars that actually have a clip offer one.
    expect(buttons).toBeGreaterThan(0);
    expect(buttons).toBeLessThan(cards);
  });

  test('the videos page plays the clip in place', async ({ page }) => {
    await page.goto('/videos');
    await page.waitForLoadState('load');

    await page.getByRole('button', { name: /X70 Plus/i }).first().click();

    const video = page.locator('[role="dialog"] video');
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute('src', /\/uploads\/.+\.(mp4|webm)$/);

    // The old behaviour opened TikTok in a new tab from here.
    await expect(page.locator('[role="dialog"] a[target="_blank"]')).toHaveCount(0);
  });
});
