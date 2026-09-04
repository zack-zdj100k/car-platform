import type { TestContext } from './harness';
import { createAdmin, createTestApp, registerCustomer, resetDatabase, seedCar } from './harness';

/**
 * Deleting an account.
 *
 * A customer who asks to be gone should be gone: leaving a row with their name,
 * telephone number and address in the orders table is not "gone". What must not
 * go with them is anything that was never theirs — the catalogue — and what must
 * not be possible is locking everybody out of the administration.
 */
describe('Deleting an account', () => {
  let context: TestContext;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(async () => {
    await context.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    const admin = await createAdmin(context);
    adminToken = admin.token;
    adminId = admin.id;
  });

  const admin = () => ({ Authorization: `Bearer ${adminToken}` });

  it('takes the customer’s appointments with them, and leaves the catalogue alone', async () => {
    const customer = await registerCustomer(context, 'leaving@test.local');
    const car = await seedCar(context);

    await context
      .http()
      .post('/api/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        carId: car.id,
        buyerName: 'Leaving Customer',
        buyerEmail: 'leaving@test.local',
        buyerPhone: '+213600000222',
      })
      .expect(201);

    await context.http().delete(`/api/users/${customer.id}`).set(admin()).expect(200);

    expect(await context.prisma.user.findUnique({ where: { id: customer.id } })).toBeNull();
    expect(await context.prisma.order.count({ where: { userId: customer.id } })).toBe(0);
    // The vehicle they enquired about was never theirs.
    expect(await context.prisma.car.findUnique({ where: { id: car.id } })).not.toBeNull();
  });

  it('refuses to delete the account doing the deleting', async () => {
    await context.http().delete(`/api/users/${adminId}`).set(admin()).expect(403);
  });

  it('refuses to delete the last administrator', async () => {
    const second = await createAdmin(context, 'second-admin@test.local');

    // Two administrators: one may go.
    await context
      .http()
      .delete(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${second.token}`)
      .expect(200);

    // One left: nobody may lock the door from the outside.
    await context
      .http()
      .delete(`/api/users/${second.id}`)
      .set('Authorization', `Bearer ${second.token}`)
      .expect(403);
  });

  it('is closed to customers', async () => {
    const customer = await registerCustomer(context, 'nosy2@test.local');
    const victim = await registerCustomer(context, 'victim@test.local');

    await context
      .http()
      .delete(`/api/users/${victim.id}`)
      .set('Authorization', `Bearer ${customer.token}`)
      .expect(403);
  });
});
