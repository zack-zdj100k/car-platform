import type { Env } from './env.validation';

/**
 * Typed configuration namespaces derived from validated environment variables.
 */
export const appConfig = (env: Env) => ({
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  port: env.BACKEND_PORT,
  apiPrefix: env.API_PREFIX,
  corsOrigins: env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  siteUrl: env.NEXT_PUBLIC_SITE_URL,
});

export const authConfig = (env: Env) => ({
  accessSecret: env.JWT_ACCESS_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,
  accessTtl: env.JWT_ACCESS_TTL,
  refreshTtl: env.JWT_REFRESH_TTL,
  cookieDomain: env.COOKIE_DOMAIN,
  cookieSecure: env.COOKIE_SECURE,
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackUrl: env.GOOGLE_CALLBACK_URL,
    /** Spec §3 — the provider stays disabled until credentials are supplied. */
    enabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL),
  },
});

export const mailConfig = (env: Env) => ({
  provider: env.MAIL_PROVIDER,
  host: env.MAIL_HOST,
  port: env.MAIL_PORT,
  secure: env.MAIL_SECURE,
  user: env.MAIL_USER,
  password: env.MAIL_PASSWORD,
  from: env.MAIL_FROM,
  adminEmail: env.ADMIN_NOTIFICATION_EMAIL,
});

export const ordersConfig = (env: Env) => ({
  requireAuth: env.REQUIRE_AUTH_FOR_ORDERS,
});

export const uploadConfig = (env: Env) => ({
  dir: env.UPLOAD_DIR,
  maxBytes: env.MAX_UPLOAD_MB * 1024 * 1024,
});

export const throttleConfig = (env: Env) => ({
  ttl: env.THROTTLE_TTL,
  limit: env.THROTTLE_LIMIT,
});

export const configuration = (env: Env) => ({
  app: appConfig(env),
  auth: authConfig(env),
  mail: mailConfig(env),
  orders: ordersConfig(env),
  upload: uploadConfig(env),
  throttle: throttleConfig(env),
});

export type Configuration = ReturnType<typeof configuration>;
