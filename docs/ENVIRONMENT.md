# Environment Variables

Copy `.env.example` to `.env`. Never commit `.env` (§67, §70).

## Database

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `DATABASE_URL` | yes | PostgreSQL connection string used by Prisma |
| `TEST_DATABASE_URL` | for tests | Separate database for integration and e2e runs |

## Backend

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `NODE_ENV` | `development` | Runtime mode |
| `BACKEND_PORT` | `4000` | NestJS listen port |
| `API_PREFIX` | `api` | Global route prefix |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |

## Authentication

| Variable | Description |
| -------- | ----------- |
| `JWT_ACCESS_SECRET` | Access-token signing secret. Generate with `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret. Must differ from the access secret |
| `JWT_ACCESS_TTL` | Access-token lifetime, e.g. `15m` |
| `JWT_REFRESH_TTL` | Refresh-token lifetime, e.g. `30d` |
| `COOKIE_DOMAIN` | Cookie domain for refresh tokens |
| `COOKIE_SECURE` | `true` in production (HTTPS only) |

## Google OAuth

| Variable | Description |
| -------- | ----------- |
| `GOOGLE_CLIENT_ID` | Leave **empty to disable** Google sign-in entirely |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Must match the redirect URI registered in Google Cloud |

## Email

| Variable | Description |
| -------- | ----------- |
| `MAIL_PROVIDER` | `smtp` to send, `console` to log instead (development default) |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_SECURE` | SMTP connection |
| `MAIL_USER` / `MAIL_PASSWORD` | SMTP credentials — never referenced from frontend code |
| `MAIL_FROM` | Sender identity |
| `ADMIN_NOTIFICATION_EMAIL` | Recipient of new-order notifications (§26) |

## Frontend

| Variable | Description |
| -------- | ----------- |
| `NEXT_PUBLIC_API_URL` | Base API URL exposed to the browser |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for metadata and links |

Only `NEXT_PUBLIC_*` variables reach the browser. Nothing secret may use that prefix.

## Behaviour

| Variable | Description |
| -------- | ----------- |
| `REQUIRE_AUTH_FOR_ORDERS` | Seeds the `orders.requireAuth` setting. `true` follows the system graph; `false` permits guest orders. See DECISIONS D-1.2 |
| `UPLOAD_DIR` / `MAX_UPLOAD_MB` | Image upload storage and size limit |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | Rate-limit window and request cap (§57, §67) |

## Seed credentials (development only)

| Variable | Description |
| -------- | ----------- |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Admin test account |
| `SEED_CUSTOMER_EMAIL` / `SEED_CUSTOMER_PASSWORD` | Customer test account |

The seed script fails loudly rather than falling back to a default password.
Change these before any shared or public deployment.
