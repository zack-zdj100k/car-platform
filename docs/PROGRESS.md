# Implementation Progress

Phases follow the development protocol in Master Prompt §76. A feature is only
marked complete when it is implemented, connected, validated, tested,
error-handled, accessible, responsive, security-checked and verified (§77).

| Phase | Status |
| ----- | ------ |
| 0 — Analysis | ✅ Complete |
| 1 — Architecture + Database | ✅ Complete |
| 2 — Backend + REST API | ✅ Complete |
| 3 — Authentication | 🟡 Implemented in Phase 2; Google OAuth awaits credentials |
| 4 — Cars system | ⬜ Not started |
| 5 — Customer dashboard | ⬜ Not started |
| 6 — Admin dashboard | ⬜ Not started |
| 7 — Frontend / design | ⬜ Not started |
| 8 — Full integration | ⬜ Not started |
| 9 — Testing | ⬜ Not started |
| 10 — Security audit | ⬜ Not started |
| 11 — Accessibility audit | ⬜ Not started |
| 12 — Performance audit | ⬜ Not started |
| 13 — Final audit | ⬜ Not started |

---

## Phase 0 — Analysis ✅

The project directory contained only the specification documents and three
`kling_*.mov` video clips. No `package.json`, Next.js config, Tailwind config,
shadcn setup, backend or database existed, and it was not a git repository.
Nothing pre-existing was deleted or modified.

Toolchain on the development machine: Node 25.6.0, npm 11.8.0, git 2.50.1.
PostgreSQL and Docker were absent; PostgreSQL 17.11 was installed via Homebrew
because the specification mandates it.

Eight routing conflicts between the specification documents were identified and
resolved without discarding either document's URLs — see
[DECISIONS.md](DECISIONS.md) Part 1.

## Phase 1 — Architecture + Database ✅

**Implemented**

- npm workspaces monorepo: `frontend/`, `backend/`, `prisma/`, `docs/`
- Git repository initialised on `main` with a complete `.gitignore`
- PostgreSQL 17 running as a service, with a dedicated `car_platform` role and
  separate `car_platform_dev` / `car_platform_test` databases
- Prisma schema: **24 tables, 76 indexes, 31 foreign keys**
- Two migrations applied; database reproducible from empty
- Idempotent seed: 14 brands, 17 fully specified vehicles, 6 users, 85 colours,
  102 image records, 22 favorites, 25 recently-viewed rows, 485 car views,
  1 saved comparison, 5 orders across all five statuses
- `.env.example` documenting every variable, `.env` generated with real local
  credentials and git-ignored
- Documentation: README, ARCHITECTURE, DATABASE, DECISIONS, ENVIRONMENT, PROGRESS

**Verified**

| Check | Result |
| ----- | ------ |
| `prisma validate` | Schema valid |
| `prisma migrate dev` | Both migrations applied cleanly |
| `tsc --noEmit` | No errors |
| Seed run twice | Idempotent, no duplicates |
| All 17 cars have all 7 spec groups | 0 missing |
| Duplicate favorite | Rejected by unique constraint |
| Duplicate recently-viewed | Rejected by unique constraint |
| Duplicate comparison entry | Rejected by unique constraint |
| Delete car referenced by an order | **Refused** by `ON DELETE RESTRICT` |
| Guest order (`user_id IS NULL`) | Stored successfully |
| "Most viewed cars" aggregate | Returns real counts from `car_views` |

**Deferred to later phases**

- Placeholder image assets for the seeded `/images/...` paths are created when
  the frontend is scaffolded in Phase 7. The database references the paths now so
  no code change is needed then.
- `TEST_DATABASE_URL` points at a created but empty `car_platform_test`; it is
  migrated by the Phase 9 test harness.

**Not started, and blocked on owner input** — see [DECISIONS.md](DECISIONS.md)
Part 2: the two provided React components, the logo, the hero video selection,
the social URLs, and the Google OAuth credentials.

## Phase 2 — Backend + REST API ✅

**Implemented**

- NestJS application with 13 modules: `auth`, `users`, `cars` (+ `brands`),
  `favorites`, `recently-viewed`, `comparisons`, `orders`, `analytics`,
  `notifications`, `settings`, `dashboard`, `health`, `prisma`
- **69 REST endpoints** — see [API.md](API.md)
- Fail-fast environment validation with Zod: the app refuses to boot on a
  missing or malformed variable, and refuses to start in production with
  placeholder JWT secrets
- Deny-by-default authorization: authentication is a global guard, and a route is
  public only when explicitly marked. Role checks run server-side on every
  request
- Argon2id password hashing; rotating refresh tokens stored as SHA-256 digests,
  with reuse detection that revokes the whole token family
- Single exception filter mapping Prisma error codes to safe HTTP responses;
  internal details are logged, never returned
- Email module with a pluggable provider, HTML-escaped templates, and delivery
  logging so a mail outage can never lose an order
- Rate limiting globally and per sensitive route
- Swagger reference at `/api/docs` in development

**Verified** — 126 automated checks, all passing

| Area | Checks |
| ---- | ------ |
| Public catalogue: pagination, sorting, all filters, search, facets, detail | 24 |
| Validation: bad enums, oversized pageSize, inverted ranges, unknown fields | 8 |
| Authentication: registration rules, login, `/me`, refresh rotation, logout | 22 |
| Authorization: 5 admin routes × (customer 403 / anonymous 401 / admin 200) | 15 |
| Favorites and view history, including idempotency and de-duplication | 11 |
| Comparisons, including the max-cars limit and cross-customer isolation | 9 |
| Orders: submission, snapshots, every legal and illegal status transition | 16 |
| Admin car management: nested spec groups, publish cycle, archive-on-delete | 16 |
| Analytics from real rows; settings; session teardown | 15 |

Notable confirmations: a draft vehicle is invisible publicly but readable by an
admin; a replayed refresh token revokes the whole family; one customer cannot
read another's order or comparison (403); deleting a vehicle that has orders
**archives** it and the order survives; a colour belonging to a different vehicle
is rejected on order submission.

**Defect found and fixed during verification.** The signup rate limit counted
requests rejected for validation, so a customer who mistyped the password
confirmation five times would have been locked out for fifteen minutes. The limit
is now 12 per 15 minutes, which absorbs honest form errors while still blocking
bulk account creation.

**Also fixed:** the `nodemailer` dependency carried six high-severity advisories
(SMTP command injection, header injection, TLS validation). Upgraded to 9.0.5,
which clears all of them.

**Checks run**

| Command | Result |
| ------- | ------ |
| `tsc --noEmit` | 0 errors |
| `eslint --max-warnings 0` | 0 problems, with `recommendedTypeChecked` enabled |
| `nest build` | Succeeds |
| API smoke suite | 126 / 126 |

**Deferred**

- Google OAuth is implemented and wired but stays inactive until credentials are
  supplied; the strategy is registered conditionally so the app boots without it
- Image upload endpoints arrive with the admin car form in Phase 6
- Jest unit and e2e suites are Phase 9; the 126 checks above ran against the
  live API
