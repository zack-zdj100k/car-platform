import { expect, test, type Page } from '@playwright/test';

/**
 * What each screen size is supposed to get.
 *
 * Three faults this file exists to catch, all of them found on real windows
 * rather than in the code:
 *
 *   1. A phone scrolling sideways, because the showroom card was a fixed 380px
 *      on a 390px screen.
 *   2. The hero footage cropped to an unrecognisable strip, because a square
 *      clip in a 9:19 window keeps about a quarter of the frame.
 *   3. The specification card taking a tablet's ring apart to make room it only
 *      needs on a desktop.
 */

const PHONE = { width: 390, height: 844 };
const TABLET = { width: 834, height: 1112 };
const DESKTOP = { width: 1440, height: 900 };

async function open(page: Page, size: typeof PHONE, theme: 'light' | 'dark' = 'light') {
  await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
  await page.setViewportSize(size);
  await page.goto('/');
  await page.waitForLoadState('load');
}

test.describe('On a phone', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`the page never scrolls sideways in ${theme} mode`, async ({ page }) => {
      await open(page, PHONE, theme);
      await page.waitForTimeout(1500);

      // The whole document, not one element: a single overflowing card is
      // enough to make every page on the site drag horizontally.
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, 'the home page is wider than the screen').toBeLessThanOrEqual(
        clientWidth + 1,
      );
    });
  }

  test('the hero shows the footage at the shape it was filmed in', async ({ page }) => {
    await open(page, PHONE);
    await page.waitForTimeout(2000);

    const band = page.locator('.hero-band');
    const box = (await band.boundingBox())!;

    /*
     * Landscape-ish, and nothing like the window: this is what says the clip is
     * being shown rather than cropped into a portrait slot. The daytime clip is
     * square and is given a ratio a tenth wider, which trims the strip carrying
     * the generator's watermark.
     */
    const ratio = box.width / box.height;
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(1.3);
    expect(box.width).toBeLessThanOrEqual(PHONE.width + 1);
  });

  test('the showroom card fits, and is open without a hover', async ({ page }) => {
    await open(page, PHONE);
    const section = page.locator('#location');
    test.skip((await section.count()) === 0, 'no showroom location is configured');

    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);

    const card = page.locator('#location a[href][target="_blank"]');
    const box = (await card.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(PHONE.width);

    // On a touch screen the first tap follows the link, so anything that only
    // appears on hover — the address included — would never be read at all.
    await expect(section).toContainText(/\S/);
    await expect(card).toBeVisible();
  });
});

test.describe('The specification card', () => {
  async function cardWidth(page: Page, size: typeof TABLET): Promise<number> {
    await open(page, size);
    await page.locator('#features').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    // `force`, because the points are on a ring that turns by itself.
    await page.getByRole('button', { name: 'Engine' }).click({ force: true });
    await page.waitForTimeout(800);
    const box = (await page.locator('[id^="orbit-detail-"]').boundingBox())!;
    return box.width;
  }

  test('is the wider one only on a desktop', async ({ page }) => {
    expect(await cardWidth(page, DESKTOP)).toBeGreaterThan(440);
  });

  test('leaves a tablet its diagram', async ({ page }) => {
    // 20rem. Wider than this and the ring beside it has nowhere to go.
    expect(await cardWidth(page, TABLET)).toBeLessThanOrEqual(330);
  });
});
