import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests (spec §71).
 *
 * These run against the real frontend and the real API — no mocking — so a
 * passing run means the whole chain works: browser → REST → NestJS → Prisma →
 * PostgreSQL. Both servers must already be running (`npm run dev`).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  /*
   * Tests run against a production build, not the dev server.
   *
   * In development Next compiles each route on first request, so a page can be
   * measured mid-paint — which produced flaky contrast and animation results.
   * A built server also matches what users actually receive.
   *
   * Set E2E_BASE_URL to point at an already-running server instead.
   */
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm run start -- --port 3100',
        url: 'http://localhost:3100',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
