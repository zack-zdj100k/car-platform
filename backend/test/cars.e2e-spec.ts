import { createAdmin, createTestApp, registerCustomer, resetDatabase, seedCar, type TestContext } from './harness';

/** A real browser's user agent — these tests must not look like robots. */
const BROWSER =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

/** Spec §71 — cars CRUD, search, filtering and the §55 deletion guarantee. */
describe('Cars', () => {
  let context: TestContext;
  let adminToken: string;
  let customerToken: string;

  beforeAll(async () => {
    context = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    adminToken = (await createAdmin(context)).token;
    customerToken = (await registerCustomer(context, 'customer@test.local')).token;
  });

  afterAll(async () => {
    await context.app.close();
  });

  describe('public listing', () => {
    it('returns only published, non-deleted vehicles', async () => {
      const published = await seedCar(context, { model: 'Published' });
      await context.prisma.car.update({ where: { id: published.id }, data: { status: 'PUBLISHED' } });

      const draft = await seedCar(context, { model: 'Draft' });
      await context.prisma.car.update({ where: { id: draft.id }, data: { status: 'DRAFT' } });

      const archived = await seedCar(context, { model: 'Archived' });
      await context.prisma.car.update({
        where: { id: archived.id },
        data: { status: 'ARCHIVED', deletedAt: new Date() },
      });

      const response = await context.http().get('/api/cars').expect(200);

      expect(response.body.meta.total).toBe(1);
      expect(response.body.data[0].model).toBe('Published');
    });

    it('paginates', async () => {
      for (let index = 0; index < 5; index += 1) {
        await seedCar(context, { model: `Model${index}` });
      }

      const response = await context.http().get('/api/cars?page=1&pageSize=2').expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toMatchObject({ total: 5, totalPages: 3, hasNextPage: true });
    });

    it('filters by brand', async () => {
      await seedCar(context, { brandName: 'Alpha', model: 'One' });
      await seedCar(context, { brandName: 'Beta', model: 'Two' });

      const response = await context.http().get('/api/cars?brand=alpha').expect(200);

      expect(response.body.meta.total).toBe(1);
      expect(response.body.data[0].brand.slug).toBe('alpha');
    });

    it('filters by price range', async () => {
      await seedCar(context, { model: 'Cheap', price: '10000.00' });
      await seedCar(context, { model: 'Expensive', price: '90000.00' });

      const response = await context.http().get('/api/cars?priceMin=50000').expect(200);

      expect(response.body.meta.total).toBe(1);
      expect(response.body.data[0].model).toBe('Expensive');
    });

    it('rejects an inverted price range', async () => {
      await context.http().get('/api/cars?priceMin=90000&priceMax=1000').expect(400);
    });

    it('searches by model and by brand name', async () => {
      await seedCar(context, { brandName: 'Chery', model: 'Tiggo' });
      await seedCar(context, { brandName: 'Geely', model: 'Coolray' });

      const byModel = await context.http().get('/api/cars?search=tiggo').expect(200);
      expect(byModel.body.meta.total).toBe(1);

      const byBrand = await context.http().get('/api/cars?search=geely').expect(200);
      expect(byBrand.body.meta.total).toBe(1);
    });

    it('sorts by price ascending', async () => {
      await seedCar(context, { model: 'Mid', price: '50000.00' });
      await seedCar(context, { model: 'Low', price: '10000.00' });
      await seedCar(context, { model: 'High', price: '90000.00' });

      const response = await context.http().get('/api/cars?sort=price-asc').expect(200);
      const prices = response.body.data.map((car: { price: string }) => Number(car.price));

      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    it('rejects an unknown enum value', async () => {
      await context.http().get('/api/cars?bodyType=SPACESHIP').expect(400);
    });

    it('rejects an oversized page size', async () => {
      await context.http().get('/api/cars?pageSize=5000').expect(400);
    });

    it('exposes filter facets derived from the published catalogue', async () => {
      await seedCar(context, { brandName: 'Alpha', model: 'One' });

      const response = await context.http().get('/api/cars/facets').expect(200);

      expect(response.body.brands).toHaveLength(1);
      expect(response.body.bodyTypes[0]).toMatchObject({ value: 'SUV', count: 1 });
    });
  });

  describe('detail', () => {
    it('resolves by id and by slug', async () => {
      const car = await seedCar(context);

      const bySlug = await context.http().get(`/api/cars/${car.slug}`).expect(200);
      const byId = await context.http().get(`/api/cars/${car.id}`).expect(200);

      expect(bySlug.body.id).toBe(car.id);
      expect(byId.body.slug).toBe(car.slug);
    });

    it('returns a structured 404 for an unknown vehicle', async () => {
      const response = await context.http().get('/api/cars/does-not-exist').expect(404);

      expect(response.body).toMatchObject({ statusCode: 404, error: 'NOT_FOUND' });
      expect(response.body.message).toEqual(expect.any(String));
    });

    it('records a view, which feeds the analytics', async () => {
      const car = await seedCar(context);
      await context.http().post(`/api/cars/${car.slug}/view`).expect(204);

      const views = await context.prisma.carView.count({ where: { carId: car.id } });
      expect(views).toBe(1);
    });

    it('counts one person refreshing as one view', async () => {
      const car = await seedCar(context);
      const visitor = { 'x-visitor-id': 'visitor-refreshing', 'user-agent': BROWSER };

      for (let attempt = 0; attempt < 5; attempt += 1) {
        await context.http().post(`/api/cars/${car.slug}/view`).set(visitor).expect(204);
      }

      // Five requests, one visit. This is the measured behaviour that used to
      // report seven views for seven presses of the reload key.
      const views = await context.prisma.carView.count({ where: { carId: car.id } });
      expect(views).toBe(1);
    });

    it('counts two different visitors separately', async () => {
      const car = await seedCar(context);

      await context
        .http()
        .post(`/api/cars/${car.slug}/view`)
        .set({ 'x-visitor-id': 'visitor-one', 'user-agent': BROWSER })
        .expect(204);
      await context
        .http()
        .post(`/api/cars/${car.slug}/view`)
        .set({ 'x-visitor-id': 'visitor-two', 'user-agent': BROWSER })
        .expect(204);

      const views = await context.prisma.carView.count({ where: { carId: car.id } });
      expect(views).toBe(2);
    });

    it('does not count a robot as a visitor', async () => {
      const car = await seedCar(context);

      await context
        .http()
        .post(`/api/cars/${car.slug}/view`)
        .set({ 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' })
        .expect(204);

      const views = await context.prisma.carView.count({ where: { carId: car.id } });
      expect(views).toBe(0);
    });

    it('does not count the administrator browsing their own catalogue', async () => {
      const car = await seedCar(context);

      await context
        .http()
        .post(`/api/cars/${car.slug}/view`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set({ 'user-agent': BROWSER })
        .expect(204);

      const views = await context.prisma.carView.count({ where: { carId: car.id } });
      expect(views).toBe(0);
    });

    it('stores an identity, so visitors can be counted as people', async () => {
      const car = await seedCar(context);
      await context
        .http()
        .post(`/api/cars/${car.slug}/view`)
        .set({ 'x-visitor-id': 'visitor-identified', 'user-agent': BROWSER })
        .expect(204);

      const view = await context.prisma.carView.findFirstOrThrow({ where: { carId: car.id } });
      expect(view.anonymousId).toBe('visitor-identified');
    });

    it('falls back to a hashed address when the visitor has no cookie', async () => {
      const car = await seedCar(context);
      await context
        .http()
        .post(`/api/cars/${car.slug}/view`)
        .set({ 'user-agent': BROWSER })
        .set('X-Forwarded-For', '196.20.30.40')
        .expect(204);

      const view = await context.prisma.carView.findFirstOrThrow({ where: { carId: car.id } });
      expect(view.anonymousId).toMatch(/^[0-9a-f]{32}$/);
      // The address itself is never stored, only an irreversible hash of it.
      expect(view.anonymousId).not.toContain('196.20.30.40');
    });

    it('records view history for a signed-in customer', async () => {
      const car = await seedCar(context);
      await context
        .http()
        .post(`/api/cars/${car.slug}/view`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(204);

      const history = await context.prisma.recentlyViewed.count({ where: { carId: car.id } });
      expect(history).toBe(1);
    });
  });

  describe('admin management', () => {
    it('creates a vehicle with nested specification groups', async () => {
      const existing = await seedCar(context);

      const response = await context
        .http()
        .post('/api/cars')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          brandId: existing.brandId,
          model: 'New Model',
          year: 2025,
          bodyType: 'SEDAN',
          price: 31999.99,
          engine: { fuelType: 'ELECTRIC', powerHp: 200 },
          technology: { touchscreen: true, driveModes: ['Eco', 'Sport'] },
          safety: { abs: true, airbagCount: 6 },
          colors: [{ name: 'White', hexCode: '#FFFFFF' }],
        })
        .expect(201);

      expect(response.body).toMatchObject({
        model: 'New Model',
        status: 'DRAFT',
        engine: { fuelType: 'ELECTRIC', powerHp: 200 },
      });
      expect(response.body.technology.driveModes).toEqual(['Eco', 'Sport']);
      expect(response.body.slug).toContain('new-model');
    });

    it('stores a 360° set as ordered frames, and keeps them out of the photographs', async () => {
      const car = await seedCar(context);

      const frames = Array.from({ length: 24 }, (_, index) => ({
        kind: 'SPIN',
        url: `/uploads/spin-${String(index + 1).padStart(2, '0')}.webp`,
        sortOrder: index + 4, // after the photographs, as the admin form sends them
      }));

      await context
        .http()
        .patch(`/api/cars/${car.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          images: [
            { kind: 'MAIN', url: '/uploads/main.webp', alt: 'front three-quarter', sortOrder: 0 },
            { kind: 'GALLERY', url: '/uploads/side.webp', alt: 'side', sortOrder: 1 },
            ...frames,
          ],
        })
        .expect(200);

      const detail = await context.http().get(`/api/cars/${car.slug}`).expect(200);
      const images = detail.body.images as { kind: string; url: string; sortOrder: number }[];

      const spin = images.filter((image) => image.kind === 'SPIN');
      expect(spin).toHaveLength(24);

      /*
       * Order is the whole feature: out of order, the car appears to jump
       * about instead of turning. The API is asked for them in order and must
       * return them in order.
       */
      expect(spin.map((frame) => frame.url)).toEqual(frames.map((frame) => frame.url));

      // And the photographs are still just the photographs.
      expect(images.filter((image) => image.kind !== 'SPIN')).toHaveLength(2);
    });

    it('replaces a 360° set rather than appending to it', async () => {
      const car = await seedCar(context);
      const set = (prefix: string, count: number) =>
        Array.from({ length: count }, (_, index) => ({
          kind: 'SPIN',
          url: `/uploads/${prefix}-${index + 1}.webp`,
          sortOrder: index,
        }));

      const send = (images: unknown[]) =>
        context
          .http()
          .patch(`/api/cars/${car.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ images })
          .expect(200);

      await send(set('first', 24));
      await send(set('second', 24));

      const detail = await context.http().get(`/api/cars/${car.slug}`).expect(200);
      const spin = (detail.body.images as { kind: string; url: string }[]).filter(
        (image) => image.kind === 'SPIN',
      );

      // Half of one turn and half of another is not a car turning.
      expect(spin).toHaveLength(24);
      expect(spin.every((frame) => frame.url.includes('second'))).toBe(true);
    });

    it('attaches photographs to the colour they show', async () => {
      const car = await seedCar(context);

      await context
        .http()
        .patch(`/api/cars/${car.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          colors: [
            { name: 'Basalt Grey', hexCode: '#4A4A4A' },
            { name: 'Pearl White', hexCode: '#F2F2F2' },
          ],
          images: [
            { kind: 'MAIN', url: '/uploads/main.webp', sortOrder: 0 },
            { kind: 'EXTERIOR', url: '/uploads/grey-out.webp', colorName: 'Basalt Grey', sortOrder: 1 },
            { kind: 'INTERIOR', url: '/uploads/grey-in.webp', colorName: 'Basalt Grey', sortOrder: 2 },
            { kind: 'WHEEL', url: '/uploads/grey-wheel.webp', colorName: 'Basalt Grey', sortOrder: 3 },
            { kind: 'EXTERIOR', url: '/uploads/white-out.webp', colorName: 'pearl white', sortOrder: 4 },
          ],
        })
        .expect(200);

      const detail = await context.http().get(`/api/cars/${car.slug}`).expect(200);
      const colours = detail.body.colors as { id: string; name: string }[];
      const images = detail.body.images as { url: string; kind: string; colorId: string | null }[];

      const grey = colours.find((colour) => colour.name === 'Basalt Grey')!;
      const white = colours.find((colour) => colour.name === 'Pearl White')!;

      expect(images.filter((image) => image.colorId === grey.id).map((image) => image.kind).sort()).toEqual([
        'EXTERIOR',
        'INTERIOR',
        'WHEEL',
      ]);

      // Matched without regard to case — 'pearl white' is the same colour.
      expect(images.filter((image) => image.colorId === white.id)).toHaveLength(1);

      // The main photograph belongs to the car, not to any one colour.
      expect(images.find((image) => image.kind === 'MAIN')!.colorId).toBeNull();
    });

    it('keeps a photograph whose colour name matches nothing', async () => {
      const car = await seedCar(context);

      await context
        .http()
        .patch(`/api/cars/${car.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          colors: [{ name: 'Basalt Grey', hexCode: '#4A4A4A' }],
          images: [{ kind: 'EXTERIOR', url: '/uploads/typo.webp', colorName: 'Basalt Gray' }],
        })
        .expect(200);

      const detail = await context.http().get(`/api/cars/${car.slug}`).expect(200);
      const images = detail.body.images as { url: string; colorId: string | null }[];

      // A mistyped colour costs the photograph its grouping, never its existence.
      const orphan = images.find((image) => image.url === '/uploads/typo.webp');
      expect(orphan).toBeTruthy();
      expect(orphan!.colorId).toBeNull();
    });

    it('re-attaches photographs after the colours are replaced on save', async () => {
      const car = await seedCar(context);
      const payload = {
        colors: [{ name: 'Basalt Grey', hexCode: '#4A4A4A' }],
        images: [{ kind: 'EXTERIOR', url: '/uploads/grey.webp', colorName: 'Basalt Grey' }],
      };

      const send = () =>
        context
          .http()
          .patch(`/api/cars/${car.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(payload)
          .expect(200);

      await send();
      const first = await context.http().get(`/api/cars/${car.slug}`).expect(200);
      await send();
      const second = await context.http().get(`/api/cars/${car.slug}`).expect(200);

      /*
       * Saving twice recreates the colours, so their ids change. The link has
       * to be rebuilt from the name each time — an id captured by the browser
       * would already be dangling, which is exactly why the payload carries the
       * name instead.
       */
      const colourIdOf = (body: { colors: { id: string }[] }) => body.colors[0].id;
      expect(colourIdOf(second.body)).not.toBe(colourIdOf(first.body));

      const images = second.body.images as { colorId: string | null }[];
      expect(images[0].colorId).toBe(colourIdOf(second.body));
    });

    it('stores every group of a colour, including the two free ones', async () => {
      const car = await seedCar(context);

      await context
        .http()
        .patch(`/api/cars/${car.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          colors: [{ name: 'Basalt Grey', hexCode: '#4A4A4A' }],
          images: [
            { kind: 'EXTERIOR', url: '/uploads/g-out.webp', colorName: 'Basalt Grey' },
            { kind: 'INTERIOR', url: '/uploads/g-in.webp', colorName: 'Basalt Grey' },
            { kind: 'WHEEL', url: '/uploads/g-wheel.webp', colorName: 'Basalt Grey' },
            { kind: 'ENGINE', url: '/uploads/g-engine.webp', colorName: 'Basalt Grey' },
            { kind: 'TRUNK', url: '/uploads/g-boot.webp', colorName: 'Basalt Grey' },
            {
              kind: 'OTHER',
              url: '/uploads/g-scratch.webp',
              colorName: 'Basalt Grey',
              label: 'Scratch on the rear bumper',
              sortOrder: 0,
            },
            {
              kind: 'OTHER',
              url: '/uploads/g-roof.webp',
              colorName: 'Basalt Grey',
              label: 'Roof rails',
              sortOrder: 1,
            },
          ],
        })
        .expect(200);

      const detail = await context.http().get(`/api/cars/${car.slug}`).expect(200);
      const images = detail.body.images as {
        kind: string;
        url: string;
        label: string | null;
        sortOrder: number;
        colorId: string | null;
      }[];
      const colourId = (detail.body.colors as { id: string }[])[0].id;

      expect(images.map((image) => image.kind).sort()).toEqual([
        'ENGINE',
        'EXTERIOR',
        'INTERIOR',
        'OTHER',
        'OTHER',
        'TRUNK',
        'WHEEL',
      ]);
      expect(images.every((image) => image.colorId === colourId)).toBe(true);

      /*
       * The two free groups are both OTHER and are told apart by their
       * position. Losing that distinction would merge them into one group of
       * photographs with two different headings.
       */
      const free = images.filter((image) => image.kind === 'OTHER');
      expect(free.find((image) => image.sortOrder === 0)!.label).toBe('Scratch on the rear bumper');
      expect(free.find((image) => image.sortOrder === 1)!.label).toBe('Roof rails');
    });

    it('keeps each 360° frame at the angle it was shot from', async () => {
      const car = await seedCar(context);

      /*
       * The slot a photograph is uploaded into is its angle, and it arrives
       * with that position set. Sent out of order on purpose: the payload's
       * order must not be what decides the frame's place, or a set uploaded
       * one slot at a time would come back scrambled.
       */
      const shuffled = [11, 3, 23, 0, 7].map((index) => ({
        kind: 'SPIN',
        url: `/uploads/angle-${index * 15}.webp`,
        sortOrder: index,
      }));

      await context
        .http()
        .patch(`/api/cars/${car.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ images: shuffled })
        .expect(200);

      const detail = await context.http().get(`/api/cars/${car.slug}`).expect(200);
      const spin = (detail.body.images as { kind: string; url: string; sortOrder: number }[])
        .filter((image) => image.kind === 'SPIN')
        .sort((a, b) => a.sortOrder - b.sortOrder);

      expect(spin.map((frame) => frame.sortOrder)).toEqual([0, 3, 7, 11, 23]);
      expect(spin.map((frame) => frame.url)).toEqual([
        '/uploads/angle-0.webp',
        '/uploads/angle-45.webp',
        '/uploads/angle-105.webp',
        '/uploads/angle-165.webp',
        '/uploads/angle-345.webp',
      ]);
    });

    it('creates a vehicle with no promotional price', async () => {
      /*
       * The form sends null for an empty promotional price, and the create path
       * only guarded against undefined — so `new Decimal(null)` threw and every
       * attempt to add a car ended in "an unexpected error occurred". Editing a
       * car worked the whole time, which is why it went unnoticed.
       */
      const existing = await seedCar(context);

      const response = await context
        .http()
        .post('/api/cars')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          brandId: existing.brandId,
          model: 'Picanto',
          year: 2026,
          bodyType: 'SUV',
          price: 340000,
          promoPrice: null,
          engine: { fuelType: 'PETROL', powerHp: 100 },
        })
        .expect(201);

      expect(response.body.promoPrice).toBeNull();
      expect(response.body.model).toBe('Picanto');
    });

    it('publishes and unpublishes', async () => {
      const car = await seedCar(context);
      await context.prisma.car.update({ where: { id: car.id }, data: { status: 'DRAFT' } });

      await context.http().get(`/api/cars/${car.slug}`).expect(404);

      await context
        .http()
        .patch(`/api/cars/${car.id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await context.http().post(`/api/cars/${car.slug}/view`).expect(204);

      await context
        .http()
        .patch(`/api/cars/${car.id}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await context.http().get(`/api/cars/${car.slug}`).expect(404);
    });

    it('upserts a specification group on partial update', async () => {
      const car = await seedCar(context);

      const response = await context
        .http()
        .patch(`/api/cars/${car.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 27500, engine: { fuelType: 'ELECTRIC', electricRangeKm: 420 } })
        .expect(200);

      expect(Number(response.body.price)).toBe(27500);
      expect(response.body.engine).toMatchObject({ fuelType: 'ELECTRIC', electricRangeKm: 420 });
    });

    it('deletes a vehicle that no order references', async () => {
      const car = await seedCar(context);

      const response = await context
        .http()
        .delete(`/api/cars/${car.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.archived).toBe(false);
      expect(await context.prisma.car.findUnique({ where: { id: car.id } })).toBeNull();
    });

    it('archives rather than deletes a vehicle with orders, preserving history (spec §55)', async () => {
      const car = await seedCar(context);

      const order = await context
        .http()
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          carId: car.id,
          buyerName: 'Test Buyer',
          buyerEmail: 'buyer@test.local',
          buyerPhone: '+213600000000',
        })
        .expect(201);

      const response = await context
        .http()
        .delete(`/api/cars/${car.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.archived).toBe(true);

      const stored = await context.prisma.car.findUnique({ where: { id: car.id } });
      expect(stored?.status).toBe('ARCHIVED');
      expect(stored?.deletedAt).not.toBeNull();

      // The order — and its link to the vehicle — survives.
      const survivingOrder = await context.prisma.order.findUnique({ where: { id: order.body.id } });
      expect(survivingOrder?.carId).toBe(car.id);
    });

    it('refuses to delete a brand that still has vehicles', async () => {
      const car = await seedCar(context);

      await context
        .http()
        .delete(`/api/brands/${car.brandId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });
  });
});
