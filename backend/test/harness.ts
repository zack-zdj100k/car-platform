import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HttpAdapterHost } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  http: () => request.SuperTest<request.Test>;
}

/**
 * Boots the real application against the test database.
 *
 * Mirrors main.ts — same global pipe and exception filter — so tests exercise
 * the same validation and error shapes the deployed API uses.
 */
export async function createTestApp(): Promise<TestContext> {
  // Rate limiting is skipped under NODE_ENV=test (see AppModule); the limiter
  // itself is verified against the running server during the security audit.
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));

  await app.init();

  const prisma = app.get(PrismaService);

  return {
    app,
    prisma,
    http: () => request(app.getHttpServer() as App) as unknown as request.SuperTest<request.Test>,
  };
}

/** Wipes every table between suites so tests never depend on each other. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      email_logs, order_status_history, orders,
      comparison_cars, comparisons, recently_viewed, favorites, car_views,
      car_translations, car_images, car_colors,
      car_dimensions, car_safeties, car_technologies, car_interiors,
      car_exteriors, car_wheels, car_engines, cars, brands,
      password_reset_tokens, refresh_tokens, users, settings
    RESTART IDENTITY CASCADE;
  `);
}

export const strongPassword = 'TestPass123';

/** Registers a customer and returns its access token. */
export async function registerCustomer(
  context: TestContext,
  email: string,
  fullName = 'Test Customer',
): Promise<{ token: string; id: string; cookie: string }> {
  const response = await context
    .http()
    .post('/api/auth/register')
    .send({ fullName, email, password: strongPassword, confirmPassword: strongPassword, acceptTerms: true })
    .expect(201);

  const body = response.body as { accessToken: string; user: { id: string } };
  const setCookie = response.headers['set-cookie'] as unknown as string[] | undefined;

  return {
    token: body.accessToken,
    id: body.user.id,
    cookie: setCookie?.[0]?.split(';')[0] ?? '',
  };
}

/** Promotes a user to ADMIN directly, then signs in to get an admin token. */
export async function createAdmin(
  context: TestContext,
  email = 'admin@test.local',
): Promise<{ token: string; id: string }> {
  const customer = await registerCustomer(context, email, 'Test Admin');
  await context.prisma.user.update({ where: { id: customer.id }, data: { role: 'ADMIN' } });

  const response = await context
    .http()
    .post('/api/auth/login')
    .send({ email, password: strongPassword })
    .expect(200);

  const body = response.body as { accessToken: string };
  return { token: body.accessToken, id: customer.id };
}

/** Minimal published car with one colour, for tests that need something to act on. */
export async function seedCar(
  context: TestContext,
  overrides: { model?: string; price?: string; brandName?: string } = {},
): Promise<{ id: string; slug: string; colorId: string; brandId: string }> {
  const brandName = overrides.brandName ?? 'TestBrand';
  const slugBase = brandName.toLowerCase();

  /*
   * Concurrent seedCar calls share a brand, and two simultaneous upserts race
   * on the unique slug. Catching the conflict and re-reading is the correct
   * handling for an upsert under concurrency.
   */
  let brand = await context.prisma.brand.findUnique({ where: { slug: slugBase } });
  if (!brand) {
    try {
      brand = await context.prisma.brand.create({ data: { name: brandName, slug: slugBase } });
    } catch {
      brand = await context.prisma.brand.findUniqueOrThrow({ where: { slug: slugBase } });
    }
  }

  const model = overrides.model ?? 'TestModel';
  const car = await context.prisma.car.create({
    data: {
      slug: `${slugBase}-${model.toLowerCase().replace(/\s+/g, '-')}-2024`,
      brandId: brand.id,
      model,
      year: 2024,
      bodyType: 'SUV',
      price: overrides.price ?? '25000.00',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      engine: { create: { fuelType: 'PETROL', powerHp: 150 } },
      colors: { create: { name: 'Test White', hexCode: '#FFFFFF', isDefault: true } },
      images: { create: { kind: 'MAIN', url: '/images/test.svg', alt: 'test' } },
    },
    include: { colors: true },
  });

  return { id: car.id, slug: car.slug, colorId: car.colors[0].id, brandId: brand.id };
}
