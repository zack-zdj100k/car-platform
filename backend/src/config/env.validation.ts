import { z } from 'zod';

/**
 * Fail-fast environment validation (spec §67).
 *
 * The application refuses to boot with a missing or malformed variable rather
 * than failing unpredictably at request time.
 */
const booleanish = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => value === true || value === 'true' || value === '1');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  BACKEND_PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default('api'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: booleanish.default(false),

  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CALLBACK_URL: z.string().default(''),

  MAIL_PROVIDER: z.enum(['smtp', 'console']).default('console'),
  MAIL_HOST: z.string().default(''),
  MAIL_PORT: z.coerce.number().int().default(587),
  MAIL_SECURE: booleanish.default(false),
  MAIL_USER: z.string().default(''),
  MAIL_PASSWORD: z.string().default(''),
  MAIL_FROM: z.string().default('ZODIK CAR <no-reply@example.com>'),
  ADMIN_NOTIFICATION_EMAIL: z.string().email().default('admin@example.com'),

  NEXT_PUBLIC_SITE_URL: z.string().default('http://localhost:3000'),

  REQUIRE_AUTH_FOR_ORDERS: booleanish.default(true),

  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(8),
  /** Videos are an order of magnitude larger than photographs. */
  MAX_VIDEO_UPLOAD_MB: z.coerce.number().int().positive().default(80),

  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration.\n${details}\n\nCopy .env.example to .env and complete it.`,
    );
  }

  // A production deployment must never ship the example secrets.
  if (result.data.NODE_ENV === 'production') {
    const weak = ['change-me', 'change-me-too'];
    if (weak.includes(result.data.JWT_ACCESS_SECRET) || weak.includes(result.data.JWT_REFRESH_SECRET)) {
      throw new Error('Refusing to start in production with placeholder JWT secrets.');
    }
    if (result.data.JWT_ACCESS_SECRET === result.data.JWT_REFRESH_SECRET) {
      throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ.');
    }
  }

  return result.data;
}
