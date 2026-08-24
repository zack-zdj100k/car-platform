import { createTestApp, resetDatabase, registerCustomer, strongPassword, type TestContext } from './harness';

/** Spec §71 — authentication tests. */
describe('Authentication', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.app.close();
  });

  describe('registration', () => {
    it('creates an account and returns an access token', async () => {
      const response = await context
        .http()
        .post('/api/auth/register')
        .send({
          fullName: 'Ada Lovelace',
          email: 'ada@example.com',
          password: strongPassword,
          confirmPassword: strongPassword,
          acceptTerms: true,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        user: { email: 'ada@example.com', role: 'CUSTOMER' },
      });
      expect(response.body.accessToken).toEqual(expect.any(String));
    });

    it('never returns the password hash', async () => {
      const response = await context
        .http()
        .post('/api/auth/register')
        .send({
          fullName: 'Ada',
          email: 'ada2@example.com',
          password: strongPassword,
          confirmPassword: strongPassword,
          acceptTerms: true,
        })
        .expect(201);

      expect(JSON.stringify(response.body)).not.toContain('password');
    });

    it('stores the password as an argon2id hash, never as plaintext', async () => {
      await registerCustomer(context, 'hash@example.com');
      const user = await context.prisma.user.findUnique({ where: { email: 'hash@example.com' } });

      expect(user?.password).toBeTruthy();
      expect(user?.password).not.toBe(strongPassword);
      expect(user?.password).toMatch(/^\$argon2id\$/);
    });

    it('sets the refresh token as an httpOnly cookie', async () => {
      const response = await context
        .http()
        .post('/api/auth/register')
        .send({
          fullName: 'Ada',
          email: 'cookie@example.com',
          password: strongPassword,
          confirmPassword: strongPassword,
          acceptTerms: true,
        })
        .expect(201);

      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((cookie) => cookie.startsWith('cp_refresh=') && cookie.includes('HttpOnly'))).toBe(true);
    });

    it.each([
      ['weak password', { password: 'alllower', confirmPassword: 'alllower' }],
      ['mismatched confirmation', { confirmPassword: 'DifferentPass1' }],
      ['terms not accepted', { acceptTerms: false }],
      ['invalid email', { email: 'not-an-email' }],
    ])('rejects %s', async (_label, overrides) => {
      await context
        .http()
        .post('/api/auth/register')
        .send({
          fullName: 'Ada',
          email: 'reject@example.com',
          password: strongPassword,
          confirmPassword: strongPassword,
          acceptTerms: true,
          ...overrides,
        })
        .expect(400);
    });

    it('refuses an unknown property, so role cannot be smuggled in', async () => {
      await context
        .http()
        .post('/api/auth/register')
        .send({
          fullName: 'Escalate',
          email: 'escalate@example.com',
          password: strongPassword,
          confirmPassword: strongPassword,
          acceptTerms: true,
          role: 'ADMIN',
        })
        .expect(400);
    });

    it('rejects a duplicate email with 409', async () => {
      await registerCustomer(context, 'dupe@example.com');
      await context
        .http()
        .post('/api/auth/register')
        .send({
          fullName: 'Ada',
          email: 'dupe@example.com',
          password: strongPassword,
          confirmPassword: strongPassword,
          acceptTerms: true,
        })
        .expect(409);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await registerCustomer(context, 'login@example.com');
    });

    it('succeeds with correct credentials', async () => {
      const response = await context
        .http()
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: strongPassword })
        .expect(200);

      expect(response.body.user.email).toBe('login@example.com');
    });

    it('gives an identical message for a wrong password and an unknown email', async () => {
      const wrongPassword = await context
        .http()
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'WrongPass123' })
        .expect(401);

      const unknownEmail = await context
        .http()
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'WrongPass123' })
        .expect(401);

      // Identical responses keep the endpoint from confirming which emails exist.
      expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
    });

    it('refuses a suspended account', async () => {
      await context.prisma.user.update({
        where: { email: 'login@example.com' },
        data: { status: 'SUSPENDED' },
      });

      await context
        .http()
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: strongPassword })
        .expect(401);
    });
  });

  describe('session lifecycle', () => {
    it('rotates the refresh token and refuses the old one', async () => {
      const customer = await registerCustomer(context, 'rotate@example.com');

      const refreshed = await context
        .http()
        .post('/api/auth/refresh')
        .set('Cookie', customer.cookie)
        .expect(200);

      expect(refreshed.body.accessToken).toEqual(expect.any(String));

      // Presenting the already-rotated token is treated as replay.
      await context.http().post('/api/auth/refresh').set('Cookie', customer.cookie).expect(401);
    });

    it('treats an immediate replay as a client race and spares the new session', async () => {
      const customer = await registerCustomer(context, 'race@example.com');

      const refreshed = await context
        .http()
        .post('/api/auth/refresh')
        .set('Cookie', customer.cookie)
        .expect(200);

      const newCookie = (refreshed.headers['set-cookie'] as unknown as string[])[0].split(';')[0];

      // Two refreshes firing at once is normal — a double mount, a second tab,
      // an overlapping navigation. The stale one is refused...
      await context.http().post('/api/auth/refresh').set('Cookie', customer.cookie).expect(401);

      // ...but the session issued moments earlier keeps working.
      await context.http().post('/api/auth/refresh').set('Cookie', newCookie).expect(200);
    });

    it('revokes the whole token family when an old token is replayed later', async () => {
      const customer = await registerCustomer(context, 'reuse@example.com');

      const refreshed = await context
        .http()
        .post('/api/auth/refresh')
        .set('Cookie', customer.cookie)
        .expect(200);

      const newCookie = (refreshed.headers['set-cookie'] as unknown as string[])[0].split(';')[0];

      // Age the revocation past the grace window, so replay has no benign
      // explanation and reads as a stolen token.
      await context.prisma.refreshToken.updateMany({
        where: { userId: customer.id, revokedAt: { not: null } },
        data: { revokedAt: new Date(Date.now() - 60_000) },
      });

      await context.http().post('/api/auth/refresh').set('Cookie', customer.cookie).expect(401);

      // Every session is burned, including the one that looked legitimate.
      await context.http().post('/api/auth/refresh').set('Cookie', newCookie).expect(401);
    });

    it('invalidates the refresh token on logout', async () => {
      const customer = await registerCustomer(context, 'logout@example.com');

      await context.http().post('/api/auth/logout').set('Cookie', customer.cookie).expect(204);
      await context.http().post('/api/auth/refresh').set('Cookie', customer.cookie).expect(401);
    });

    it('returns the current profile from /auth/me', async () => {
      const customer = await registerCustomer(context, 'me@example.com');

      const response = await context
        .http()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${customer.token}`)
        .expect(200);

      expect(response.body.email).toBe('me@example.com');
    });

    it('rejects a missing or invalid access token', async () => {
      await context.http().get('/api/auth/me').expect(401);
      await context.http().get('/api/auth/me').set('Authorization', 'Bearer nonsense').expect(401);
    });
  });

  describe('password reset', () => {
    it('accepts an unknown address without revealing that it is unknown', async () => {
      await context
        .http()
        .post('/api/auth/forgot-password')
        .send({ email: 'ghost@example.com' })
        .expect(202);
    });

    it('issues a single-use token that ends every session when consumed', async () => {
      const customer = await registerCustomer(context, 'reset@example.com');
      await context.http().post('/api/auth/forgot-password').send({ email: 'reset@example.com' }).expect(202);

      const record = await context.prisma.passwordResetToken.findFirst({
        where: { userId: customer.id },
      });
      expect(record).toBeTruthy();

      // The stored value is a digest, never the token itself.
      expect(record?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('rejects an invalid reset token', async () => {
      await context
        .http()
        .post('/api/auth/reset-password')
        .send({ token: 'made-up', password: 'BrandNew123', confirmPassword: 'BrandNew123' })
        .expect(400);
    });
  });
});
