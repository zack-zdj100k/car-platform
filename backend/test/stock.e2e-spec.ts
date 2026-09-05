import type { TestContext } from './harness';
import { createAdmin, createTestApp, registerCustomer, resetDatabase, seedCar } from './harness';

/**
 * Stock, per colour.
 *
 * The showroom holds a handful of cars, not a warehouse, so what matters is
 * whether a colour can still be booked — and the number behind that answer is
 * the business's own. Three things are checked: the count never reaches a
 * customer, a completed sale takes a car off the floor, and a vehicle that has
 * run out stays in the catalogue.
 *
 * The last is the one worth a test. Deleting or hiding a sold-out vehicle
 * throws away the page a customer found last week over a stock level that
 * changes on Monday.
 */
describe('Stock and availability', () => {
  let context: TestContext;
  let adminToken: string;
  let customer: { token: string; id: string };

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(async () => {
    await context.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    adminToken = (await createAdmin(context)).token;
    customer = await registerCustomer(context, 'stock-buyer@test.local');
  });

  const admin = () => ({ Authorization: `Bearer ${adminToken}` });
  const buyer = () => ({ Authorization: `Bearer ${customer.token}` });

  it('tells a customer whether a colour is available, and never how many are left', async () => {
    const car = await seedCar(context);
    await context.prisma.carColor.update({ where: { id: car.colorId }, data: { stock: 3 } });

    const response = await context.http().get(`/api/cars/${car.slug}`).expect(200);
    const [colour] = response.body.colors;

    expect(colour.isAvailable).toBe(true);
    // The count is the business's: "one left" is a pressure this site does not
    // trade on, and three or forty is the same offer to somebody deciding
    // whether to come and look.
    expect(colour.stock).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('"stock"');
  });

  it('gives the administration the number, because that is what it is for', async () => {
    const car = await seedCar(context);
    await context.prisma.carColor.update({ where: { id: car.colorId }, data: { stock: 3 } });

    const response = await context
      .http()
      .get(`/api/cars/admin/${car.slug}`)
      .set(admin())
      .expect(200);

    expect(response.body.colors[0].stock).toBe(3);
    expect(response.body.colors[0].isAvailable).toBe(true);
  });

  it('counts an uncounted colour as available', async () => {
    // Null is not zero. Every colour that existed before the column, and any
    // colour the owner can order in, is uncounted — and bookable.
    const car = await seedCar(context);

    const response = await context.http().get(`/api/cars/${car.slug}`).expect(200);
    expect(response.body.colors[0].isAvailable).toBe(true);
    expect(response.body.isAvailable).toBe(true);
  });

  it('takes a car off the floor when a sale completes, and puts it back if that is undone', async () => {
    const car = await seedCar(context);
    await context.prisma.carColor.update({ where: { id: car.colorId }, data: { stock: 2 } });

    const order = await context
      .http()
      .post('/api/orders')
      .set(buyer())
      .send({
        carId: car.id,
        buyerName: 'Stock Buyer',
        buyerEmail: 'stock-buyer@test.local',
        buyerPhone: '+213600000111',
        selectedColorId: car.colorId,
      })
      .expect(201);

    await context
      .http()
      .patch(`/api/orders/${order.body.id}/status`)
      .set(admin())
      .send({ status: 'COMPLETED' })
      .expect(200);

    let colour = await context.prisma.carColor.findUniqueOrThrow({ where: { id: car.colorId } });
    expect(colour.stock).toBe(1);

    // Marked completed by mistake: the car never left, so it comes back.
    await context
      .http()
      .patch(`/api/orders/${order.body.id}/status`)
      .set(admin())
      .send({ status: 'CONFIRMED' })
      .expect(200);

    colour = await context.prisma.carColor.findUniqueOrThrow({ where: { id: car.colorId } });
    expect(colour.stock).toBe(2);
  });

  it('leaves an uncounted colour alone when a sale completes', async () => {
    const car = await seedCar(context);

    const order = await context
      .http()
      .post('/api/orders')
      .set(buyer())
      .send({
        carId: car.id,
        buyerName: 'Stock Buyer',
        buyerEmail: 'stock-buyer@test.local',
        buyerPhone: '+213600000111',
        selectedColorId: car.colorId,
      })
      .expect(201);

    await context
      .http()
      .patch(`/api/orders/${order.body.id}/status`)
      .set(admin())
      .send({ status: 'COMPLETED' })
      .expect(200);

    const colour = await context.prisma.carColor.findUniqueOrThrow({ where: { id: car.colorId } });
    // Still uncounted: decrementing null into -1 would invent a shortage.
    expect(colour.stock).toBeNull();
  });

  it('keeps "not counted" through a save, rather than turning it into none left', async () => {
    /*
     * The bug this exists to prevent: `@Type(() => Number)` on the stock field
     * converted null to 0, so saving a vehicle through the administration —
     * without touching a stock field — marked every one of its colours sold
     * out. The catalogue went unavailable and nothing said why.
     */
    const car = await seedCar(context);

    const saved = await context
      .http()
      .patch(`/api/cars/${car.id}`)
      .set(admin())
      .send({
        colors: [
          { name: 'Test White', hexCode: '#FFFFFF', isDefault: true, stock: null },
          { name: 'Counted Black', hexCode: '#000000', stock: 4 },
        ],
      })
      .expect(200);

    const white = saved.body.colors.find((colour: { name: string }) => colour.name === 'Test White');
    const black = saved.body.colors.find(
      (colour: { name: string }) => colour.name === 'Counted Black',
    );

    expect(white.stock).toBeNull();
    expect(white.isAvailable).toBe(true);
    expect(black.stock).toBe(4);

    const seen = await context.http().get(`/api/cars/${car.slug}`).expect(200);
    expect(seen.body.isAvailable).toBe(true);
  });

  it('keeps a sold-out vehicle in the catalogue, unavailable rather than gone', async () => {
    const car = await seedCar(context);
    await context.prisma.carColor.update({ where: { id: car.colorId }, data: { stock: 0 } });

    const detail = await context.http().get(`/api/cars/${car.slug}`).expect(200);
    expect(detail.body.isAvailable).toBe(false);
    expect(detail.body.colors[0].isAvailable).toBe(false);

    // Still listed, still readable, still photographed — the page a customer
    // found last week has not turned into a 404 over a stock level.
    const list = await context.http().get('/api/cars?pageSize=50').expect(200);
    const listed = (list.body.data as { slug: string; isAvailable: boolean }[]).find(
      (entry) => entry.slug === car.slug,
    );
    expect(listed).toBeDefined();
    expect(listed!.isAvailable).toBe(false);
  });
});
