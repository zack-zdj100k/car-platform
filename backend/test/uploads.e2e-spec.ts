import { createAdmin, createTestApp, registerCustomer, resetDatabase, type TestContext } from './harness';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Image upload (spec §47 Media).
 *
 * The security cases matter more than the happy path here: an upload endpoint
 * that accepts anything is a way to serve attacker content from our own origin.
 */
describe('Uploads', () => {
  let context: TestContext;
  let adminToken: string;
  let customerToken: string;
  const written: string[] = [];

  /** Smallest valid PNG: an 8-byte signature plus a 1×1 IHDR/IDAT/IEND. */
  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  beforeAll(async () => {
    context = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    adminToken = (await createAdmin(context)).token;
    customerToken = (await registerCustomer(context, 'customer@test.local')).token;
  });

  afterAll(async () => {
    // Remove anything this suite wrote to disk.
    const directory = resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads');
    await Promise.all(
      written.map((filename) => unlink(resolve(directory, filename)).catch(() => undefined)),
    );
    await context.app.close();
  });

  it('stores a real image and reports its dimensions', async () => {
    const response = await context
      .http()
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', tinyPng, { filename: 'car.png', contentType: 'image/png' })
      .expect(201);

    written.push(response.body.filename);

    expect(response.body).toMatchObject({ width: 1, height: 1, mimeType: 'image/png' });
    expect(response.body.url).toMatch(/^\/uploads\/[a-z0-9-]+\.png$/);
  });

  it('gives every upload a random name, so one cannot overwrite another', async () => {
    const first = await context
      .http()
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', tinyPng, { filename: 'same-name.png', contentType: 'image/png' })
      .expect(201);

    const second = await context
      .http()
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', tinyPng, { filename: 'same-name.png', contentType: 'image/png' })
      .expect(201);

    written.push(first.body.filename, second.body.filename);
    expect(first.body.filename).not.toBe(second.body.filename);
    // The uploaded name must not appear in the stored name at all.
    expect(first.body.filename).not.toContain('same-name');
  });

  it('rejects a file that only claims to be an image', async () => {
    await context
      .http()
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('this is plain text'), {
        filename: 'fake.png',
        contentType: 'image/png',
      })
      .expect(422);
  });

  it('rejects SVG, which can carry script', async () => {
    await context
      .http()
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'), {
        filename: 'evil.svg',
        contentType: 'image/svg+xml',
      })
      .expect(422);
  });

  it('refuses an anonymous upload', async () => {
    await context
      .http()
      .post('/api/uploads/image')
      .attach('file', tinyPng, { filename: 'car.png', contentType: 'image/png' })
      .expect(401);
  });

  it('refuses a customer upload', async () => {
    await context
      .http()
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${customerToken}`)
      .attach('file', tinyPng, { filename: 'car.png', contentType: 'image/png' })
      .expect(403);
  });

  it('refuses a filename that tries to escape the upload directory', async () => {
    await context
      .http()
      .delete(`/api/uploads/${encodeURIComponent('../../.env')}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('deletes a stored image', async () => {
    const uploaded = await context
      .http()
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', tinyPng, { filename: 'car.png', contentType: 'image/png' })
      .expect(201);

    await context
      .http()
      .delete(`/api/uploads/${uploaded.body.filename}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    // Deleting it a second time reports that it is gone.
    await context
      .http()
      .delete(`/api/uploads/${uploaded.body.filename}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
