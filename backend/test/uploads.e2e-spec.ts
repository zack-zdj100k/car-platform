import { createAdmin, createTestApp, registerCustomer, resetDatabase, type TestContext } from './harness';
import { readdir, unlink } from 'node:fs/promises';
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

  const uploadDirectory = resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads');
  const countUploads = async (): Promise<number> => (await readdir(uploadDirectory)).length;

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

  /*
   * The smallest thing a browser and this server will both call an MP4: an
   * ISOBMFF `ftyp` box with the `isom` brand. Enough to be recognised, which is
   * what the endpoint decides on.
   */
  const tinyMp4 = Buffer.concat([
    Buffer.from([0, 0, 0, 0x18]),
    Buffer.from('ftypisom', 'ascii'),
    Buffer.from([0, 0, 2, 0]),
    Buffer.from('isomiso2', 'ascii'),
  ]);

  it("stores a car's video", async () => {
    const response = await context
      .http()
      .post('/api/uploads/video')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', tinyMp4, { filename: 'clip.mp4', contentType: 'video/mp4' })
      .expect(201);

    written.push(response.body.filename);
    expect(response.body.url).toMatch(/^\/uploads\/[a-z0-9-]+\.mp4$/);
    expect(response.body.sizeBytes).toBe(tinyMp4.length);
  });

  it('refuses a file that is not a video, and does not keep it', async () => {
    /*
     * Videos are written to disk before they can be checked — they are too
     * large to hold in memory — so a rejected upload has to be deleted again.
     * A rejection that leaves the file behind is a way to put anything at all
     * on the server's disk.
     */
    const before = await countUploads();

    await context
      .http()
      .post('/api/uploads/video')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', tinyPng, { filename: 'not-a-video.mp4', contentType: 'video/mp4' })
      .expect(422);

    expect(await countUploads()).toBe(before);
  });

  it('will not let a customer upload a video', async () => {
    await context
      .http()
      .post('/api/uploads/video')
      .set('Authorization', `Bearer ${customerToken}`)
      .attach('file', tinyMp4, { filename: 'clip.mp4', contentType: 'video/mp4' })
      .expect(403);
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

/**
 * The upload endpoint must never hand ICNS, JXL or HEIF input to the image
 * parser: those parsers carry an unfixed advisory where malformed input spins
 * forever and hangs the process. The signature gate should reject them first.
 */
describe('Uploads — formats that must never reach the parser', () => {
  let context: TestContext;
  let adminToken: string;

  beforeAll(async () => {
    context = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    adminToken = (await createAdmin(context)).token;
  });

  afterAll(async () => {
    await context.app.close();
  });

  const cases: [string, Buffer][] = [
    // ICNS: "icns" followed by a length field.
    ['ICNS', Buffer.concat([Buffer.from('icns'), Buffer.alloc(64)])],
    // JXL codestream signature.
    ['JXL codestream', Buffer.concat([Buffer.from([0xff, 0x0a]), Buffer.alloc(64)])],
    // HEIF: same ISOBMFF container as AVIF, different brand.
    [
      'HEIF (heic brand)',
      Buffer.concat([Buffer.alloc(4), Buffer.from('ftypheic'), Buffer.alloc(64)]),
    ],
    [
      'HEIF (mif1 brand)',
      Buffer.concat([Buffer.alloc(4), Buffer.from('ftypmif1'), Buffer.alloc(64)]),
    ],
    // A TIFF is a real image, but not one we accept.
    ['TIFF', Buffer.concat([Buffer.from([0x49, 0x49, 0x2a, 0x00]), Buffer.alloc(64)])],
  ];

  it.each(cases)('rejects %s before parsing it', async (_label, payload) => {
    await context
      .http()
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', payload, { filename: 'payload.png', contentType: 'image/png' })
      .expect(422);
  });

  it('still accepts an AVIF-branded container', async () => {
    // A real AVIF is more than a header, so the parser rejects it as corrupt —
    // but the signature gate must let it through rather than refusing the brand.
    const response = await context
      .http()
      .post('/api/uploads/image')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.concat([Buffer.alloc(4), Buffer.from('ftypavif'), Buffer.alloc(64)]), {
        filename: 'photo.avif',
        contentType: 'image/avif',
      });

    // Rejected for being unreadable, not for its format.
    expect(response.status).toBe(422);
    expect(String(response.body.message)).toMatch(/could not be read|corrupt/i);
  });
});
