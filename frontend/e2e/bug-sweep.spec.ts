import { expect, test, type Browser, type ConsoleMessage, type Page } from '@playwright/test';

/**
 * Whole-site bug sweep.
 *
 * Visits every route as an administrator — the role that can reach everything —
 * and fails on any console error, page error or broken image. This is what
 * catches the class of bug that only appears when a page actually renders with
 * real data, like a type that promised a field the API never sent.
 */

const IGNORE = [
  // The silent session refresh legitimately 401s when not signed in yet.
  /401 \(Unauthorized\)/,
  /Failed to load resource: the server responded with a status of 401/,
];

function collect(page: Page) {
  const problems: string[] = [];

  page.on('console', (message: ConsoleMessage) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (IGNORE.some((pattern) => pattern.test(text))) return;
    problems.push(`console: ${text}`);
  });

  page.on('pageerror', (error) => {
    problems.push(`pageerror: ${error.message}`);
  });

  return problems;
}

async function brokenImages(page: Page) {
  return page.evaluate(() =>
    [...document.images]
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src),
  );
}

const publicRoutes = [
  ['home', '/', 'h1'],
  ['cars', '/cars', 'article'],
  ['about', '/about', 'h1'],
  ['sign in', '/login', 'form'],
  ['sign up', '/signup', 'form'],
] as const;

test.describe('Public pages are error-free', () => {
  for (const [name, path, ready] of publicRoutes) {
    test(`${name} renders without errors or broken images`, async ({ page }) => {
      const problems = collect(page);
      await page.goto(path);
      await page.waitForSelector(ready);
      await page.waitForTimeout(1200);

      expect(await brokenImages(page)).toEqual([]);
      expect(problems).toEqual([]);
    });
  }

  test('car detail and order form render without errors', async ({ page }) => {
    const problems = collect(page);

    await page.goto('/cars');
    await page.locator('article a').first().click();
    await expect(page).toHaveURL(/\/car\//);
    await page.waitForTimeout(1000);

    await page.getByRole('link', { name: 'Order this car' }).click();
    await expect(page).toHaveURL(/\/order/);
    await page.waitForTimeout(1000);

    expect(await brokenImages(page)).toEqual([]);
    expect(problems).toEqual([]);
  });
});

/**
 * Admin pages, all driven through one signed-in session.
 *
 * A saved `storageState` cannot be reused here: refresh tokens rotate on every
 * use, so replaying a stored cookie is treated as replay and leaves the browser
 * signed out. One context, opened once and shared, keeps the rotating cookie
 * current — and costs a single login instead of one per test.
 */
test.describe('Every admin page is error-free', () => {
  test.describe.configure({ mode: 'serial' });

  let page: Page;
  let problems: string[];

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    test.skip(!email || !password, 'Seed admin credentials are not configured');

    const context = await browser.newContext();
    page = await context.newPage();
    problems = collect(page);

    await page.goto('/login');
    await page.getByLabel('Email address').fill(email!);
    await page.getByLabel('Password', { exact: true }).fill(password!);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test.beforeEach(() => {
    // Each test judges only the errors it produced.
    problems.length = 0;
  });

  const adminRoutes = [
    ['overview', '/admin/dashboard', 'Overview'],
    ['cars', '/admin/cars', 'Manage Cars'],
    ['add car', '/admin/cars/add', 'Add New Car'],
    ['orders', '/admin/orders', 'Manage Orders'],
    ['users', '/admin/users', 'Manage Users'],
    ['analytics', '/admin/analytics', 'Analytics'],
    ['settings', '/admin/settings', 'Website Settings'],
  ] as const;

  for (const [name, path, heading] of adminRoutes) {
    test(`${name} renders without errors`, async () => {
      await page.goto(path);

      // Assert the real page, not just any h1 — the login page has one too, so
      // a silent redirect would otherwise pass unnoticed.
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
      await page.waitForTimeout(1200);

      expect(await brokenImages(page)).toEqual([]);
      expect(problems).toEqual([]);
    });
  }

  test('the order status dialog opens and applies a change', async () => {
    await page.goto('/admin/orders');
    await expect(page).toHaveURL(/\/admin\/orders$/);

    /*
     * Find an order that still has somewhere to go.
     *
     * Only COMPLETED is terminal, so any other status offers a transition.
     * Choosing by status rather than by position keeps this independent of what
     * earlier runs left behind, and it creates nothing — so the
     * order-submission rate limit cannot defeat it.
     */
    let reference: string | null = null;
    for (const status of ['PENDING', 'CONTACTED', 'CONFIRMED', 'CANCELLED']) {
      await page.locator('#order-status').click();
      await page.getByRole('option', { name: status, exact: true }).click();
      await page.waitForTimeout(700);

      if ((await page.locator('tbody tr').count()) > 0) {
        reference = (await page.locator('tbody tr').first().locator('td').first().textContent())!.trim();
        break;
      }
    }

    expect(reference, 'no order with a remaining transition was found').not.toBeNull();
    await expect(page.locator('tbody tr').first()).toContainText(reference!);

    // The flow that used to crash: the dialog read status history the list
    // endpoint never returns.
    await page.locator('tbody tr').first().getByRole('button').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('History')).toBeVisible();

    await dialog.locator('#next-status').click();
    const option = page.getByRole('option').first();
    const chosen = (await option.textContent())!.trim();
    await option.click();

    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();

    await page.locator('#order-status').click();
    await page.getByRole('option', { name: chosen, exact: true }).click();
    await expect(page.getByText(reference!, { exact: true })).toBeVisible();

    expect(problems).toEqual([]);
  });

  test('the customer dashboard pages are error-free', async () => {
    for (const [path, heading] of [
      ['/dashboard', 'Welcome back'],
      ['/dashboard/favorites', 'Favourite Cars'],
      ['/dashboard/recent', 'Recently Viewed'],
      ['/dashboard/compare', 'Compare'],
      ['/dashboard/orders', 'My Orders'],
      ['/dashboard/profile', 'My Profile'],
    ] as const) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
      await page.waitForTimeout(700);
      expect(await brokenImages(page), `broken images on ${path}`).toEqual([]);
    }

    expect(problems).toEqual([]);
  });
});
