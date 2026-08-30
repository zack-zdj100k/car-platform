/* eslint-disable no-console */
/**
 * DEVELOPMENT SEED (spec §73, §74)
 *
 * Idempotent: safe to run repeatedly. Every vehicle is written with
 * `isDemoData: true` so demo inventory is never mistaken for real listings.
 * Credentials come from environment variables — none are hard-coded here.
 *
 *   npm run db:seed
 */
import { PrismaClient, Prisma, Role, CarStatus, OrderStatus, ColorKind, ImageKind, Locale } from '@prisma/client';
import * as argon2 from 'argon2';
import { brands } from './data/brands';
import { cars } from './data/cars';
import { settings } from './data/settings';

const prisma = new PrismaClient();

/** Spec §49, §67 — Argon2id with parameters above the OWASP minimum. */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Copy .env.example to .env and set the seed credentials (spec §73).`,
    );
  }
  return value;
}

/** Deterministic pseudo-random so repeated seeds produce identical demo activity. */
function deterministic(seed: number, max: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return Math.floor((x - Math.floor(x)) * max);
}

async function seedSettings(): Promise<void> {
  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { group: setting.group, isPublic: setting.isPublic, description: setting.description },
      create: {
        key: setting.key,
        value: setting.value as Prisma.InputJsonValue,
        group: setting.group,
        isPublic: setting.isPublic,
        description: setting.description,
      },
    });
  }
  console.log(`  settings ......... ${settings.length}`);
}

async function seedBrands(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const brand of brands) {
    const row = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {
        name: brand.name,
        country: brand.country,
        description: brand.description,
        isFeatured: brand.isFeatured ?? false,
        logoUrl: `/images/brands/${brand.slug}.svg`,
      },
      create: {
        name: brand.name,
        slug: brand.slug,
        country: brand.country,
        description: brand.description,
        isFeatured: brand.isFeatured ?? false,
        logoUrl: `/images/brands/${brand.slug}.svg`,
      },
    });
    ids.set(brand.name, row.id);
  }
  console.log(`  brands ........... ${brands.length}`);
  return ids;
}

async function seedUsers(): Promise<{ adminId: string; customerIds: string[] }> {
  const adminEmail = requireEnv('SEED_ADMIN_EMAIL');
  const adminPassword = requireEnv('SEED_ADMIN_PASSWORD');
  const customerEmail = requireEnv('SEED_CUSTOMER_EMAIL');
  const customerPassword = requireEnv('SEED_CUSTOMER_PASSWORD');

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN, password: await argon2.hash(adminPassword, ARGON2_OPTIONS) },
    create: {
      fullName: 'Platform Administrator',
      email: adminEmail,
      password: await argon2.hash(adminPassword, ARGON2_OPTIONS),
      role: Role.ADMIN,
      phone: '+10000000000',
      emailVerified: true,
    },
  });

  const primaryCustomer = await prisma.user.upsert({
    where: { email: customerEmail },
    update: { role: Role.CUSTOMER, password: await argon2.hash(customerPassword, ARGON2_OPTIONS) },
    create: {
      fullName: 'Demo Customer',
      email: customerEmail,
      password: await argon2.hash(customerPassword, ARGON2_OPTIONS),
      role: Role.CUSTOMER,
      phone: '+10000000001',
      emailVerified: true,
    },
  });

  // Additional demo customers so admin user-management and growth analytics
  // have more than a single row to display (spec §45, §48).
  const extraHash = await argon2.hash(customerPassword, ARGON2_OPTIONS);
  const extras = [
    { fullName: 'Amina Belkacem', email: 'amina.demo@carplatform.dev', locale: Locale.FR, days: 42 },
    { fullName: 'Youssef Haddad', email: 'youssef.demo@carplatform.dev', locale: Locale.AR, days: 27 },
    { fullName: 'Chen Wei', email: 'chen.demo@carplatform.dev', locale: Locale.EN, days: 12 },
    { fullName: 'Sofia Marino', email: 'sofia.demo@carplatform.dev', locale: Locale.EN, days: 4 },
  ];

  const extraIds: string[] = [];
  for (const extra of extras) {
    const createdAt = new Date(Date.now() - extra.days * 24 * 60 * 60 * 1000);
    const row = await prisma.user.upsert({
      where: { email: extra.email },
      update: {},
      create: {
        fullName: extra.fullName,
        email: extra.email,
        password: extraHash,
        role: Role.CUSTOMER,
        locale: extra.locale,
        emailVerified: true,
        createdAt,
      },
    });
    extraIds.push(row.id);
  }

  console.log(`  users ............ 1 admin + ${1 + extras.length} customers`);
  return { adminId: admin.id, customerIds: [primaryCustomer.id, ...extraIds] };
}

async function seedCars(brandIds: Map<string, string>, adminId: string): Promise<string[]> {
  const carIds: string[] = [];

  for (const [index, car] of cars.entries()) {
    const brandId = brandIds.get(car.brand);
    if (!brandId) throw new Error(`Unknown brand "${car.brand}" for car ${car.slug}`);

    // Replace the whole spec tree on re-seed so the catalogue file stays the
    // single source of truth for demo data.
    const existing = await prisma.car.findUnique({ where: { slug: car.slug }, select: { id: true } });
    if (existing) {
      await prisma.$transaction([
        prisma.carImage.deleteMany({ where: { carId: existing.id } }),
        prisma.carColor.deleteMany({ where: { carId: existing.id } }),
      ]);
    }

    const publishedAt = new Date(Date.now() - (cars.length - index) * 3 * 24 * 60 * 60 * 1000);

    const data = {
      slug: car.slug,
      brandId,
      model: car.model,
      year: car.year,
      generation: car.generation ?? null,
      trim: car.trim ?? null,
      bodyType: car.bodyType,
      segment: car.segment ?? null,
      category: car.category ?? null,
      doors: car.doors,
      seats: car.seats,
      price: new Prisma.Decimal(car.price),
      currency: 'USD',
      marketingDescription: car.marketingDescription,
      description: car.description,
      status: CarStatus.PUBLISHED,
      isFeatured: car.isFeatured ?? false,
      isDemoData: true,
      /*
       * Cleared explicitly so re-seeding restores a catalogue that testing or
       * experimentation has archived. Without this, a soft-deleted vehicle
       * stayed invisible even after a reseed, and the only fix was SQL.
       */
      deletedAt: null,
      publishedAt,
      createdById: adminId,
      createdAt: publishedAt,
    } satisfies Prisma.CarUncheckedCreateInput;

    const row = await prisma.car.upsert({
      where: { slug: car.slug },
      update: data,
      create: data,
    });

    const upsertGroup = async <T extends { carId: string }>(
      delegate: { upsert: (args: { where: { carId: string }; update: unknown; create: T }) => Promise<unknown> },
      payload: Omit<T, 'carId'>,
    ) => {
      await delegate.upsert({
        where: { carId: row.id },
        update: payload,
        create: { ...payload, carId: row.id } as T,
      });
    };

    await upsertGroup(prisma.carEngine as never, car.engine as never);
    await upsertGroup(prisma.carWheels as never, car.wheels as never);
    await upsertGroup(prisma.carExterior as never, car.exterior as never);
    await upsertGroup(prisma.carInterior as never, car.interior as never);
    await upsertGroup(prisma.carTechnology as never, car.technology as never);
    await upsertGroup(prisma.carSafety as never, car.safety as never);
    await upsertGroup(prisma.carDimensions as never, car.dimensions as never);

    // Colours (spec §13 — clickable swatches)
    const colorRows = await Promise.all(
      car.colors.map((color, order) =>
        prisma.carColor.create({
          data: {
            carId: row.id,
            kind: ColorKind.EXTERIOR,
            name: color.name,
            hexCode: color.hexCode,
            finish: color.finish ?? null,
            isDefault: color.isDefault ?? order === 0,
            sortOrder: order,
            imageUrl: `/images/cars/${car.slug}/exterior-${order + 1}.svg`,
          },
        }),
      ),
    );

    for (const [order, color] of (car.interiorColors ?? []).entries()) {
      await prisma.carColor.create({
        data: {
          carId: row.id,
          kind: ColorKind.INTERIOR,
          name: color.name,
          hexCode: color.hexCode,
          isDefault: order === 0,
          sortOrder: order,
        },
      });
    }

    // Media (spec §47 Media, §63 — local placeholder assets only)
    const alt = `${car.brand} ${car.model} ${car.year}`;
    await prisma.carImage.createMany({
      data: [
        { carId: row.id, kind: ImageKind.MAIN, url: `/images/cars/${car.slug}/main.svg`, alt: `${alt} — exterior front three-quarter view`, sortOrder: 0, colorId: colorRows[0]?.id ?? null },
        { carId: row.id, kind: ImageKind.GALLERY, url: `/images/cars/${car.slug}/gallery-1.svg`, alt: `${alt} — side profile`, sortOrder: 1 },
        { carId: row.id, kind: ImageKind.GALLERY, url: `/images/cars/${car.slug}/gallery-2.svg`, alt: `${alt} — rear three-quarter view`, sortOrder: 2 },
        { carId: row.id, kind: ImageKind.INTERIOR, url: `/images/interior/${car.slug}/dashboard.svg`, alt: `${alt} — dashboard and infotainment`, sortOrder: 3 },
        { carId: row.id, kind: ImageKind.INTERIOR, url: `/images/interior/${car.slug}/seats.svg`, alt: `${alt} — front seats`, sortOrder: 4 },
        { carId: row.id, kind: ImageKind.WHEEL, url: `/images/wheels/${car.slug}/wheel.svg`, alt: `${alt} — ${car.wheels.wheelSizeInch}-inch alloy wheel`, sortOrder: 5 },
      ],
    });

    carIds.push(row.id);
  }

  console.log(`  cars ............. ${cars.length} (all flagged isDemoData)`);
  return carIds;
}

async function seedActivity(customerIds: string[], carIds: string[], adminId: string): Promise<void> {
  const [primaryCustomer] = customerIds;

  // Favorites (spec §51) — deterministic spread across customers and cars
  let favoriteCount = 0;
  for (const [userIndex, userId] of customerIds.entries()) {
    const picks = new Set<number>();
    for (let n = 0; n < 3 + userIndex; n += 1) {
      picks.add(deterministic(userIndex * 31 + n * 7 + 1, carIds.length));
    }
    for (const pick of picks) {
      await prisma.favorite.upsert({
        where: { userId_carId: { userId, carId: carIds[pick] } },
        update: {},
        create: { userId, carId: carIds[pick] },
      });
      favoriteCount += 1;
    }
  }

  // Recently viewed (spec §52) — most recent first
  let recentCount = 0;
  for (const [userIndex, userId] of customerIds.entries()) {
    for (let n = 0; n < 5; n += 1) {
      const carId = carIds[deterministic(userIndex * 17 + n * 3 + 5, carIds.length)];
      const viewedAt = new Date(Date.now() - (n * 6 + userIndex) * 60 * 60 * 1000);
      await prisma.recentlyViewed.upsert({
        where: { userId_carId: { userId, carId } },
        update: { viewedAt },
        create: { userId, carId, viewedAt },
      });
      recentCount += 1;
    }
  }

  // Car views (spec §68) — real rows behind "most viewed cars" analytics
  const existingViews = await prisma.carView.count();
  if (existingViews === 0) {
    const views: Prisma.CarViewCreateManyInput[] = [];
    for (const [carIndex, carId] of carIds.entries()) {
      const total = 8 + deterministic(carIndex + 11, 40);
      for (let n = 0; n < total; n += 1) {
        const daysAgo = deterministic(carIndex * 13 + n, 30);
        views.push({
          carId,
          userId: n % 3 === 0 ? customerIds[deterministic(n, customerIds.length)] : null,
          anonymousId: n % 3 === 0 ? null : `demo-anon-${carIndex}-${n}`,
          viewedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - n * 37 * 60 * 1000),
        });
      }
    }
    await prisma.carView.createMany({ data: views });
    console.log(`  car views ........ ${views.length}`);
  } else {
    console.log(`  car views ........ ${existingViews} (kept)`);
  }

  // Saved comparison (spec §53)
  const existingComparison = await prisma.comparison.findFirst({ where: { userId: primaryCustomer } });
  if (!existingComparison) {
    await prisma.comparison.create({
      data: {
        userId: primaryCustomer,
        name: 'Family SUV shortlist',
        cars: { create: [0, 3, 8].map((pick, order) => ({ carId: carIds[pick], sortOrder: order })) },
      },
    });
  }

  // Orders (spec §24, §25, §54) — including one guest order to prove the
  // nullable user_id path, plus status history for the audit trail.
  const existingOrders = await prisma.order.count();
  if (existingOrders === 0) {
    const orderSpecs: { userId: string | null; carIndex: number; name: string; email: string; phone: string; status: OrderStatus; daysAgo: number }[] = [
      { userId: customerIds[0], carIndex: 0, name: 'Demo Customer', email: 'customer@carplatform.dev', phone: '+10000000001', status: OrderStatus.PENDING, daysAgo: 1 },
      { userId: customerIds[1], carIndex: 3, name: 'Amina Belkacem', email: 'amina.demo@carplatform.dev', phone: '+10000000002', status: OrderStatus.CONTACTED, daysAgo: 5 },
      { userId: customerIds[2], carIndex: 9, name: 'Youssef Haddad', email: 'youssef.demo@carplatform.dev', phone: '+10000000003', status: OrderStatus.CONFIRMED, daysAgo: 11 },
      { userId: customerIds[3], carIndex: 14, name: 'Chen Wei', email: 'chen.demo@carplatform.dev', phone: '+10000000004', status: OrderStatus.COMPLETED, daysAgo: 24 },
      { userId: null, carIndex: 6, name: 'Guest Enquiry', email: 'guest.demo@example.com', phone: '+10000000005', status: OrderStatus.CANCELLED, daysAgo: 17 },
    ];

    for (const [index, spec] of orderSpecs.entries()) {
      const carId = carIds[spec.carIndex];
      const color = await prisma.carColor.findFirst({
        where: { carId, kind: ColorKind.EXTERIOR, isDefault: true },
      });
      const createdAt = new Date(Date.now() - spec.daysAgo * 24 * 60 * 60 * 1000);

      const order = await prisma.order.create({
        data: {
          reference: `DEMO-${String(index + 1).padStart(4, '0')}`,
          userId: spec.userId,
          carId,
          buyerName: spec.name,
          buyerEmail: spec.email,
          buyerPhone: spec.phone,
          selectedColorId: color?.id ?? null,
          selectedColorName: color?.name ?? null,
          status: spec.status,
          createdAt,
          updatedAt: createdAt,
        },
      });

      await prisma.orderStatusHistory.create({
        data: { orderId: order.id, fromStatus: null, toStatus: OrderStatus.PENDING, changedById: null, note: 'Order submitted', createdAt },
      });
      if (spec.status !== OrderStatus.PENDING) {
        await prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: OrderStatus.PENDING,
            toStatus: spec.status,
            changedById: adminId,
            note: 'Demo status transition',
            createdAt: new Date(createdAt.getTime() + 6 * 60 * 60 * 1000),
          },
        });
      }
    }
    console.log(`  orders ........... ${orderSpecs.length} (1 guest order, with status history)`);
  } else {
    console.log(`  orders ........... ${existingOrders} (kept)`);
  }

  console.log(`  favorites ........ ${favoriteCount}`);
  console.log(`  recently viewed .. ${recentCount}`);
}

async function main(): Promise<void> {
  console.log('\nSeeding car-platform development data (spec §73)\n');
  await seedSettings();
  const brandIds = await seedBrands();
  const { adminId, customerIds } = await seedUsers();
  const carIds = await seedCars(brandIds, adminId);

  /*
   * Invented activity is off unless it is asked for.
   *
   * This block used to write 7,647 car views, favourites, browsing history and
   * five orders from people who do not exist, and the administration reported
   * all of it as though it had happened. On a site that has never been
   * published, the true number of visitors is zero, and a dashboard that says
   * anything else cannot be used to make a decision.
   *
   * It is still available for working on the customer and analytics screens,
   * where something has to be on the page:
   *
   *   SEED_DEMO_ACTIVITY=1 npm run db:seed
   *
   * `npm run analytics:reset` removes it again.
   */
  if (process.env.SEED_DEMO_ACTIVITY === '1') {
    await seedActivity(customerIds, carIds, adminId);
  } else {
    console.log('  activity ......... skipped (SEED_DEMO_ACTIVITY=1 to invent views and orders)');
  }

  console.log('\nDone. Demo vehicles are flagged isDemoData=true.\n');
}

main()
  .catch((error) => {
    console.error('\nSeed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
