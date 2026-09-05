import { expect, test, type Page } from '@playwright/test';

/**
 * Critical user flows through the real interface (spec §71).
 *
 * The backend journey is covered by the integration suite; this proves the same
 * path works through the browser: sign up, browse, filter, open a car,
 * favourite it, order it, then see it as an administrator.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const uniqueEmail = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
const PASSWORD = 'E2ePass123';

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

test.describe('Public site', () => {
  test('home page shows the hero, features and featured vehicles', async ({ page }) => {
    await page.goto('/');

    // The headline is set as two overlapping lines inside one <h1>.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Premium.');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Accessible.');
    // It must be visible without waiting on a JS animation.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expect(page.getByRole('link', { name: 'Explore Cars' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Discover' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Featured vehicles' })).toBeVisible();
    await expect(page.getByTestId('car-card').first()).toBeVisible();
  });

  test('the explore call to action leads to the cars page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Explore Cars' }).click();

    await expect(page).toHaveURL(/\/cars$/);
    await expect(page.getByRole('heading', { name: 'Cars', level: 1 })).toBeVisible();
  });

  test('cars page filters by brand and keeps the filter in the URL', async ({ page }) => {
    await page.goto('/cars');
    await expect(page.getByTestId('car-card')).not.toHaveCount(0);

    // The controls open on request at every width now, rather than standing in
    // a column of their own.
    await page.getByRole('button', { name: /Filters/i }).click();
    const brandCheckbox = page.locator('[id^="brand-"]').first();
    const brandSlug = (await brandCheckbox.getAttribute('id'))!.replace('brand-', '');
    await brandCheckbox.click();

    await expect(page).toHaveURL(new RegExp(`brand=${brandSlug}`));
    // A filtered view is shareable: reloading keeps the same results.
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`brand=${brandSlug}`));
  });

  test('search narrows the catalogue', async ({ page }) => {
    await page.goto('/cars');
    await page.getByRole('button', { name: /Filters/i }).click();
    await page.getByLabel('Search', { exact: true }).fill('tiggo');

    await expect(page).toHaveURL(/search=tiggo/);
    await expect(page.getByTestId('car-card').first()).toContainText(/Tiggo/i);
  });

  test('car detail shows every specification group', async ({ page }) => {
    /*
     * A car known to have every group filled in, rather than whichever card
     * happens to be first.
     *
     * The catalogue is ordered newest first, so "the first card" is whatever
     * was added most recently — and a car added a minute ago has no engine,
     * safety or dimension figures yet. The page was right; the test was reading
     * a car that had nothing to show.
     */
    await page.goto('/car/byd-seal-2024');

    await expect(page).toHaveURL(/\/car\//);
    await expect(page.getByRole('heading', { name: 'Specifications' })).toBeVisible();

    for (const section of ['Vehicle identity', 'Engine & performance', 'Safety', 'Dimensions']) {
      await expect(page.getByRole('button', { name: section })).toBeVisible();
    }
  });

  test('the master prompt URLs redirect to the route map paths', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/sign-up');
    await expect(page).toHaveURL(/\/signup$/);
  });

  test('the forgot-password link reaches a working page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();

    // This link used to 404: the page had never been built.
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Reset your password');

    await page.getByLabel('Email address').fill('someone@example.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();

    // The same confirmation regardless of whether the address exists.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your email');
  });

  test('about page renders the mission and values', async ({ page }) => {
    await page.goto('/about');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Driven by Passion');
    await expect(page.getByRole('heading', { name: 'Our Values' })).toBeVisible();
  });
});

test.describe('Accessibility basics', () => {
  test('every page exposes a skip link and one main landmark', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeAttached();
    await expect(page.locator('main')).toHaveCount(1);
  });

  test('the language switcher changes the interface language', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Language' }).click();
    await page.getByRole('menuitemradio', { name: /Français/ }).click();

    // The desktop and mobile navigations both render the links, so scope the
    // assertion to the header's primary navigation.
    await expect(page.locator('header nav').first()).toContainText('Accueil');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('Arabic switches the document to right-to-left', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Language' }).click();
    await page.getByRole('menuitemradio', { name: /العربية/ }).click();

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});

test.describe('Protected routes', () => {
  test('an anonymous visitor is sent to sign in', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test('an anonymous visitor cannot reach the admin panel', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});

test.describe('Customer journey', () => {
  const email = uniqueEmail();

  test('registers, favourites a car and submits an order', async ({ page }) => {
    // ---- register ----
    await page.goto('/signup');
    await page.getByLabel('Full name').fill('E2E Customer');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Confirm password').fill(PASSWORD);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E Customer');

    // ---- browse and open a car ----
    await page.goto('/cars');
    await page.getByTestId('car-card').first().getByRole('link').first().click();
    await expect(page).toHaveURL(/\/car\//);
    const carHeading = await page.getByRole('heading', { level: 1 }).textContent();

    // ---- favourite it ----
    await page.getByRole('button', { name: /^Favourite$/ }).click();
    await expect(page.getByRole('button', { name: 'Favourited' })).toBeVisible();

    await page.goto('/dashboard/favorites');
    await expect(page.getByRole('heading', { name: 'Favourite Cars' })).toBeVisible();
    await expect(page.locator('h3').first()).toBeVisible();

    // ---- recently viewed was recorded ----
    await page.goto('/dashboard/recent');
    await expect(page.locator('h3').first()).toBeVisible();

    // ---- order it ----
    await page.goto('/cars');
    await page.getByTestId('car-card').first().getByRole('link').first().click();
    await page.getByRole('link', { name: 'Request an appointment' }).click();

    await expect(page).toHaveURL(/\/order/);
    await page.getByLabel('Full name').fill('E2E Customer');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Phone number').fill('+213600000123');
    await page.getByRole('button', { name: 'Request an appointment' }).click();

    await expect(page.getByRole('heading', { name: 'Appointment requested' })).toBeVisible();
    const reference = await page.locator('dd.font-mono').textContent();
    expect(reference).toMatch(/^ORD-\d{4}-/);

    // ---- the order appears in the customer's own list ----
    await page.goto('/dashboard/orders');
    await expect(page.getByText(reference!.trim())).toBeVisible();
    expect(carHeading).toBeTruthy();
  });
});

test.describe('Administrator', () => {
  test('signs in, sees real analytics and manages orders', async ({ page }) => {
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    test.skip(!adminEmail || !adminPassword, 'Seed admin credentials are not configured');

    /*
     * The seeded account may no longer be an administrator. The owner can
     * promote their own account and demote this one — that is what
     * `npm run make:admin` is for — and when they do, signing in still works
     * while the administration is closed. Failing here would report a broken
     * site for a deliberate change to who runs it.
     */
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
    const login = await page.request.post(`${api}/auth/login`, {
      data: { email: adminEmail, password: adminPassword },
    });
    if (login.ok()) {
      const { accessToken } = await login.json();
      const allowed = await page.request.get(`${api}/analytics/overview`, {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      test.skip(
        !allowed.ok(),
        `${adminEmail} is no longer an administrator — point SEED_ADMIN_EMAIL at one that is`,
      );
    }

    await signIn(page, adminEmail!, adminPassword!);
    await expect(page).toHaveURL(/\/admin\/dashboard$/);

    // Figures are database aggregates, so they must be present and numeric.
    await expect(page.getByText('Total Cars')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();

    await page.goto('/admin/cars');
    await expect(page.locator('tbody tr')).not.toHaveCount(0);

    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { name: 'Manage Orders' })).toBeVisible();
    await expect(page.locator('tbody tr')).not.toHaveCount(0);

    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: 'Website Settings' })).toBeVisible();
  });

  test('a customer is redirected away from the admin panel', async ({ page }) => {
    const email = uniqueEmail();

    // Register through the API so the test stays focused on the guard.
    await page.request.post(`${API}/auth/register`, {
      data: {
        fullName: 'Guard Test',
        email,
        password: PASSWORD,
        confirmPassword: PASSWORD,
        acceptTerms: true,
      },
    });

    await signIn(page, email, PASSWORD);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
