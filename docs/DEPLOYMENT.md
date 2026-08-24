# Deployment

The platform is two deployable units sharing one PostgreSQL database:

```
Browser ──► Next.js (frontend) ──► NestJS (API) ──► Prisma ──► PostgreSQL
```

They can run on separate hosts. The only requirement is that the API's
`CORS_ORIGINS` lists the frontend's public origin, and the frontend's
`NEXT_PUBLIC_API_URL` points at the API.

## Before deploying

1. **Generate fresh secrets.** Never reuse development values.

   ```bash
   openssl rand -base64 48   # JWT_ACCESS_SECRET
   openssl rand -base64 48   # JWT_REFRESH_SECRET  (must differ)
   ```

   The API refuses to start in production with placeholder secrets, or if the
   two match.

2. **Set `NODE_ENV=production` in the runtime environment**, not in `.env`.
   Setting it in `.env` and sourcing that file before a build makes Next resolve
   a development React runtime and the build fails while prerendering.

3. **Set `COOKIE_SECURE=true`** so refresh cookies are sent only over HTTPS.

4. **Point `COOKIE_DOMAIN` at the real domain.** If the API and frontend are on
   different subdomains, use the shared parent (`.example.com`) so the refresh
   cookie is sent to the API.

5. **Configure a real mail provider.** `MAIL_PROVIDER=console` only logs.
   Set `smtp` with host, credentials and `ADMIN_NOTIFICATION_EMAIL`.

6. **Decide on the demo catalogue.** The seed exists for development. Either
   skip it in production, or remove the demo rows afterwards:

   ```sql
   DELETE FROM cars WHERE is_demo_data = true;
   ```

   Vehicles referenced by an order cannot be deleted; archive those instead.

## Database

```bash
npm run prisma:deploy   # applies migrations — never `migrate dev` in production
```

`prisma migrate deploy` applies pending migrations without prompting and never
resets data. The schema is reproducible from an empty database: verified by
creating one, migrating and seeding from scratch.

Back up before every deployment that includes a migration.

## API (NestJS)

```bash
npm ci
npm run prisma:generate
npm run build --workspace backend
NODE_ENV=production node backend/dist/main.js
```

Serve behind a reverse proxy terminating TLS. The process listens on
`BACKEND_PORT` (default 4000) and exposes `GET /api/health`, which returns 503
when the database is unreachable — use it as the readiness probe.

Swagger is served at `/api/docs` **only outside production**.

## Frontend (Next.js)

```bash
npm ci
npm run build --workspace frontend
npm run start --workspace frontend
```

`NEXT_PUBLIC_*` values are inlined at build time, so the build must run with the
production API URL already set — changing it afterwards requires a rebuild.

## Environment checklist

| Variable | Production value |
| -------- | ---------------- |
| `NODE_ENV` | `production`, from the runtime |
| `DATABASE_URL` | Production database, with TLS |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Freshly generated, different from each other |
| `COOKIE_SECURE` | `true` |
| `COOKIE_DOMAIN` | The real domain |
| `CORS_ORIGINS` | The frontend's public origin only |
| `MAIL_PROVIDER` | `smtp` |
| `ADMIN_NOTIFICATION_EMAIL` | Where new-order notifications go |
| `NEXT_PUBLIC_API_URL` | The public API URL |
| `NEXT_PUBLIC_SITE_URL` | The public site URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Only if Google sign-in is wanted; empty disables it cleanly |
| `SEED_*` | Not needed in production |

## After deploying

```bash
curl https://api.example.com/api/health
```

Then confirm: the home page renders, the cars listing returns vehicles, sign-in
works, and an order submission reaches the admin panel and sends mail. The
`/admin/analytics` page reports email delivery health, so a silent mail failure
is visible rather than lost.

## Creating the first administrator

Registration always creates a `CUSTOMER`; the role cannot be set through the
API. Promote the first admin directly, once:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
```

After that, admins are managed from `/admin/users`. The API refuses to remove
the last active administrator, and an admin cannot demote or suspend themselves.

## Operational notes

- **Rate limits** default to 120 requests/minute per IP, with stricter limits on
  login, registration, password reset and order submission. Behind a proxy, make
  sure the real client IP reaches the app (`trust proxy`) or every request will
  appear to come from one address.
- **Refresh tokens** rotate on use. A token replayed more than 30 seconds after
  rotation revokes every session for that user, on the assumption of theft.
- **Deleting a vehicle** that has orders archives it instead, preserving order
  history. This is deliberate and enforced by a foreign key.
