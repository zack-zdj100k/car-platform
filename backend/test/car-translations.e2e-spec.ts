import type { TestContext } from './harness';
import { createAdmin, createTestApp, resetDatabase, seedCar } from './harness';

/**
 * The authored copy of a vehicle, in more than one language.
 *
 * The interface switches language; the description the showroom typed did not,
 * because nothing read the overlay table. These check the two halves of the
 * repair: that an overlay can be written from the administration, and that a
 * blank field in one is not stored — the fallback to the car's own text is what
 * makes a half-finished translation readable rather than blank.
 */
describe('Car translations', () => {
  let context: TestContext;
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
  });

  const admin = () => ({ Authorization: `Bearer ${adminToken}` });

  it('saves an overlay and sends it with the vehicle', async () => {
    const car = await seedCar(context);

    await context
      .http()
      .patch(`/api/cars/${car.id}`)
      .set(admin())
      .send({
        description: 'The car, as written.',
        translations: [
          { locale: 'FR', description: 'La voiture, telle qu’écrite.', marketingDescription: 'Un choix sûr.' },
          { locale: 'AR', description: 'السيارة كما كُتبت.' },
        ],
      })
      .expect(200);

    const seen = await context.http().get(`/api/cars/${car.slug}`).expect(200);
    const french = seen.body.translations.find((entry: { locale: string }) => entry.locale === 'FR');

    expect(french.description).toBe('La voiture, telle qu’écrite.');
    expect(french.marketingDescription).toBe('Un choix sûr.');
    // Untouched fields stay empty, so the reader falls back to the car's own.
    expect(french.exteriorDescription).toBeNull();
    expect(seen.body.translations).toHaveLength(2);
  });

  it('stores nothing for a language nobody typed anything into', async () => {
    const car = await seedCar(context);

    await context
      .http()
      .patch(`/api/cars/${car.id}`)
      .set(admin())
      .send({
        translations: [
          { locale: 'FR', description: 'Quelque chose.' },
          // The form always sends all three blocks; two of them are empty.
          { locale: 'AR', description: '', marketingDescription: '   ' },
          { locale: 'EN' },
        ],
      })
      .expect(200);

    const saved = await context.prisma.carTranslation.findMany({ where: { carId: car.id } });
    expect(saved.map((row) => row.locale)).toEqual(['FR']);
  });

  it('replaces the set, so emptying a language removes it', async () => {
    const car = await seedCar(context);

    await context
      .http()
      .patch(`/api/cars/${car.id}`)
      .set(admin())
      .send({ translations: [{ locale: 'FR', description: 'Première version.' }] })
      .expect(200);

    await context
      .http()
      .patch(`/api/cars/${car.id}`)
      .set(admin())
      .send({ translations: [{ locale: 'AR', description: 'نسخة عربية.' }] })
      .expect(200);

    const saved = await context.prisma.carTranslation.findMany({ where: { carId: car.id } });
    expect(saved.map((row) => row.locale)).toEqual(['AR']);
  });

  it('leaves the overlays alone when a save does not mention them', async () => {
    const car = await seedCar(context);

    await context
      .http()
      .patch(`/api/cars/${car.id}`)
      .set(admin())
      .send({ translations: [{ locale: 'FR', description: 'À garder.' }] })
      .expect(200);

    // A save from somewhere that does not edit copy — publishing, say — must
    // not throw the translations away.
    await context.http().patch(`/api/cars/${car.id}`).set(admin()).send({ isFeatured: true }).expect(200);

    const saved = await context.prisma.carTranslation.findMany({ where: { carId: car.id } });
    expect(saved).toHaveLength(1);
    expect(saved[0].description).toBe('À garder.');
  });

  it('refuses a language the site does not have', async () => {
    const car = await seedCar(context);

    await context
      .http()
      .patch(`/api/cars/${car.id}`)
      .set(admin())
      .send({ translations: [{ locale: 'ES', description: 'No.' }] })
      .expect(400);
  });
});
