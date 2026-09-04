import { expect, test } from '@playwright/test';

/**
 * The address, and when the customer is allowed to have it.
 *
 * A confirmed appointment is the only one worth an address: before that there
 * is nothing to come to, and somebody who reads a street name on a request
 * nobody has answered turns up to a closed door. This walks the whole way —
 * book, look and be told to wait, then confirm and be given the place.
 */

test('a confirmed appointment shows where to come', async ({ page, request }) => {
  test.setTimeout(180_000);
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
  const password = 'TestPass123';
  const email = `meet-${Date.now()}@example.com`;

  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Meeting Tester');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/cars');
  await page.getByTestId('car-card').filter({ hasNot: page.getByText(/not available/i) }).first().getByRole('link').first().click();
  await page.getByRole('link', { name: 'Request an appointment' }).click();
  await page.getByLabel('Full name').fill('Meeting Tester');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Phone number').fill('0774840492');
  await page.getByRole('button', { name: 'Request an appointment' }).click();
  await expect(page.getByRole('heading', { name: 'Appointment requested' })).toBeVisible();

  // Before confirmation the customer is told to wait, not given an address.
  await page.goto('/dashboard/orders');
  await page.locator('li').filter({ hasText: /ORD-/ }).first().getByRole('link').first().click();
  await expect(page.getByText(/once the appointment is confirmed/i)).toBeVisible();
  console.log('PENDING page ok');

  // The administration confirms it and records where to come.
  test.skip(
    !process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD,
    'no administrator credentials configured, so nothing can confirm the appointment',
  );

  const login = await request.post(`${api}/auth/login`, {
    data: { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD },
  });
  const { accessToken } = await login.json();
  const listed = await request.get(`${api}/orders/admin/all?search=${encodeURIComponent(email)}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const order = (await listed.json()).data[0];
  await request.patch(`${api}/orders/${order.id}/status`, {
    headers: { authorization: `Bearer ${accessToken}` },
    data: { status: 'CONFIRMED' },
  });
  await request.patch(`${api}/orders/${order.id}/meeting`, {
    headers: { authorization: `Bearer ${accessToken}` },
    data: {
      meetingAddress: 'Cité 1000 Logements, El Khroub, Constantine',
      meetingMapUrl: 'https://maps.google.com/?q=36.2639,6.6903',
      meetingNote: 'Saturday morning — ask for Karim',
    },
  });

  await page.reload();
  await expect(page.getByText(/Where to meet us/i)).toBeVisible();
  await expect(page.getByText(/El Khroub/i)).toBeVisible();
  await expect(page.getByText(/ask for Karim/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /see the car/i })).toBeVisible();
  console.log('CONFIRMED page ok');
});
