import { test, type APIRequestContext } from '@playwright/test';

/**
 * An administrator's token, or a skip explaining why there is none.
 *
 * The site ships with one administrator, and the owner is expected to promote
 * their own account and demote that one — `npm run make:admin` exists for
 * exactly that. When they do, the seeded credentials still sign in perfectly
 * while every administration page turns them away.
 *
 * Tests that need administrator rights therefore cannot check that the account
 * exists; they have to check what it may do. Failing instead would report a
 * broken site for a deliberate change to who runs it.
 */
export const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
export const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

export async function adminTokenOrSkip(request: APIRequestContext): Promise<string> {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Seed admin credentials are not configured');

  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
  const login = await request.post(`${api}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  test.skip(!login.ok(), `${ADMIN_EMAIL} could not sign in`);

  const { accessToken } = await login.json();

  // Signing in is not the question; being allowed to administer is.
  const allowed = await request.get(`${api}/analytics/overview`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  test.skip(
    !allowed.ok(),
    `${ADMIN_EMAIL} is no longer an administrator — point SEED_ADMIN_EMAIL at one that is`,
  );

  return accessToken as string;
}
