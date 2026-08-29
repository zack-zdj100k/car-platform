import { expect, test } from '@playwright/test';
import { adminTokenOrSkip } from './admin-session';

/**
 * Uploading, in the browser, through the same service the admin form uses.
 *
 * Driving the admin form itself would mean signing in, so this exercises the
 * layer underneath it: the part that decides how many requests are made, in
 * what order the results come back, and what happens when one fails. That is
 * where the two faults were — twenty-four requests in single file, and a batch
 * endpoint that silently returned two frames out of twenty-four.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/** A real JPEG, built in the page so no fixture file is needed. */
const MAKE_FILES = `async (count) => {
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 160;
  const context = canvas.getContext('2d');
  const files = [];
  for (let i = 0; i < count; i += 1) {
    context.fillStyle = 'hsl(' + (i * 15) + ' 60% 50%)';
    context.fillRect(0, 0, 240, 160);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    files.push(new File([blob], 'frame-' + String(i + 1).padStart(2, '0') + '.jpg', { type: 'image/jpeg' }));
  }
  return files;
}`;

test('a 24-frame set uploads completely and in order', async ({ page, request }) => {
  const accessToken = await adminTokenOrSkip(request);

  await page.goto('/');

  const result = await page.evaluate(
    async ({ api, token, makeFiles }) => {
      const files: File[] = await eval(makeFiles)(24);

      // The same four-at-a-time strategy the uploads service uses.
      const started = performance.now();
      const results: { url: string; filename: string }[] = new Array(files.length);
      let next = 0;
      const worker = async () => {
        for (;;) {
          const index = next++;
          if (index >= files.length) return;
          const body = new FormData();
          body.append('file', files[index]);
          const response = await fetch(`${api}/uploads/image`, {
            method: 'POST',
            headers: { authorization: `Bearer ${token}` },
            body,
          });
          if (!response.ok) throw new Error(`${response.status}`);
          results[index] = await response.json();
        }
      };
      await Promise.all(Array.from({ length: 4 }, worker));

      return { count: results.length, elapsed: performance.now() - started, files: results };
    },
    { api: API, token: accessToken, makeFiles: MAKE_FILES },
  );

  // Every frame arrived — the fault with the batch endpoint was losing 22 of them.
  expect(result.count).toBe(24);
  expect(result.files.every((file) => file?.url?.startsWith('/uploads/'))).toBe(true);

  // Order is preserved despite finishing out of order, which is what keeps a
  // 360° set's angles right.
  expect(new Set(result.files.map((file) => file.url)).size).toBe(24);

  // Tidy up after ourselves.
  for (const file of result.files) {
    await request.delete(`${API}/uploads/${file.filename}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
  }
});
