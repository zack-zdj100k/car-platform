import { expect, test, type Page } from '@playwright/test';

/**
 * The hero footage, which differs by theme.
 *
 * The clip a visitor sees is chosen in the browser, after the theme resolves —
 * so this is the sort of thing that can only be verified by loading the page
 * and looking at what the video element actually fetched.
 */

async function openWithTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
  await page.goto('/');
  await page.waitForFunction(
    (value) => document.documentElement.classList.contains(value),
    theme,
  );
  return page.locator('video').first();
}

test.describe('Hero footage', () => {
  test('light mode plays the light clip', async ({ page }) => {
    const video = await openWithTheme(page, 'light');

    await expect
      .poll(async () => video.evaluate((node: HTMLVideoElement) => node.currentSrc))
      .toContain('hero-light.mp4');
    await expect(video).toHaveAttribute('poster', '/videos/hero-light-poster.jpg');
  });

  test('dark mode keeps the original clip', async ({ page }) => {
    const video = await openWithTheme(page, 'dark');

    await expect
      .poll(async () => video.evaluate((node: HTMLVideoElement) => node.currentSrc))
      .toContain('hero.mp4');
    await expect
      .poll(async () => video.evaluate((node: HTMLVideoElement) => node.currentSrc))
      .not.toContain('hero-light.mp4');
    await expect(video).toHaveAttribute('poster', '/videos/hero-poster.jpg');
  });

  test('only the clip being shown is fetched', async ({ page }) => {
    const requested: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/videos/')) requested.push(request.url());
    });

    await openWithTheme(page, 'light');
    await page.waitForTimeout(2500);

    /*
     * The alternative — rendering both and hiding one — would cost every
     * visitor a six megabyte download of footage they never see.
     */
    expect(requested.some((url) => url.includes('hero-light.mp4'))).toBe(true);
    expect(requested.some((url) => url.endsWith('/videos/hero.mp4'))).toBe(false);
  });

  test('never shows the other theme\'s car, even for a moment', async ({ page }) => {
    const requested: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/videos/')) requested.push(request.url());
    });

    /*
     * Reloading the daytime site used to open on a second of the night car:
     * the still frame was chosen in JavaScript, which cannot run until after
     * the first paint, so the night poster was painted and then replaced.
     *
     * The posters are now chosen by CSS, and the theme is on the document
     * before the first paint — so the wrong one is never painted, and never
     * even fetched. Fetching is what this asserts, being the only part a test
     * can see without racing the paint.
     */
    await openWithTheme(page, 'light');
    await page.waitForTimeout(2500);

    expect(requested.some((url) => url.includes('hero-light-poster.jpg'))).toBe(true);
    expect(requested.some((url) => url.endsWith('/videos/hero-poster.jpg'))).toBe(false);
  });

  test('the footage actually plays', async ({ page }) => {
    const video = await openWithTheme(page, 'light');

    // Autoplay is allowed because it is muted; if that ever stops being true
    // the hero becomes a still image and nobody would otherwise notice.
    await expect(video).toHaveJSProperty('muted', true);
    await expect
      .poll(
        async () => video.evaluate((node: HTMLVideoElement) => node.currentTime),
        { timeout: 10_000 },
      )
      .toBeGreaterThan(0);
  });
});
