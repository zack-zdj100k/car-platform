import { createAdmin, createTestApp, registerCustomer, resetDatabase, seedCar, type TestContext } from './harness';

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
      await context.http().get(`/api/cars/${car.slug}`).expect(200);

      const views = await context.prisma.carView.count({ where: { carId: car.id } });
      expect(views).toBe(1);
    });

    it('records view history for a signed-in customer', async () => {
      const car = await seedCar(context);
      await context
        .http()
        .get(`/api/cars/${car.slug}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

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

    it('publishes and unpublishes', async () => {
      const car = await seedCar(context);
      await context.prisma.car.update({ where: { id: car.id }, data: { status: 'DRAFT' } });

      await context.http().get(`/api/cars/${car.slug}`).expect(404);

      await context
        .http()
        .patch(`/api/cars/${car.id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await context.http().get(`/api/cars/${car.slug}`).expect(200);

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
