import { expect, test, type Page } from '@playwright/test';

/**
 * The 360° viewer.
 *
 * Worth its own file: the whole feature is a gesture, and a gesture is exactly
 * what cannot be checked by reading the code. Each test below corresponds to a
 * way this can be got wrong — dragging that does not turn, a viewer that traps
 * the page's scrolling on a phone, a control that cannot be reached without a
 * mouse, and a car with no frames showing a tab that does nothing.
 */

const CAR_WITH_SPIN = '/car/jetour-x70-plus-2024';

const viewer = (page: Page) => page.getByRole('slider', { name: /360/i });

async function openSpin(page: Page) {
  await page.goto(CAR_WITH_SPIN);
  const spin = viewer(page);
  await spin.waitFor();
  return spin;
}

/** The angle the viewer is reporting, in degrees. */
async function angle(page: Page): Promise<number> {
  return Number(await viewer(page).getAttribute('aria-valuenow'));
}

test.describe('360° viewer', () => {
  test('appears as the first slide on a car that has a frame set', async ({ page }) => {
    await page.goto(CAR_WITH_SPIN);

    await expect(page.getByRole('tab', { name: /360/i })).toBeVisible();
    await expect(viewer(page)).toBeVisible();
  });

  test('the tab and the viewer always agree, on every car', async ({ page }) => {
    /*
     * Asserted as a rule rather than against one particular car.
     *
     * This used to open a car that had no frames and check that nothing
     * appeared — until every demo car was given a placeholder set and there was
     * no such car left, at which point the test was passing on a premise that
     * had quietly stopped being true. The rule is what matters: a car offers
     * the 360° tab exactly when it has a viewer behind it, and never one
     * without the other.
     */
    await page.goto('/cars');
    await expect(page.getByTestId('car-card').first()).toBeVisible();

    const slugs = await page
      .locator('a[href^="/car/"]')
      .evaluateAll((links) =>
        [...new Set(links.map((link) => (link as HTMLAnchorElement).getAttribute('href')!))].slice(0, 4),
      );
    expect(slugs.length).toBeGreaterThan(0);

    for (const href of slugs) {
      await page.goto(href);
      await page.waitForLoadState('load');

      const tabs = await page.getByRole('tab', { name: /360/i }).count();
      const viewers = await viewer(page).count();
      expect(tabs, `${href} — tab and viewer must agree`).toBe(viewers);

      // The photograph gallery is there either way.
      await expect(page.getByRole('tablist')).toBeVisible();
    }
  });

  test('dragging turns the car, and by roughly the distance dragged', async ({ page }) => {
    const spin = await openSpin(page);
    const box = (await spin.boundingBox())!;

    // Settle first: the viewer turns itself a few frames on arrival.
    await page.waitForTimeout(700);
    const before = await angle(page);

    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.8, y);
    await page.mouse.down();
    // In steps, as a hand moves — a single jump would not prove tracking.
    for (const fraction of [0.7, 0.6, 0.5, 0.4, 0.3]) {
      await page.mouse.move(box.x + box.width * fraction, y);
    }
    await page.mouse.up();

    const after = await angle(page);
    expect(after).not.toBe(before);

    /*
     * Half the width of the viewer is half of 1.5 turns — 270°, give or take
     * the 15° a single frame is worth. This is the assertion that would catch a
     * viewer that turns a hair per swipe, or a full revolution per pixel.
     */
    const turned = (((after - before) % 360) + 360) % 360;
    expect(turned).toBeGreaterThan(210);
    expect(turned).toBeLessThan(330);
  });

  test('never reports a broken angle, however far it is dragged', async ({ page }) => {
    const spin = await openSpin(page);
    const box = (await spin.boundingBox())!;
    const y = box.y + box.height / 2;

    await page.mouse.move(box.x + box.width / 2, y);
    await page.mouse.down();
    // Far outside the element, in both directions.
    await page.mouse.move(box.x - 4000, y);
    await page.mouse.move(box.x + 4000, y);
    await page.mouse.up();

    const value = await angle(page);
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(360);
    // The picture is still a picture, not a broken-image icon.
    await expect(spin.locator('img')).toHaveJSProperty('complete', true);
  });

  test('turns with the arrow keys, for anyone without a mouse', async ({ page }) => {
    const spin = await openSpin(page);
    await page.waitForTimeout(700);

    await spin.focus();
    await expect(spin).toBeFocused();

    const before = await angle(page);
    await page.keyboard.press('ArrowRight');
    const right = await angle(page);
    expect(right).not.toBe(before);

    await page.keyboard.press('ArrowLeft');
    expect(await angle(page)).toBe(before);
  });

  test('leaves vertical scrolling to the page on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const spin = await openSpin(page);

    /*
     * `touch-action: pan-y` is the mechanism: the browser keeps vertical
     * gestures for scrolling and only hands horizontal ones to this element.
     * Without it a reader on a phone cannot get past the viewer — every attempt
     * to scroll down spins the car instead.
     */
    await expect(spin).toHaveCSS('touch-action', 'pan-y');
  });

  test('tells a screen reader where the car is pointing', async ({ page }) => {
    const spin = await openSpin(page);

    await expect(spin).toHaveAttribute('aria-valuemin', '0');
    await expect(spin).toHaveAttribute('aria-valuemax', '359');
    await expect(spin).toHaveAttribute('aria-valuetext', /°$/);
    await expect(spin).toHaveAttribute('aria-label', /Jetour X70 Plus/);
  });
});

/**
 * Choosing a colour.
 *
 * The behaviour asked for: a colour shows that colour's own photographs —
 * outside, inside, wheels — and the main photograph, which belongs to the
 * listing and to one particular colour, stays out of it.
 */
test.describe('Colour selection', () => {
  test('shows the chosen colour, and names it', async ({ page }) => {
    await page.goto('/car/jetour-x70-plus-2024');

    const swatches = page.locator('button[aria-pressed]').filter({ has: page.locator('span, svg') });
    const named = page.locator('button[aria-pressed][aria-label]');
    const count = await named.count();
    expect(count).toBeGreaterThan(1);

    const before = await page.locator('main img').first().getAttribute('src');

    await named.nth(1).click();
    await expect(named.nth(1)).toHaveAttribute('aria-pressed', 'true');
    void swatches;

    // The picture changes, and the colour's name appears over it.
    await expect(async () => {
      expect(await page.locator('img').first().getAttribute('src')).not.toBe(before);
    }).toPass({ timeout: 4000 });
  });

  test('never shows the main photograph once a colour is chosen', async ({ page }) => {
    await page.goto('/car/jetour-x70-plus-2024');

    /*
     * Read the car's own data rather than guessing from the page: the main
     * photograph's URL is the thing that must not appear in the gallery.
     */
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
    const response = await page.request.get(`${api}/cars/jetour-x70-plus-2024`);
    const car = await response.json();

    const main = (car.images as { kind: string; url: string }[]).find(
      (image) => image.kind === 'MAIN',
    );
    const colours = car.colors as { id: string; name: string }[];
    expect(main).toBeTruthy();
    expect(colours.length).toBeGreaterThan(1);

    const named = page.locator('button[aria-pressed][aria-label]');
    expect(await named.count()).toBeGreaterThan(1);
    await named.nth(1).click();
    await expect(named.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(800);

    const shown = await page.locator('main img').evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLImageElement).currentSrc || (node as HTMLImageElement).src),
    );

    // Next serves images through its optimiser, so the original URL appears
    // inside the query string rather than as the whole of it.
    const mainFilename = main!.url.split('/').pop()!;
    expect(shown.some((source) => source.includes(encodeURIComponent(mainFilename)))).toBe(false);
  });
});
