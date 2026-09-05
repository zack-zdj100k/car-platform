import { expect, test, type Page } from '@playwright/test';

/**
 * Asking twice for the same appointment.
 *
 * A customer who books, hears nothing for a day and books again has asked for
 * one meeting twice — and the showroom then rings them twice about one car. The
 * vehicle's page says so before they fill anything in: where the booking button
 * was, there is a line telling them somebody will be in touch, and pointing at
 * what they can still do.
 */

const password = 'TestPass123';

async function signUp(page: Page): Promise<string> {
  const email = `once-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;

  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Repeat Visitor');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return email;
}

test('the booking button becomes “we will contact you soon” once it is asked for', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const email = await signUp(page);

  // A vehicle that can be booked; a sold-out one has no button to press.
  await page.goto('/cars');
  const bookable = page
    .getByTestId('car-card')
    .filter({ hasNot: page.getByText(/not available/i) })
    .first();
  await bookable.getByRole('link').first().click();
  await expect(page).toHaveURL(/\/car\//);
  const carUrl = page.url();

  await page.getByRole('link', { name: 'Request an appointment' }).click();
  await page.getByLabel('Full name').fill('Repeat Visitor');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Phone number').fill('0774840492');
  await page.getByRole('button', { name: 'Request an appointment' }).click();
  await expect(page.getByRole('heading', { name: 'Appointment requested' })).toBeVisible({
    timeout: 20_000,
  });

  // Back to the same car, in the same colour it opened on.
  await page.goto(carUrl);
  await expect(page.getByText(/we will contact you soon/i)).toBeVisible({ timeout: 20_000 });
  // Not a greyed-out button: a disabled "Request an appointment" would read as
  // "this car cannot be booked", which is the opposite of what happened.
  await expect(page.getByRole('link', { name: /request an appointment/i })).toHaveCount(0);

  // And the sentence beneath says what they can still do.
  await expect(page.getByText(/choose another colour/i)).toBeVisible();
});

test('the form refuses a repeat reached by its own address', async ({ page }) => {
  test.setTimeout(120_000);
  const email = await signUp(page);

  await page.goto('/cars');
  const bookable = page
    .getByTestId('car-card')
    .filter({ hasNot: page.getByText(/not available/i) })
    .first();
  await bookable.getByRole('link').first().click();
  await expect(page).toHaveURL(/\/car\//);

  /*
   * The form's own address, taken from the link rather than assembled: it
   * carries the chosen colour as a query, and that is the whole point of what
   * is being checked.
   */
  const bookingLink = page.getByRole('link', { name: 'Request an appointment' });
  const orderUrl = await bookingLink.getAttribute('href');
  expect(orderUrl).toBeTruthy();

  const fill = async () => {
    await page.getByLabel('Full name').fill('Repeat Visitor');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Phone number').fill('0774840492');
    await page.getByRole('button', { name: 'Request an appointment' }).click();
  };

  await bookingLink.click();
  await fill();
  await expect(page.getByRole('heading', { name: 'Appointment requested' })).toBeVisible({
    timeout: 20_000,
  });

  // Straight back to the form, which the vehicle's page no longer links to.
  await page.goto(orderUrl!);
  await fill();
  await expect(page.getByText(/we will contact you soon/i)).toBeVisible({ timeout: 20_000 });
});
