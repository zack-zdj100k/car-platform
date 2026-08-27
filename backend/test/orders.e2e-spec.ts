import {
  createAdmin,
  createTestApp,
  registerCustomer,
  resetDatabase,
  seedCar,
  type TestContext,
} from './harness';

/** Spec §71 — order tests, covering §24, §25, §26 and §54. */
describe('Orders', () => {
  let context: TestContext;
  let customerToken: string;
  let adminToken: string;
  let auth: { Authorization: string };

  beforeAll(async () => {
    context = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    customerToken = (await registerCustomer(context, 'customer@test.local')).token;
    adminToken = (await createAdmin(context)).token;
    auth = { Authorization: `Bearer ${customerToken}` };
  });

  afterAll(async () => {
    await context.app.close();
  });

  const orderBody = (carId: string, extra: Record<string, unknown> = {}) => ({
    carId,
    buyerName: 'Test Buyer',
    buyerEmail: 'buyer@test.local',
    buyerPhone: '+213600000000',
    ...extra,
  });

  describe('submission (spec §24)', () => {
    it('creates an order with a quotable reference', async () => {
      const car = await seedCar(context);

      const response = await context.http().post('/api/orders').set(auth).send(orderBody(car.id)).expect(201);

      expect(response.body.reference).toMatch(/^ORD-\d{4}-[A-Z2-9]{6}$/);
      expect(response.body.status).toBe('PENDING');
    });

    it('snapshots the buyer details onto the order (spec §24)', async () => {
      const car = await seedCar(context);
      await context.http().post('/api/orders').set(auth).send(orderBody(car.id)).expect(201);

      // Editing the profile afterwards must not rewrite history.
      await context
        .http()
        .patch('/api/users/me')
        .set(auth)
        .send({ fullName: 'Totally Different Name' })
        .expect(200);

      const order = await context.prisma.order.findFirst();
      expect(order?.buyerName).toBe('Test Buyer');
    });

    it('snapshots the colour name so later edits cannot rewrite it', async () => {
      const car = await seedCar(context);

      const response = await context
        .http()
        .post('/api/orders')
        .set(auth)
        .send(orderBody(car.id, { selectedColorId: car.colorId }))
        .expect(201);

      expect(response.body.selectedColorName).toBe('Test White');

      await context.prisma.carColor.update({
        where: { id: car.colorId },
        data: { name: 'Renamed Colour' },
      });

      const stored = await context.prisma.order.findUnique({ where: { id: response.body.id } });
      expect(stored?.selectedColorName).toBe('Test White');
    });

    it('rejects a colour that belongs to a different vehicle', async () => {
      const car = await seedCar(context, { model: 'One' });
      const other = await seedCar(context, { model: 'Two' });

      await context
        .http()
        .post('/api/orders')
        .set(auth)
        .send(orderBody(car.id, { selectedColorId: other.colorId }))
        .expect(400);
    });

    it('rejects an unpublished vehicle', async () => {
      const car = await seedCar(context);
      await context.prisma.car.update({ where: { id: car.id }, data: { status: 'DRAFT' } });

      await context.http().post('/api/orders').set(auth).send(orderBody(car.id)).expect(404);
    });

    it.each([
      ['invalid email', { buyerEmail: 'not-an-email' }],
      ['invalid phone', { buyerPhone: 'abc' }],
      ['missing name', { buyerName: '' }],
    ])('rejects %s', async (_label, overrides) => {
      const car = await seedCar(context);
      await context.http().post('/api/orders').set(auth).send(orderBody(car.id, overrides)).expect(400);
    });

    it('requires authentication while orders.requireAuth is true (docs/DECISIONS D-1.2)', async () => {
      await context.prisma.setting.upsert({
        where: { key: 'orders.requireAuth' },
        update: { value: true },
        create: { key: 'orders.requireAuth', value: true, group: 'orders', isPublic: true },
      });

      const car = await seedCar(context);
      await context.http().post('/api/orders').send(orderBody(car.id)).expect(401);
    });

    it('accepts a guest order when the setting allows it, with a null user_id (spec §54)', async () => {
      await context.prisma.setting.upsert({
        where: { key: 'orders.requireAuth' },
        update: { value: false },
        create: { key: 'orders.requireAuth', value: false, group: 'orders', isPublic: true },
      });

      const car = await seedCar(context);
      const response = await context.http().post('/api/orders').send(orderBody(car.id)).expect(201);

      const stored = await context.prisma.order.findUnique({ where: { id: response.body.id } });
      expect(stored?.userId).toBeNull();
    });

    it('records the initial status in the history', async () => {
      const car = await seedCar(context);
      const response = await context.http().post('/api/orders').set(auth).send(orderBody(car.id)).expect(201);

      const history = await context.prisma.orderStatusHistory.findMany({
        where: { orderId: response.body.id },
      });

      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({ fromStatus: null, toStatus: 'PENDING' });
    });

    it('logs the notification attempts without failing the order (spec §26)', async () => {
      const car = await seedCar(context);
      const response = await context.http().post('/api/orders').set(auth).send(orderBody(car.id)).expect(201);

      const emails = await context.prisma.emailLog.findMany({ where: { orderId: response.body.id } });

      // One to the administrator, one to the customer.
      expect(emails).toHaveLength(2);

      /*
       * `LOGGED`, not `SENT`. Tests run with no mail provider configured, so
       * nothing leaves the machine — and the log has to say so. This used to
       * assert `SENT`, which was the platform lying to its owner: every order
       * notification was recorded as delivered when none had been.
       */
      expect(emails.map((entry) => entry.status)).toEqual(['LOGGED', 'LOGGED']);
      expect(emails.every((entry) => entry.sentAt === null)).toBe(true);
    });
  });

  describe('status transitions (spec §25)', () => {
    let orderId: string;

    beforeEach(async () => {
      const car = await seedCar(context);
      const response = await context.http().post('/api/orders').set(auth).send(orderBody(car.id)).expect(201);
      orderId = response.body.id;
    });

    it('permits PENDING → CONTACTED', async () => {
      const response = await context
        .http()
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONTACTED', note: 'Called the customer' })
        .expect(200);

      expect(response.body.status).toBe('CONTACTED');
    });

    it('refuses PENDING → COMPLETED', async () => {
      await context
        .http()
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'COMPLETED' })
        .expect(400);
    });

    it('refuses a no-op transition', async () => {
      await context
        .http()
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PENDING' })
        .expect(400);
    });

    it('treats COMPLETED as final', async () => {
      const admin = { Authorization: `Bearer ${adminToken}` };

      await context.http().patch(`/api/orders/${orderId}/status`).set(admin).send({ status: 'CONTACTED' }).expect(200);
      await context.http().patch(`/api/orders/${orderId}/status`).set(admin).send({ status: 'COMPLETED' }).expect(200);

      const transitions = await context.http().get(`/api/orders/${orderId}/transitions`).set(admin).expect(200);
      expect(transitions.body.allowed).toEqual([]);

      await context.http().patch(`/api/orders/${orderId}/status`).set(admin).send({ status: 'PENDING' }).expect(400);
    });

    it('records every transition with the acting administrator', async () => {
      await context
        .http()
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONTACTED', note: 'Left a voicemail' })
        .expect(200);

      const order = await context
        .http()
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(order.body.statusHistory).toHaveLength(2);
      expect(order.body.statusHistory[1]).toMatchObject({
        fromStatus: 'PENDING',
        toStatus: 'CONTACTED',
        note: 'Left a voicemail',
      });
      expect(order.body.statusHistory[1].changedBy).toBeTruthy();
    });
  });

  describe('visibility', () => {
    it('shows a customer only their own orders', async () => {
      const car = await seedCar(context);
      const other = await registerCustomer(context, 'other@test.local');

      await context.http().post('/api/orders').set(auth).send(orderBody(car.id)).expect(201);

      const mine = await context.http().get('/api/orders/mine').set(auth).expect(200);
      expect(mine.body.meta.total).toBe(1);

      const theirs = await context
        .http()
        .get('/api/orders/mine')
        .set('Authorization', `Bearer ${other.token}`)
        .expect(200);
      expect(theirs.body.meta.total).toBe(0);
    });

    it('lets an admin search every order', async () => {
      const car = await seedCar(context);
      await context.http().post('/api/orders').set(auth).send(orderBody(car.id)).expect(201);

      const response = await context
        .http()
        .get('/api/orders/admin/all?search=buyer@test.local')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.meta.total).toBe(1);
    });
  });
});
