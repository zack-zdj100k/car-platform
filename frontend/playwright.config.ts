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

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
