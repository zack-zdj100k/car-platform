import {
  createAdmin,
  createTestApp,
  flushEmails,
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

      await flushEmails(context);
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

    it('permits PENDING → COMPLETED, without walking through the middle', async () => {
      // A sale can conclude in one conversation. The administrator should not
      // have to record two statuses that never happened to get there.
      const response = await context
        .http()
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
    });

    it('refuses a no-op transition', async () => {
      await context
        .http()
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PENDING' })
        .expect(400);
    });

    it('lets a completed order be corrected, and records the correction', async () => {
      const admin = { Authorization: `Bearer ${adminToken}` };

      await context.http().patch(`/api/orders/${orderId}/status`).set(admin).send({ status: 'COMPLETED' }).expect(200);

      // COMPLETED used to be a dead end: a customer who pulled out afterwards
      // could not be recorded at all.
      const transitions = await context.http().get(`/api/orders/${orderId}/transitions`).set(admin).expect(200);
      expect(transitions.body.allowed).toEqual(
        expect.arrayContaining(['PENDING', 'CONTACTED', 'CONFIRMED', 'CANCELLED']),
      );
      expect(transitions.body.allowed).not.toContain('COMPLETED');

      await context
        .http()
        .patch(`/api/orders/${orderId}/status`)
        .set(admin)
        .send({ status: 'CANCELLED', note: 'Customer withdrew after delivery was agreed' })
        .expect(200);

      const order = await context.http().get(`/api/orders/${orderId}`).set(admin).expect(200);

      expect(order.body.status).toBe('CANCELLED');
      // The safeguard is the trail, not the locked door: the correction shows
      // as a correction, with its reason and who made it.
      expect(order.body.statusHistory).toHaveLength(3);
      expect(order.body.statusHistory[2]).toMatchObject({
        fromStatus: 'COMPLETED',
        toStatus: 'CANCELLED',
        note: 'Customer withdrew after delivery was agreed',
      });
      expect(order.body.statusHistory[2].changedBy).toBeTruthy();
    });

    it('offers every status except the current one', async () => {
      const admin = { Authorization: `Bearer ${adminToken}` };
      const transitions = await context.http().get(`/api/orders/${orderId}/transitions`).set(admin).expect(200);

      expect(transitions.body.status).toBe('PENDING');
      expect(transitions.body.allowed.sort()).toEqual(
        ['CANCELLED', 'COMPLETED', 'CONFIRMED', 'CONTACTED'].sort(),
      );
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

  describe('a customer withdrawing their own appointment', () => {
    it('cancels it, and records who cancelled it', async () => {
      const car = await seedCar(context);
      const created = await context
        .http()
        .post('/api/orders')
        .set(auth)
        .send(orderBody(car.id))
        .expect(201);

      const cancelled = await context
        .http()
        .patch(`/api/orders/${created.body.id}/cancel`)
        .set(auth)
        .expect(200);
      expect(cancelled.body.status).toBe('CANCELLED');

      // The record stays, with the withdrawal in its history — it is part of
      // what happened, not something to erase.
      const detail = await context
        .http()
        .get(`/api/orders/${created.body.id}`)
        .set(auth)
        .expect(200);
      const last = detail.body.statusHistory.at(-1);
      expect(last.toStatus).toBe('CANCELLED');
      expect(last.note).toMatch(/customer/i);
    });

    it('refuses to cancel somebody else’s', async () => {
      const car = await seedCar(context);
      const created = await context
        .http()
        .post('/api/orders')
        .set(auth)
        .send(orderBody(car.id))
        .expect(201);

      const other = await registerCustomer(context, 'stranger@test.local');
      await context
        .http()
        .patch(`/api/orders/${created.body.id}/cancel`)
        .set('Authorization', `Bearer ${other.token}`)
        .expect(403);
    });

    it('refuses once the appointment has been completed', async () => {
      const car = await seedCar(context);
      const created = await context
        .http()
        .post('/api/orders')
        .set(auth)
        .send(orderBody(car.id))
        .expect(201);

      await context
        .http()
        .patch(`/api/orders/${created.body.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      await context
        .http()
        .patch(`/api/orders/${created.body.id}/cancel`)
        .set(auth)
        .expect(400);
    });

    it('cannot be used to set any other status', async () => {
      // The customer's route only ever cancels; anything else is the
      // administrator's, and that one is behind the admin guard.
      const car = await seedCar(context);
      const created = await context
        .http()
        .post('/api/orders')
        .set(auth)
        .send(orderBody(car.id))
        .expect(201);

      await context
        .http()
        .patch(`/api/orders/${created.body.id}/status`)
        .set(auth)
        .send({ status: 'CONFIRMED' })
        .expect(403);
    });
  });

  describe('the meeting place', () => {
    const place = {
      meetingAddress: 'Cité 1000 Logements, El Khroub, Constantine',
      meetingMapUrl: 'https://maps.google.com/?q=36.2639,6.6903',
      meetingNote: 'Saturday morning, ask for Karim',
    };

    async function bookAndSetPlace() {
      const car = await seedCar(context);
      const created = await context
        .http()
        .post('/api/orders')
        .set(auth)
        .send(orderBody(car.id))
        .expect(201);

      await context
        .http()
        .patch(`/api/orders/${created.body.id}/meeting`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(place)
        .expect(200);

      return created.body.id as string;
    }

    it('is kept from the customer until the appointment is confirmed', async () => {
      const id = await bookAndSetPlace();

      // Still pending: there is nothing to come to yet, and an address on an
      // unanswered request sends somebody to a closed door.
      const pending = await context.http().get(`/api/orders/${id}`).set(auth).expect(200);
      expect(pending.body.meetingAddress).toBeNull();
      expect(pending.body.meetingMapUrl).toBeNull();

      await context
        .http()
        .patch(`/api/orders/${id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);

      const confirmed = await context.http().get(`/api/orders/${id}`).set(auth).expect(200);
      expect(confirmed.body.meetingAddress).toBe(place.meetingAddress);
      expect(confirmed.body.meetingMapUrl).toBe(place.meetingMapUrl);
      expect(confirmed.body.meetingNote).toBe(place.meetingNote);
    });

    it('is taken away again if the appointment is cancelled', async () => {
      const id = await bookAndSetPlace();

      await context
        .http()
        .patch(`/api/orders/${id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
      await context
        .http()
        .patch(`/api/orders/${id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CANCELLED' })
        .expect(200);

      const cancelled = await context.http().get(`/api/orders/${id}`).set(auth).expect(200);
      expect(cancelled.body.meetingAddress).toBeNull();

      // The administration still has it: the appointment may come back.
      const asAdmin = await context
        .http()
        .get(`/api/orders/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(asAdmin.body.meetingAddress).toBe(place.meetingAddress);
    });

    it('appears in the customer’s own list under the same rule', async () => {
      const id = await bookAndSetPlace();
      await context
        .http()
        .patch(`/api/orders/${id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);

      const mine = await context.http().get('/api/orders/mine').set(auth).expect(200);
      const row = (mine.body.data as { id: string; meetingAddress: string | null }[]).find(
        (entry) => entry.id === id,
      );
      expect(row?.meetingAddress).toBe(place.meetingAddress);
    });

    it('is the administration’s to write, not the customer’s', async () => {
      const car = await seedCar(context);
      const created = await context
        .http()
        .post('/api/orders')
        .set(auth)
        .send(orderBody(car.id))
        .expect(201);

      await context
        .http()
        .patch(`/api/orders/${created.body.id}/meeting`)
        .set(auth)
        .send(place)
        .expect(403);
    });

    it('refuses a map link that is not a full address', async () => {
      const car = await seedCar(context);
      const created = await context
        .http()
        .post('/api/orders')
        .set(auth)
        .send(orderBody(car.id))
        .expect(201);

      await context
        .http()
        .patch(`/api/orders/${created.body.id}/meeting`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ meetingMapUrl: 'maps.google.com/?q=here' })
        .expect(400);
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
