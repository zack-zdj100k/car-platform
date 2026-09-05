import type { TestContext } from './harness';
import { createAdmin, createTestApp, registerCustomer, resetDatabase, seedCar } from './harness';

/**
 * One live appointment per vehicle and colour, per customer.
 *
 * A customer who books, hears nothing for a day and books again has not asked
 * for two meetings — they have asked for one twice, and the showroom then rings
 * them twice about the same car. What matters is which repeats are refused and
 * which are not: another colour is a different car to come and look at, and a
 * withdrawn request is one the customer is entitled to make again.
 */
describe('One appointment per car and colour', () => {
  let context: TestContext;
  let customer: { token: string; id: string };
  let adminToken: string;

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(async () => {
    await context.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    adminToken = (await createAdmin(context)).token;
    customer = await registerCustomer(context, 'once@test.local');
  });

  const buyer = () => ({ Authorization: `Bearer ${customer.token}` });
  const admin = () => ({ Authorization: `Bearer ${adminToken}` });

  const book = (carId: string, colourId?: string | null) =>
    context
      .http()
      .post('/api/orders')
      .set(buyer())
      .send({
        carId,
        buyerName: 'Repeat Buyer',
        buyerEmail: 'once@test.local',
        buyerPhone: '+213600000222',
        ...(colourId ? { selectedColorId: colourId } : {}),
      });

  it('refuses a second request for the same car in the same colour', async () => {
    const car = await seedCar(context);

    await book(car.id, car.colorId).expect(201);
    const again = await book(car.id, car.colorId).expect(409);

    // The refusal names the appointment they already have, so the customer can
    // find it rather than wondering what went wrong.
    expect(again.body.message).toMatch(/ORD-/);

    const mine = await context.http().get('/api/orders/mine').set(buyer()).expect(200);
    expect(mine.body.data).toHaveLength(1);
  });

  it('allows a second request in a different colour', async () => {
    const car = await seedCar(context);
    const other = await context.prisma.carColor.create({
      data: { carId: car.id, name: 'Test Blue', hexCode: '#0000FF', sortOrder: 1 },
    });

    await book(car.id, car.colorId).expect(201);
    await book(car.id, other.id).expect(201);

    const mine = await context.http().get('/api/orders/mine').set(buyer()).expect(200);
    expect(mine.body.data).toHaveLength(2);
  });

  it('lets a customer ask again after withdrawing', async () => {
    const car = await seedCar(context);
    const first = await book(car.id, car.colorId).expect(201);

    await context.http().patch(`/api/orders/${first.body.id}/cancel`).set(buyer()).expect(200);

    // Cancelled is not a queue position, so it does not hold the colour.
    await book(car.id, car.colorId).expect(201);
  });

  it('still refuses one the showroom has already been in touch about', async () => {
    const car = await seedCar(context);
    const first = await book(car.id, car.colorId).expect(201);

    await context
      .http()
      .patch(`/api/orders/${first.body.id}/status`)
      .set(admin())
      .send({ status: 'CONTACTED' })
      .expect(200);

    // Being rung about it is progress on the same appointment, not its end.
    await book(car.id, car.colorId).expect(409);

    const answer = await context
      .http()
      .get(`/api/orders/mine/for-car/${car.id}`)
      .set(buyer())
      .expect(200);
    expect(answer.body.colorIds).toEqual([car.colorId]);
  });

  it('does not let a completed sale block the next one', async () => {
    const car = await seedCar(context);
    const first = await book(car.id, car.colorId).expect(201);

    await context
      .http()
      .patch(`/api/orders/${first.body.id}/status`)
      .set(admin())
      .send({ status: 'COMPLETED' })
      .expect(200);

    await book(car.id, car.colorId).expect(201);
  });

  it('tells the vehicle page which colours are already spoken for', async () => {
    const car = await seedCar(context);
    const other = await context.prisma.carColor.create({
      data: { carId: car.id, name: 'Test Green', hexCode: '#00FF00', sortOrder: 2 },
    });

    await book(car.id, car.colorId).expect(201);

    const answer = await context
      .http()
      .get(`/api/orders/mine/for-car/${car.slug}`)
      .set(buyer())
      .expect(200);

    expect(answer.body.colorIds).toEqual([car.colorId]);
    expect(answer.body.colorIds).not.toContain(other.id);
    expect(answer.body.withoutColour).toBe(false);
  });

  it('counts an appointment made without choosing a colour', async () => {
    const car = await seedCar(context);
    await book(car.id).expect(201);

    const answer = await context
      .http()
      .get(`/api/orders/mine/for-car/${car.id}`)
      .set(buyer())
      .expect(200);

    expect(answer.body.withoutColour).toBe(true);
    // And the same request again is the same appointment.
    await book(car.id).expect(409);
  });

  it('will not say what anybody has asked for without a session', async () => {
    const car = await seedCar(context);
    await context.http().get(`/api/orders/mine/for-car/${car.id}`).expect(401);
  });

  it('is one customer’s business, not another’s', async () => {
    const car = await seedCar(context);
    const other = await registerCustomer(context, 'someone-else@test.local');

    await book(car.id, car.colorId).expect(201);

    // Somebody else asking about the same car in the same colour is a second
    // customer for one vehicle, which is the whole point of a showroom.
    await context
      .http()
      .post('/api/orders')
      .set({ Authorization: `Bearer ${other.token}` })
      .send({
        carId: car.id,
        buyerName: 'Other Buyer',
        buyerEmail: 'someone-else@test.local',
        buyerPhone: '+213600000333',
        selectedColorId: car.colorId,
      })
      .expect(201);

    const theirs = await context
      .http()
      .get(`/api/orders/mine/for-car/${car.id}`)
      .set({ Authorization: `Bearer ${other.token}` })
      .expect(200);
    expect(theirs.body.colorIds).toEqual([car.colorId]);
  });
});
