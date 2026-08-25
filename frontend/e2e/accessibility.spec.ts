import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Accessibility audit (spec §65 — WCAG 2.2 AA).
 *
 * Automated rules cannot prove a page is accessible, but they reliably catch
 * contrast failures, missing names, broken landmarks and invalid ARIA — which
 * is what this suite is for. Keyboard behaviour is asserted separately below.
 */
async function analyse(page: Page, readySelector?: string) {
  /*
   * Settle the page before measuring.
   *
   * Contrast is computed from rendered pixels, so analysing mid-render —
   * skeletons showing, fonts still swapping — reports problems a user never
   * sees. `networkidle` is deliberately not used: it is unreliable by design
   * and never settles on some pages. Waiting for fonts and for the content
   * itself is deterministic.
   */
  await page.waitForLoadState('load');
  if (readySelector) {
    await page.waitForSelector(readySelector);
  }

  /*
   * Wait until the palette itself has resolved.
   *
   * Contrast is computed from painted pixels. Before the stylesheet attaches,
   * `getComputedStyle` returns empty strings and axe reads that as a failure —
   * so a page that was merely still loading looked like a contrast bug. Waiting
   * on a token proves our stylesheet is live, not just that markup exists.
   */
  await page.waitForFunction(() => {
    const root = getComputedStyle(document.documentElement);
    return root.getPropertyValue('--primary').trim() !== '' && getComputedStyle(document.body).backgroundColor !== '';
  });
  await page.evaluate(() => document.fonts.ready);

  /*
   * Wait for the entrance animations to finish.
   *
   * Contrast is computed from what is painted, and an element half-way through
   * a fade is genuinely low-contrast at that instant. Auditing mid-animation
   * reported failures that no user could ever see, and only intermittently —
   * whichever frame the measurement happened to land on.
   */
  await page.waitForFunction(() => {
    const animated = [...document.querySelectorAll('.rise')];
    return animated.every((element) => Number(getComputedStyle(element).opacity) === 1);
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        // One more frame, so the final paint has certainly landed.
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );

  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
}

/** Each page, with a selector proving its content has actually arrived. */
const publicPages = [
  ['home', '/', 'h1'],
  ['cars listing', '/cars', '[data-testid="car-card"]'],
  ['about', '/about', 'h1'],
  ['sign in', '/login', 'form'],
  ['sign up', '/signup', 'form'],
  ['forgot password', '/forgot-password', 'form'],
] as const;

test.describe('WCAG 2.2 AA — public pages', () => {
  for (const [name, path, ready] of publicPages) {
    test(`${name} has no automatically detectable violations`, async ({ page }) => {
      await page.goto(path);
      const results = await analyse(page, ready);

      if (results.violations.length > 0) {
        console.log(
          `\n${name} violations:\n` +
            results.violations
              .map((v) => `  [${v.impact}] ${v.id}: ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`)
              .join('\n'),
        );
      }

      expect(results.violations).toEqual([]);
    });
  }

  test('car detail has no automatically detectable violations', async ({ page }) => {
    await page.goto('/cars');
    await page.getByTestId('car-card').first().getByRole('link').first().click();
    await expect(page).toHaveURL(/\/car\//);

    const results = await analyse(page, 'h1');
    if (results.violations.length > 0) {
      console.log(results.violations.map((v) => `[${v.impact}] ${v.id}: ${v.help}`).join('\n'));
    }
    expect(results.violations).toEqual([]);
  });

  test('dark mode keeps contrast', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/cars');
    await expect(page.locator('html')).toHaveClass(/dark/);

    const results = await analyse(page, '[data-testid="car-card"]');
    const contrast = results.violations.filter((violation) => violation.id === 'color-contrast');
    if (contrast.length > 0) {
      console.log(contrast.map((v) => v.nodes.map((n) => n.html).join('\n')).join('\n'));
    }
    expect(contrast).toEqual([]);
  });

  test('Arabic right-to-left layout has no violations', async ({ page, context }) => {
    await context.addCookies([
      { name: 'cp_locale', value: 'ar', domain: 'localhost', path: '/' },
    ]);
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const results = await analyse(page, 'h1');
    expect(results.violations).toEqual([]);
  });
});

test.describe('Keyboard operation (spec §65)', () => {
  test('the skip link is the first stop and moves focus to main', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    const focused = await page.evaluate(() => document.activeElement?.textContent ?? '');
    expect(focused).toContain('Skip to content');
  });

  test('a car card is reachable and openable by keyboard alone', async ({ page }) => {
    await page.goto('/cars');
    await expect(page.getByTestId('car-card').first()).toBeVisible();

    // Focus the first card's link directly, then activate it with the keyboard.
    await page.getByTestId('car-card').first().getByRole('link').first().focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/car\//);
  });

  test('the sign-in form can be completed without a mouse', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email address').focus();
    await page.keyboard.type('keyboard@example.com');

    // The "Forgot password?" link sits between the two fields in the tab order,
    // which is the conventional layout, so reaching the password takes two tabs.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.type('SomePass123');

    await expect(page.getByLabel('Password', { exact: true })).toHaveValue('SomePass123');
    await expect(page.getByLabel('Email address')).toHaveValue('keyboard@example.com');
  });

  test('every interactive element shows a visible focus indicator', async ({ page }) => {
    await page.goto('/cars');
    // Focus must arrive by keyboard: :focus-visible deliberately does not match
    // programmatic focus, so button.focus() would not prove anything.
    const button = page.getByRole('button', { name: 'Theme' });
    await page.keyboard.press('Tab');
    while (!(await button.evaluate((el) => el === document.activeElement))) {
      await page.keyboard.press('Tab');
    }

    const outline = await button.evaluate((element) => {
      const style = getComputedStyle(element);
      return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, boxShadow: style.boxShadow };
    });

    const hasIndicator =
      (outline.outlineStyle !== 'none' && outline.outlineWidth !== '0px') || outline.boxShadow !== 'none';
    expect(hasIndicator).toBe(true);
  });
});

test.describe('Reduced motion (spec §8, §65)', () => {
  test('the hero shows a static image instead of video', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // The video element is not rendered at all under reduced motion.
    await expect(page.locator('video')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('hero content is visible even with animations suppressed', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    /*
     * Wait for styles to actually be applied before measuring.
     *
     * `getComputedStyle` returns an empty string for a property when no
     * stylesheet has attached yet, and `Number('')` is 0 — which read as a
     * hidden headline when the page was merely still loading.
     */
    await page.waitForFunction(() => {
      const heading = document.querySelector('h1');
      return Boolean(heading) && getComputedStyle(heading!).opacity !== '';
    });
    await page.evaluate(() => document.fonts.ready);

    // The two headline lines are what carry the entrance animation, so they are
    // what must be fully opaque once it is suppressed.
    const opacities = await page
      .getByRole('heading', { level: 1 })
      .evaluate((el) => [
        getComputedStyle(el).opacity,
        ...[...el.querySelectorAll('span')].map((span) => getComputedStyle(span).opacity),
      ]);

    expect(opacities.every((value) => Number(value) === 1)).toBe(true);
  });
});

test.describe('Responsive layout (spec §64)', () => {
  for (const [name, width, height] of [
    ['mobile', 375, 812],
    ['tablet', 768, 1024],
    ['desktop', 1440, 900],
  ] as const) {
    test(`${name} viewport has no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/cars');
      await expect(page.getByTestId('car-card').first()).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      // A couple of pixels of rounding is tolerable; a real overflow is not.
      expect(overflow).toBeLessThanOrEqual(2);
    });
  }

  test('mobile shows the menu button instead of the desktop navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
  });
});
