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
  /**
   * Set by the host, not by us: Render, Railway and Heroku all hand the process
   * a port and route to it. It wins over BACKEND_PORT, which is the one a
   * developer sets on their own machine.
   */
  PORT: z.coerce.number().int().positive().optional(),
  API_PREFIX: z.string().default('api'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  /**
   * How many proxies sit in front of this process.
   *
   * Express reads the client's address from X-Forwarded-For, and it will only
   * believe as many entries as it is told to trust — trusting the whole header
   * would let a caller write their own address into it and walk past the rate
   * limiter. One for a single hosting proxy; two when the site forwards the
   * browser's requests through its own origin as well.
   */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  /**
   * Left empty the cookie is bound to the host that set it, which is what a
   * deployment with the API and the site on unrelated domains needs. Set it to
   * a shared parent — `.example.com` — only when they are subdomains of one.
   */
  COOKIE_DOMAIN: z.string().default(''),
  COOKIE_SECURE: booleanish.default(false),
  /**
   * `lax` while the site and the API share a site, as they do on one machine.
   * A browser will not send a `lax` cookie on a request to another site at all,
   * so a site on Vercel talking to an API on Render — different registrable
   * domains — needs `none`, which browsers only honour over HTTPS.
   */
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CALLBACK_URL: z.string().default(''),

  MAIL_PROVIDER: z.enum(['smtp', 'console']).default('console'),
  MAIL_HOST: z.string().default(''),
  MAIL_PORT: z.coerce.number().int().default(587),
  MAIL_SECURE: booleanish.default(false),
  MAIL_USER: z.string().default(''),
  MAIL_PASSWORD: z.string().default(''),
  MAIL_FROM: z.string().default('ZODIC CAR <no-reply@example.com>'),
  ADMIN_NOTIFICATION_EMAIL: z.string().email().default('admin@example.com'),

  NEXT_PUBLIC_SITE_URL: z.string().default('http://localhost:3000'),

  REQUIRE_AUTH_FOR_ORDERS: booleanish.default(true),

  /**
   * Where uploaded files are kept.
   *
   * `local` writes them next to the API, which is right on a laptop and on a
   * server with a permanent disk. `cloudinary` sends them to Cloudinary, which
   * is what a host without one needs: a container's filesystem is erased on
   * every deploy and every restart, so a catalogue built on it fills with
   * broken pictures within a day.
   */
  UPLOAD_DRIVER: z.enum(['local', 'cloudinary']).default('local'),

  /** cloudinary://<key>:<secret>@<cloud name> — from the Cloudinary console. */
  CLOUDINARY_URL: z.string().default(''),

  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(8),
  /** Videos are an order of magnitude larger than photographs. */
  MAX_VIDEO_UPLOAD_MB: z.coerce.number().int().positive().default(80),

  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
})
  .refine((env) => env.COOKIE_SAME_SITE !== 'none' || env.COOKIE_SECURE, {
    message:
      'COOKIE_SAME_SITE=none requires COOKIE_SECURE=true — a browser silently drops a cross-site cookie that is not Secure, and nobody would stay signed in',
    path: ['COOKIE_SAME_SITE'],
  })
  .refine((env) => env.UPLOAD_DRIVER !== 'cloudinary' || env.CLOUDINARY_URL !== '', {
    message:
      'UPLOAD_DRIVER=cloudinary needs CLOUDINARY_URL — copy it from the Cloudinary dashboard. Refusing to start rather than accepting photographs and dropping them.',
    path: ['CLOUDINARY_URL'],
  })
  .refine((env) => env.CLOUDINARY_URL === '' || env.CLOUDINARY_URL.startsWith('cloudinary://'), {
    message:
      "CLOUDINARY_URL must be the whole value from the Cloudinary dashboard, starting with 'cloudinary://'. If it was copied as CLOUDINARY_URL=cloudinary://... then the name of the variable has been pasted into its own value — remove everything up to and including the '='.",
    path: ['CLOUDINARY_URL'],
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
