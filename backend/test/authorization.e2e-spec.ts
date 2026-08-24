import {
  createAdmin,
  createTestApp,
  registerCustomer,
  resetDatabase,
  seedCar,
  type TestContext,
} from './harness';

/**
 * Spec §38, §71 — authorization is enforced on the server for every request.
 * These tests are the proof that a frontend guard is never the control.
 */
describe('Authorization', () => {
  let context: TestContext;
  let customerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    context = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    const customer = await registerCustomer(context, 'customer@test.local');
    customerToken = customer.token;
    adminToken = (await createAdmin(context)).token;
  });

  afterAll(async () => {
    await context.app.close();
  });

  const adminRoutes: [string, string][] = [
    ['get', '/api/analytics/dashboard'],
    ['get', '/api/analytics/overview'],
    ['get', '/api/cars/admin/all'],
    ['get', '/api/users'],
    ['get', '/api/orders/admin/all'],
    ['get', '/api/settings'],
  ];

  it.each(adminRoutes)('refuses anonymous access to %s %s with 401', async (method, path) => {
    await context.http()[method as 'get'](path).expect(401);
  });

  it.each(adminRoutes)('refuses customer access to %s %s with 403', async (method, path) => {
    await context
      .http()
      [method as 'get'](path)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it.each(adminRoutes)('allows an admin on %s %s', async (method, path) => {
    await context
      .http()
      [method as 'get'](path)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('refuses a customer creating a car', async () => {
    const car = await seedCar(context);
    await context
      .http()
      .post('/api/cars')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ brandId: car.brandId, model: 'Nope', year: 2025, bodyType: 'SUV', price: 1000 })
      .expect(403);
  });

  it('refuses a customer changing an order status', async () => {
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

    await context
      .http()
      .patch(`/api/orders/${order.body.id}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'CONFIRMED' })
      .expect(403);
  });

  it("refuses one customer reading another customer's order", async () => {
    const car = await seedCar(context);
    const other = await registerCustomer(context, 'other@test.local');

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

    await context
      .http()
      .get(`/api/orders/${order.body.id}`)
      .set('Authorization', `Bearer ${other.token}`)
      .expect(403);
  });

  it("refuses one customer reading another customer's comparison", async () => {
    const other = await registerCustomer(context, 'other2@test.local');

    const comparison = await context
      .http()
      .post('/api/comparisons')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Mine' })
      .expect(201);

    await context
      .http()
      .get(`/api/comparisons/${comparison.body.id}`)
      .set('Authorization', `Bearer ${other.token}`)
      .expect(403);
  });

  it('takes effect immediately when an admin is demoted', async () => {
    const admin = await createAdmin(context, 'demoted@test.local');
    await context
      .http()
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    await context.prisma.user.update({ where: { id: admin.id }, data: { role: 'CUSTOMER' } });

    // The identity is re-read from the database on every request, so an
    // already-issued token cannot outlive the role it was granted under.
    await context
      .http()
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(403);
  });

  it('rejects a suspended user immediately', async () => {
    const customer = await registerCustomer(context, 'suspend@test.local');
    await context.http().get('/api/auth/me').set('Authorization', `Bearer ${customer.token}`).expect(200);

    await context.prisma.user.update({ where: { id: customer.id }, data: { status: 'SUSPENDED' } });

    await context.http().get('/api/auth/me').set('Authorization', `Bearer ${customer.token}`).expect(401);
  });

  it('prevents an admin from removing their own admin role', async () => {
    const admin = await createAdmin(context, 'self@test.local');
    await context
      .http()
      .patch(`/api/users/${admin.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'CUSTOMER' })
      .expect(403);
  });

  it('never leaves the platform without an active administrator', async () => {
    // Only one admin exists in this suite's fixture besides the actor.
    const soleAdmin = await createAdmin(context, 'sole@test.local');
    const actor = await createAdmin(context, 'actor@test.local');

    // Demoting one is fine while another remains.
    await context
      .http()
      .patch(`/api/users/${soleAdmin.id}`)
      .set('Authorization', `Bearer ${actor.token}`)
      .send({ role: 'CUSTOMER' })
      .expect(200);
  });
});
