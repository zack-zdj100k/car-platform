import { createTestApp, registerCustomer, resetDatabase, seedCar, type TestContext } from './harness';

/** Spec §71 — favorites, recently viewed and comparison tests. */
describe('Customer features', () => {
  let context: TestContext;
  let token: string;
  let auth: { Authorization: string };

  beforeAll(async () => {
    context = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    token = (await registerCustomer(context, 'customer@test.local')).token;
    auth = { Authorization: `Bearer ${token}` };
  });

  afterAll(async () => {
    await context.app.close();
  });

  describe('favorites (spec §41, §51)', () => {
    it('adds, lists and removes', async () => {
      const car = await seedCar(context);

      await context.http().post(`/api/favorites/${car.id}`).set(auth).expect(201);

      const list = await context.http().get('/api/favorites').set(auth).expect(200);
      expect(list.body.meta.total).toBe(1);
      expect(list.body.data[0].car.id).toBe(car.id);

      await context.http().delete(`/api/favorites/${car.id}`).set(auth).expect(200);
      const empty = await context.http().get('/api/favorites').set(auth).expect(200);
      expect(empty.body.meta.total).toBe(0);
    });

    it('is idempotent — favouriting twice does not duplicate or error', async () => {
      const car = await seedCar(context);

      await context.http().post(`/api/favorites/${car.id}`).set(auth).expect(201);
      await context.http().post(`/api/favorites/${car.id}`).set(auth).expect(201);

      expect(await context.prisma.favorite.count({ where: { carId: car.id } })).toBe(1);
    });

    it('returns 404 for an unknown vehicle', async () => {
      await context.http().post('/api/favorites/nope').set(auth).expect(404);
    });

    it('returns 404 when removing something that was not a favourite', async () => {
      const car = await seedCar(context);
      await context.http().delete(`/api/favorites/${car.id}`).set(auth).expect(404);
    });

    it('exposes ids for rendering card states in one request', async () => {
      const car = await seedCar(context);
      await context.http().post(`/api/favorites/${car.id}`).set(auth).expect(201);

      const response = await context.http().get('/api/favorites/ids').set(auth).expect(200);
      expect(response.body).toEqual([car.id]);
    });

    it('keeps each customer’s favourites separate', async () => {
      const car = await seedCar(context);
      const other = await registerCustomer(context, 'other@test.local');

      await context.http().post(`/api/favorites/${car.id}`).set(auth).expect(201);

      const otherList = await context
        .http()
        .get('/api/favorites')
        .set('Authorization', `Bearer ${other.token}`)
        .expect(200);

      expect(otherList.body.meta.total).toBe(0);
    });
  });

  describe('recently viewed (spec §42, §52)', () => {
    it('records a view and lists most recent first', async () => {
      const first = await seedCar(context, { model: 'First' });
      const second = await seedCar(context, { model: 'Second' });

      await context.http().post(`/api/cars/${first.slug}/view`).set(auth).expect(204);
      await context.http().post(`/api/cars/${second.slug}/view`).set(auth).expect(204);

      const response = await context.http().get('/api/recently-viewed').set(auth).expect(200);

      expect(response.body.meta.total).toBe(2);
      expect(response.body.data[0].car.model).toBe('Second');
    });

    it('updates the timestamp on re-view rather than duplicating', async () => {
      const car = await seedCar(context);

      await context.http().post(`/api/cars/${car.slug}/view`).set(auth).expect(204);
      await context.http().post(`/api/cars/${car.slug}/view`).set(auth).expect(204);

      const response = await context.http().get('/api/recently-viewed').set(auth).expect(200);
      expect(response.body.meta.total).toBe(1);
      expect(await context.prisma.recentlyViewed.count({ where: { carId: car.id } })).toBe(1);
    });

    it('clears history', async () => {
      const car = await seedCar(context);
      await context.http().post(`/api/cars/${car.slug}/view`).set(auth).expect(204);

      await context.http().delete('/api/recently-viewed').set(auth).expect(200);

      const response = await context.http().get('/api/recently-viewed').set(auth).expect(200);
      expect(response.body.meta.total).toBe(0);
    });
  });

  describe('comparisons (spec §43, §53)', () => {
    it('creates a comparison seeded with vehicles', async () => {
      const first = await seedCar(context, { model: 'First' });
      const second = await seedCar(context, { model: 'Second' });

      const response = await context
        .http()
        .post('/api/comparisons')
        .set(auth)
        .send({ name: 'Shortlist', carIds: [first.id, second.id] })
        .expect(201);

      expect(response.body.cars).toHaveLength(2);
      // The table needs every specification group (spec §43).
      expect(response.body.cars[0].car).toHaveProperty('engine');
      expect(response.body.cars[0].car).toHaveProperty('dimensions');
      expect(response.body.cars[0].car).toHaveProperty('safety');
    });

    it('treats adding the same vehicle twice as a no-op', async () => {
      const car = await seedCar(context);
      const comparison = await context.http().post('/api/comparisons').set(auth).send({}).expect(201);

      await context
        .http()
        .post(`/api/comparisons/${comparison.body.id}/cars`)
        .set(auth)
        .send({ carId: car.id })
        .expect(201);

      const second = await context
        .http()
        .post(`/api/comparisons/${comparison.body.id}/cars`)
        .set(auth)
        .send({ carId: car.id })
        .expect(201);

      expect(second.body.cars).toHaveLength(1);
    });

    it('enforces the maximum number of vehicles', async () => {
      await context.prisma.setting.upsert({
        where: { key: 'compare.maxCars' },
        update: { value: 2 },
        create: { key: 'compare.maxCars', value: 2, group: 'cars', isPublic: true },
      });

      const cars = await Promise.all([
        seedCar(context, { model: 'A' }),
        seedCar(context, { model: 'B' }),
        seedCar(context, { model: 'C' }),
      ]);

      const comparison = await context
        .http()
        .post('/api/comparisons')
        .set(auth)
        .send({ carIds: [cars[0].id, cars[1].id] })
        .expect(201);

      await context
        .http()
        .post(`/api/comparisons/${comparison.body.id}/cars`)
        .set(auth)
        .send({ carId: cars[2].id })
        .expect(400);
    });

    it('removes a vehicle and clears the comparison without deleting it', async () => {
      const first = await seedCar(context, { model: 'First' });
      const second = await seedCar(context, { model: 'Second' });

      const comparison = await context
        .http()
        .post('/api/comparisons')
        .set(auth)
        .send({ carIds: [first.id, second.id] })
        .expect(201);

      const afterRemove = await context
        .http()
        .delete(`/api/comparisons/${comparison.body.id}/cars/${first.id}`)
        .set(auth)
        .expect(200);
      expect(afterRemove.body.cars).toHaveLength(1);

      const afterClear = await context
        .http()
        .patch(`/api/comparisons/${comparison.body.id}/clear`)
        .set(auth)
        .expect(200);
      expect(afterClear.body.cars).toHaveLength(0);
      expect(afterClear.body.id).toBe(comparison.body.id);
    });

    it('deletes a comparison', async () => {
      const comparison = await context.http().post('/api/comparisons').set(auth).send({}).expect(201);

      await context.http().delete(`/api/comparisons/${comparison.body.id}`).set(auth).expect(200);
      await context.http().get(`/api/comparisons/${comparison.body.id}`).set(auth).expect(404);
    });
  });

  describe('dashboard (spec §40)', () => {
    it('summarises counts from the database', async () => {
      const car = await seedCar(context);
      await context.http().post(`/api/favorites/${car.id}`).set(auth).expect(201);
      await context.http().post(`/api/cars/${car.slug}/view`).set(auth).expect(204);

      const response = await context.http().get('/api/dashboard').set(auth).expect(200);

      expect(response.body.summary).toMatchObject({ favorites: 1, recentlyViewed: 1 });
      expect(response.body.recentlyViewed).toHaveLength(1);
    });
  });

  describe('profile (spec §44)', () => {
    it('updates the profile without exposing the password hash', async () => {
      const response = await context
        .http()
        .patch('/api/users/me')
        .set(auth)
        .send({ fullName: 'Renamed Customer', phone: '+213600000009' })
        .expect(200);

      expect(response.body.fullName).toBe('Renamed Customer');
      expect(JSON.stringify(response.body)).not.toContain('argon2');
    });

    it('rejects a password change with the wrong current password', async () => {
      await context
        .http()
        .patch('/api/users/me/password')
        .set(auth)
        .send({ currentPassword: 'WrongPass123', newPassword: 'BrandNew123', confirmPassword: 'BrandNew123' })
        .expect(400);
    });

    it('changes the password and revokes every session', async () => {
      const customer = await registerCustomer(context, 'changepass@test.local');

      await context
        .http()
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${customer.token}`)
        .send({ currentPassword: 'TestPass123', newPassword: 'BrandNew123', confirmPassword: 'BrandNew123' })
        .expect(200);

      // Existing sessions end, so a stolen token cannot outlive the change.
      await context.http().post('/api/auth/refresh').set('Cookie', customer.cookie).expect(401);

      await context
        .http()
        .post('/api/auth/login')
        .send({ email: 'changepass@test.local', password: 'BrandNew123' })
        .expect(200);
    });
  });
});
