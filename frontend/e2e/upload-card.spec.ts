import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, adminTokenOrSkip } from './admin-session';

/**
 * The card that reports an upload.
 *
 * Driven through the real admin form, because the point of the card is what an
 * administrator sees while waiting — and waiting is the part that cannot be
 * checked by reading the code.
 */
test('uploading a 360° set shows progress, then success', async ({ page, request }) => {
  await adminTokenOrSkip(request);

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL!);
  await page.getByLabel(/password|mot de passe/i).fill(ADMIN_PASSWORD!);
  await page.getByRole('button', { name: /sign in|se connecter/i }).click();
  await page.waitForURL(/dashboard/);

  await page.goto('/admin/cars');
  /*
   * The edit link, not the first link in the row — that one opens the car's
   * public page, which is not where the uploader lives.
   */
  await page.locator('tbody tr a[href$="/edit"]').first().click();
  await page.waitForURL(/\/admin\/cars\/.+\/edit/);

  /*
   * Open the section holding the 360° slots; its contents are not rendered at
   * all while the accordion is closed.
   *
   * Clicked unconditionally. Asking `count()` first returned zero — the page
   * was still hydrating — so the click was skipped and the test then waited for
   * an input that was never going to exist. Playwright's own click waits for
   * the element; the guard was the thing that could not.
   */
  await page.getByRole('button', { name: 'Photos & colours' }).click();
  await expect(page.getByTestId('spin-bulk-input')).toBeAttached({ timeout: 10_000 });

  // Twelve small JPEGs, built here so no fixture files are needed.
  const files = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    const context = canvas.getContext('2d')!;
    const out: { name: string; mimeType: string; buffer: number[] }[] = [];
    for (let i = 0; i < 12; i += 1) {
      context.fillStyle = `hsl(${i * 25} 60% 50%)`;
      context.fillRect(0, 0, 160, 120);
      const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.7));
      out.push({
        name: `frame-${String(i + 1).padStart(2, '0')}.jpg`,
        mimeType: 'image/jpeg',
        buffer: [...new Uint8Array(await blob.arrayBuffer())],
      });
    }
    return out;
  });

  await page
    .getByTestId('spin-bulk-input')
    .setInputFiles(files.map((f) => ({ name: f.name, mimeType: f.mimeType, buffer: Buffer.from(f.buffer) })));

  // The card appears and says what is happening, with a real progress bar.
  const card = page.getByRole('status').filter({ hasText: /360|uploading/i }).first();
  await expect(card.or(page.getByRole('progressbar')).first()).toBeVisible({ timeout: 15_000 });

  // And it ends by saying the set arrived.
  await expect(page.getByText(/the set is uploaded/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/12 frames/i)).toBeVisible();
});
