import { expect, test, type Page } from '@playwright/test';

/**
 * Booking an appointment, and undoing it.
 *
 * The site sells nothing on the web: every vehicle ends in a conversation, so
 * what a customer submits is a request to meet rather than an order. These
 * check the two ends of that — the request being made, and the customer being
 * able to withdraw it themselves, which is the part that decides whether the
 * appointment list can be trusted.
 */

const password = 'TestPass123';

async function registerAndBook(page: Page): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;

  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Appointment Tester');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/cars');
  await page.getByTestId('car-card').first().getByRole('link').first().click();
  await expect(page).toHaveURL(/\/car\//);

  await page.getByRole('link', { name: 'Request an appointment' }).click();
  await expect(page).toHaveURL(/\/order/);
  await page.getByLabel('Full name').fill('Appointment Tester');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Phone number').fill('0774840492');
  await page.getByRole('button', { name: 'Request an appointment' }).click();

  await expect(page.getByRole('heading', { name: 'Appointment requested' })).toBeVisible({
    timeout: 20_000,
  });
  return email;
}

test('a customer books an appointment and can withdraw it', async ({ page }) => {
  test.setTimeout(120_000);
  await registerAndBook(page);

  await page.goto('/dashboard/orders');
  const row = page.locator('li').filter({ hasText: /ORD-/ }).first();
  await expect(row).toBeVisible();

  // The status reads as a sentence, not as a database enum.
  await expect(row).toContainText(/awaiting our reply/i);

  page.once('dialog', (dialog) => void dialog.accept());
  await row.getByRole('button', { name: /cancel this appointment/i }).click();

  await expect(row).toContainText(/cancelled/i, { timeout: 20_000 });
  // Cancelled, not deleted: it is part of what happened.
  await expect(row).toBeVisible();
  // And there is nothing left to cancel.
  await expect(row.getByRole('button', { name: /cancel this appointment/i })).toHaveCount(0);
});

test('the confirmation offers WhatsApp when a number is configured', async ({ page, request }) => {
  test.setTimeout(120_000);

  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
  const settings = await (await request.get(`${api}/settings/public`)).json();
  const phone = settings?.general?.['site.contactPhone'];
  test.skip(!phone, 'no contact number is configured, so there is no button to show');

  await registerAndBook(page);
  const whatsapp = page.getByRole('link', { name: /whatsapp/i });
  await expect(whatsapp).toBeVisible();

  // wa.me wants a number in international form; a local 0 would open nothing.
  const href = await whatsapp.getAttribute('href');
  expect(href).toMatch(/^https:\/\/wa\.me\/\d{8,}\?text=/);
});

test.describe('Stock', () => {
  test('a sold-out colour cannot be booked, and says so', async ({ page, request }) => {
    test.setTimeout(120_000);

    // Find a vehicle the API reports as unbookable in at least one colour,
    // rather than assuming the demo catalogue is arranged a particular way.
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
    const list = await (await request.get(`${api}/cars?pageSize=50`)).json();
    const cars = list.data as { slug: string; colors: { name: string; isAvailable?: boolean }[] }[];
    const target = cars.find((car) => car.colors.some((colour) => colour.isAvailable === false));
    test.skip(!target, 'no colour is sold out in this catalogue');

    const soldOut = target!.colors.find((colour) => colour.isAvailable === false)!;
    const spare = target!.colors.find((colour) => colour.isAvailable !== false);

    await page.goto(`/car/${target!.slug}`);
    await page.waitForLoadState('load');

    await page.getByRole('button', { name: new RegExp(soldOut.name, 'i') }).first().click();
    await page.waitForTimeout(400);

    const status = page.locator('[role="status"]').filter({ hasText: /available/i }).first();
    await expect(status).toContainText(/not available/i);
    // The button stays where it is, and does nothing: a control that vanishes
    // reads as a fault.
    await expect(page.getByRole('button', { name: /request an appointment/i })).toBeDisabled();

    // The count itself is never published.
    const detail = await (await request.get(`${api}/cars/${target!.slug}`)).text();
    expect(detail).not.toContain('"stock"');

    if (spare) {
      await page.getByRole('button', { name: new RegExp(spare.name, 'i') }).first().click();
      await page.waitForTimeout(400);
      await expect(status).toContainText(/^available$/i);
      await expect(page.getByRole('link', { name: /request an appointment/i })).toBeVisible();
    }
  });
});
