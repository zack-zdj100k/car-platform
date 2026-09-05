import type { TestContext } from './harness';
import { createTestApp, registerCustomer, resetDatabase } from './harness';

/**
 * A customer's own photograph.
 *
 * The profile used to ask for a path — `/images/…` — which nobody outside this
 * repository could be expected to know, and which let an account point its
 * avatar at any address on the site. It is the file itself now, on a route of
 * the customer's own, separate from the administrator's media upload.
 */

/** A real 1×1 PNG: the store reads the bytes, so a fake one is refused. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('Profile picture', () => {
  let context: TestContext;
  let customer: { token: string; id: string };

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(async () => {
    await context.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    customer = await registerCustomer(context, 'avatar@test.local');
  });

  const mine = () => ({ Authorization: `Bearer ${customer.token}` });

  it('accepts a picture from the customer whose account it is', async () => {
    const response = await context
      .http()
      .post('/api/users/me/picture')
      .set(mine())
      .attach('file', PNG, 'me.png')
      .expect(201);

    expect(response.body.profileImage).toMatch(/^(\/uploads\/|https?:\/\/)/);

    const saved = await context.prisma.user.findUniqueOrThrow({ where: { id: customer.id } });
    expect(saved.profileImage).toBe(response.body.profileImage);
  });

  it('replaces the previous picture rather than accumulating them', async () => {
    const first = await context
      .http()
      .post('/api/users/me/picture')
      .set(mine())
      .attach('file', PNG, 'one.png')
      .expect(201);

    const second = await context
      .http()
      .post('/api/users/me/picture')
      .set(mine())
      .attach('file', PNG, 'two.png')
      .expect(201);

    expect(second.body.profileImage).not.toBe(first.body.profileImage);

    const saved = await context.prisma.user.findUniqueOrThrow({ where: { id: customer.id } });
    expect(saved.profileImage).toBe(second.body.profileImage);
  });

  it('takes the picture off the account when asked', async () => {
    await context.http().post('/api/users/me/picture').set(mine()).attach('file', PNG, 'me.png').expect(201);

    const cleared = await context.http().delete('/api/users/me/picture').set(mine()).expect(200);
    expect(cleared.body.profileImage).toBeNull();
  });

  it('refuses a file that is not an image, whatever it is called', async () => {
    // Named .png, and not one. The store reads the bytes, not the name.
    await context
      .http()
      .post('/api/users/me/picture')
      .set(mine())
      .attach('file', Buffer.from('#!/bin/sh\necho not a picture\n'), 'me.png')
      .expect(422);
  });

  it('is refused without a session', async () => {
    await context.http().post('/api/users/me/picture').attach('file', PNG, 'me.png').expect(401);
  });

  it('does not let a customer near the administrator’s media upload', async () => {
    // The car catalogue's pictures are a different thing from an avatar, and
    // this route is what keeps them apart.
    await context
      .http()
      .post('/api/uploads/image')
      .set(mine())
      .attach('file', PNG, 'car.png')
      .expect(403);
  });
});
