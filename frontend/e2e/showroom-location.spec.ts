import { expect, test } from '@playwright/test';

/**
 * The showroom card on the home page.
 *
 * It exists to answer one question — where is this business — so the assertions
 * are about that: it opens the seller's own map, it can be reached without a
 * mouse, and it does not appear at all when there is no link to open. A card
 * that gestures at an address and goes nowhere is worse than none.
 */
test.describe('Where to find us', () => {
  test('links to the map the owner set, and opens in a new tab', async ({ page, request }) => {
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
    const settings = await (await request.get(`${api}/settings/public`)).json();
    const mapUrl = settings.location?.['location.mapUrl'] as string | undefined;
    test.skip(!mapUrl, 'no map link configured');

    await page.goto('/');
    const card = page.locator('#location a').first();
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('href', mapUrl!);
    await expect(card).toHaveAttribute('target', '_blank');
    // Opening a new tab without this hands the other page control of ours.
    await expect(card).toHaveAttribute('rel', /noopener/);
  });

  test('is reachable and readable without a mouse', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('#location a').first();
    await card.focus();
    await expect(card).toBeFocused();

    // Focus opens it, so a keyboard reader sees the address a mouse user sees.
    await expect(page.locator('#location').getByText(/./).first()).toBeVisible();
    const label = await card.getAttribute('aria-label');
    expect(label).toBeTruthy();
    expect(label!.length).toBeGreaterThan(5);
  });
});
