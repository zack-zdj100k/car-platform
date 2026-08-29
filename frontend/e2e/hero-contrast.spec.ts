import { expect, test, type Page } from '@playwright/test';

/**
 * Contrast of the hero wording against the footage behind it.
 *
 * Automated accessibility tools cannot do this: they compute contrast from CSS
 * colours, and here the background is a video frame under a gradient. So the
 * page is screenshotted with the wording hidden, and the pixels where each line
 * sits are measured directly.
 *
 * It is measured at three moments of the clip and three window sizes, because
 * both change the answer — and one earlier attempt at calming the picture put
 * the headline at 1.03:1 on a tablet, invisible, while still passing every
 * other check in this suite.
 */

/** WCAG 2.2 AA: 3:1 for large text, 4.5:1 for the rest. Plus a margin, since
 *  the footage moves and these are the worst pixels of three frames only. */
const REQUIRED = { head1: 3, head2: 3, eyebrow: 4.5, lede: 4.5 } as const;
const MARGIN = 1.25;

async function worstContrast(page: Page, name: keyof typeof REQUIRED): Promise<number> {
  const target = await page.evaluate((which) => {
    const pick = () => {
      const spans = document.querySelector('h1')!.querySelectorAll('span');
      if (which === 'head1') return spans[0];
      if (which === 'head2') return spans[1];
      if (which === 'eyebrow') return document.querySelector('section p.rise');
      return [...document.querySelectorAll('section p')].find((p) =>
        p.textContent?.includes('second look'),
      );
    };
    const element = pick();
    if (!element?.firstChild) return null;
    const range = document.createRange();
    range.selectNodeContents(element);
    return { rect: range.getBoundingClientRect().toJSON(), colour: getComputedStyle(element).color };
  }, name);

  if (!target) return Infinity;

  await page.evaluate(() => {
    const content = document.querySelector('section .relative.z-10') as HTMLElement | null;
    if (content) content.style.visibility = 'hidden';
  });

  const { x, y, width, height } = target.rect as unknown as DOMRect;
  const shot = await page.screenshot({
    clip: { x: Math.max(0, x), y: Math.max(0, y), width, height },
  });

  const worst = await page.evaluate(
    async ({ url, colour }) => {
      const image = await createImageBitmap(await (await fetch(url)).blob());
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

      const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const lum = (r: number, g: number, b: number) =>
        0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
      const parts = colour.match(/[\d.]+/g)!.map(Number);
      const text = lum(parts[0], parts[1], parts[2]);
      const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

      let lowest = Infinity;
      for (let i = 0; i < data.length; i += 4) {
        const value = ratio(text, lum(data[i], data[i + 1], data[i + 2]));
        if (value < lowest) lowest = value;
      }
      return lowest;
    },
    { url: `data:image/png;base64,${shot.toString('base64')}`, colour: target.colour },
  );

  await page.evaluate(() => {
    const content = document.querySelector('section .relative.z-10') as HTMLElement | null;
    if (content) content.style.visibility = '';
  });

  return worst;
}

const sizes = [
  { name: 'desktop', width: 1440, height: 820 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'phone', width: 390, height: 844 },
];

test.describe('Hero wording over the footage', () => {
  for (const size of sizes) {
    test(`stays legible on ${size.name}`, async ({ page }) => {
      await page.addInitScript(() => window.localStorage.setItem('theme', 'light'));
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto('/');
      await page.waitForFunction(() => document.documentElement.classList.contains('light'));
      await page.waitForTimeout(2000);

      for (const at of [0.5, 3, 6.5]) {
        await page.evaluate((time) => {
          const video = document.querySelector('video') as HTMLVideoElement | null;
          if (video) {
            video.pause();
            video.currentTime = time;
          }
        }, at);
        await page.waitForTimeout(400);

        for (const name of Object.keys(REQUIRED) as (keyof typeof REQUIRED)[]) {
          const measured = await worstContrast(page, name);
          expect(
            measured,
            `${name} at ${at}s on ${size.name} — needs ${REQUIRED[name]}:1 plus margin`,
          ).toBeGreaterThan(REQUIRED[name] * MARGIN);
        }
      }
    });
  }
});
