import {
  createAdmin,
  createTestApp,
  flushEmails,
  resetDatabase,
  seedCar,
  strongPassword,
  type TestContext,
} from './harness';

/**
 * The complete journey spec §71 specifies:
 *
 *   Register → Login → Browse → Open car → Favourite → Compare
 *   → Submit order → Admin receives order → Admin updates status
 *
 * Run as one continuous sequence against the real API and database, because the
 * value is in the steps holding together, not in each one passing alone.
 */
describe('End-to-end customer journey (spec §71)', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestApp();
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.app.close();
  });

  const email = 'journey@test.local';
  let token: string;
  let refreshCookie: string;
  let carId: string;
  let carSlug: string;
  let colorId: string;
  let secondCarId: string;
  let orderId: string;
  let orderReference: string;
  let adminToken: string;

  it('1. seeds a published catalogue and an administrator', async () => {
    const first = await seedCar(context, { brandName: 'Journey', model: 'Alpha', price: '28000.00' });
    const second = await seedCar(context, { brandName: 'Journey', model: 'Beta', price: '36000.00' });

    carId = first.id;
    carSlug = first.slug;
    colorId = first.colorId;
    secondCarId = second.id;

    adminToken = (await createAdmin(context, 'journey-admin@test.local')).token;
    expect(adminToken).toEqual(expect.any(String));
  });

  it('2. registers a new customer', async () => {
    const response = await context
      .http()
      .post('/api/auth/register')
      .send({
        fullName: 'Journey Customer',
        email,
        password: strongPassword,
        confirmPassword: strongPassword,
        phone: '+213600000123',
        acceptTerms: true,
      })
      .expect(201);

    expect(response.body.user).toMatchObject({ email, role: 'CUSTOMER' });
  });

  it('3. signs in and receives a session', async () => {
    const response = await context
      .http()
      .post('/api/auth/login')
      .send({ email, password: strongPassword })
      .expect(200);

    token = response.body.accessToken;
    refreshCookie = (response.headers['set-cookie'] as unknown as string[])[0].split(';')[0];

    expect(token).toEqual(expect.any(String));
  });

  it('4. browses the catalogue and filters it', async () => {
    const all = await context.http().get('/api/cars').expect(200);
    expect(all.body.meta.total).toBe(2);

    const filtered = await context.http().get('/api/cars?priceMin=30000').expect(200);
    expect(filtered.body.meta.total).toBe(1);
    expect(filtered.body.data[0].model).toBe('Beta');
  });

  it('5. opens a car, which records a view and view history', async () => {
    const response = await context
      .http()
      .get(`/api/cars/${carSlug}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    /*
     * Reading the car and reporting the view are two calls now. They have to
     * be: the page is rendered on the site's server, where the reader's token
     * does not exist, so a view recorded while reading was always anonymous —
     * "recently viewed" stayed empty for everyone, and an administrator counted
     * as a visitor.
     */
    await context
      .http()
      .post(`/api/cars/${carSlug}/view`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    expect(response.body.id).toBe(carId);
    expect(response.body.engine).toBeTruthy();

    expect(await context.prisma.carView.count({ where: { carId } })).toBe(1);
    expect(await context.prisma.recentlyViewed.count({ where: { carId } })).toBe(1);
  });

  it('6. favourites the car', async () => {
    await context
      .http()
      .post(`/api/favorites/${carId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const favorites = await context
      .http()
      .get('/api/favorites')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(favorites.body.meta.total).toBe(1);
  });

  it('7. compares it against another vehicle', async () => {
    const comparison = await context
      .http()
      .post('/api/comparisons')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Journey shortlist', carIds: [carId, secondCarId] })
      .expect(201);

    expect(comparison.body.cars).toHaveLength(2);
    // The comparison table needs the full specification tree.
    expect(comparison.body.cars[0].car.engine).toBeTruthy();
  });

  it('8. submits an order for the favourited car', async () => {
    const response = await context
      .http()
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        carId,
        buyerName: 'Journey Customer',
        buyerEmail: email,
        buyerPhone: '+213600000123',
        selectedColorId: colorId,
        message: 'Please call me in the afternoon.',
      })
      .expect(201);

    orderId = response.body.id;
    orderReference = response.body.reference;

    expect(response.body.status).toBe('PENDING');
    expect(response.body.selectedColorName).toBe('Test White');
  });

  it('9. sees the order in their own dashboard', async () => {
    const mine = await context
      .http()
      .get('/api/orders/mine')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(mine.body.meta.total).toBe(1);
    expect(mine.body.data[0].reference).toBe(orderReference);

    const dashboard = await context
      .http()
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(dashboard.body.summary).toMatchObject({
      favorites: 1,
      recentlyViewed: 1,
      savedComparisons: 1,
      orders: 1,
    });
  });

  it('10. the administrator receives the order', async () => {
    const response = await context
      .http()
      .get('/api/orders/admin/all')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.meta.total).toBe(1);
    expect(response.body.data[0]).toMatchObject({
      reference: orderReference,
      buyerName: 'Journey Customer',
      status: 'PENDING',
    });
  });

  it('11. a notification was recorded for the administrator (spec §26)', async () => {
    await flushEmails(context);
    const emails = await context.prisma.emailLog.findMany({ where: { orderId } });

    expect(emails.some((entry) => entry.template === 'admin-order-notification')).toBe(true);
    expect(emails.some((entry) => entry.template === 'customer-order-confirmation')).toBe(true);
  });

  it('12. the administrator advances the status', async () => {
    const contacted = await context
      .http()
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CONTACTED', note: 'Spoke to the customer' })
      .expect(200);

    expect(contacted.body.status).toBe('CONTACTED');

    const confirmed = await context
      .http()
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CONFIRMED' })
      .expect(200);

    expect(confirmed.body.status).toBe('CONFIRMED');
  });

  it('13. the customer sees the updated status', async () => {
    const mine = await context
      .http()
      .get('/api/orders/mine')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(mine.body.data[0].status).toBe('CONFIRMED');
  });

  it('14. the full transition history is auditable', async () => {
    const order = await context
      .http()
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(order.body.statusHistory.map((entry: { toStatus: string }) => entry.toStatus)).toEqual([
      'PENDING',
      'CONTACTED',
      'CONFIRMED',
    ]);
  });

  it('15. the activity appears in the admin analytics', async () => {
    const analytics = await context
      .http()
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(analytics.body.overview.orders.total).toBe(1);
    expect(analytics.body.overview.favorites.total).toBe(1);
    expect(analytics.body.mostViewed[0]).toMatchObject({ count: 1 });
  });

  it('16. signing out ends the session', async () => {
    await context.http().post('/api/auth/logout').set('Cookie', refreshCookie).expect(204);
    await context.http().post('/api/auth/refresh').set('Cookie', refreshCookie).expect(401);
  });
});
