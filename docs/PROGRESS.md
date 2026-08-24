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
| 4 — Cars system | ✅ Complete |
| 5 — Customer dashboard | ✅ Complete |
| 6 — Admin dashboard | ✅ Complete |
| 7 — Frontend / design | ✅ Complete |
| 8 — Full integration | ✅ Complete |
| 9 — Testing | ✅ Complete |
| 10 — Security audit | ✅ Complete |
| 11 — Accessibility audit | ✅ Complete |
| 12 — Performance audit | ✅ Complete |
| 13 — Final audit | ✅ Complete |

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

## Phases 4–8 — Frontend, dashboards and full integration ✅

**Implemented — 22 routes, all server-rendered on demand**

| Group | Routes |
| ----- | ------ |
| Public | `/`, `/cars`, `/car/[id]`, `/car/[id]/order`, `/about` |
| Auth | `/login`, `/signup` |
| Customer 🔒 | `/dashboard`, `/favorites`, `/recent`, `/compare`, `/orders`, `/profile` |
| Admin 🔐 | `/admin/dashboard`, `/cars`, `/cars/add`, `/cars/[id]/edit`, `/users`, `/orders`, `/analytics`, `/settings` |

Every master-prompt URL variant redirects to the route map's canonical path, so
links from both specification documents work.

**Foundation**

- Next.js 16, React 19, Tailwind 4, shadcn/ui (23 primitives)
- One design system platform-wide (spec §59): light and dark tokens, dark green
  hero environment, consistent radius, shadow and type scale
- FR / AR / EN with right-to-left Arabic. Locale lives in a cookie and is read
  server-side, so the first paint is already in the right language and direction
- Typed service layer — no component calls `fetch` directly (spec §58)
- Loading, empty, error and success states everywhere (spec §72)

**Feature coverage**

- Home: video hero with poster fallback, six-part features showcase, featured
  vehicles, §33 statistics labelled as marketing content
- Cars: search, brand/model/year/price/body-type/fuel filters, seven sort
  orders, pagination — all held in the URL so a filtered view is shareable
- Car detail: gallery, clickable colour swatches, and all eight specification
  groups rendered only from stored data (spec §14)
- Order: Zod-validated form, colour carried from the detail page, success state
  with the reference, and an explicit "no payment is taken" notice
- Customer dashboard: overview with four live counts, favourites, view history,
  comparison table across 27 attributes, orders, profile with password change
- Admin: overview with real aggregates and daily charts, car table with
  publish/unpublish/delete, the full §47 car form, user management, order
  management with only the legal status transitions offered, analytics
  including email-delivery health, and the settings editor

**Verified in the running application**

| Check | Result |
| ----- | ------ |
| `tsc --noEmit` | 0 errors |
| `eslint --max-warnings 0` | Clean |
| `next build` | 22 routes compiled |
| Home page | Hero video plays, 12 images, 0 broken |
| Cars listing | 17 vehicles, filters and pagination against real data |
| Car detail | 8 spec sections, 6 gallery images, 4 colour swatches |
| Customer sign-in | Redirects to `/dashboard`, shows 3/3/1/1 real counts |
| Admin sign-in | Redirects to `/admin/dashboard`, shows 17/5/22/5 |
| Customer visiting `/admin` | Redirected away |
| Admin cars table | 17 rows, every one flagged as demo data |
| Admin orders | 5 orders across all 5 statuses, guest order marked |
| Admin settings | 6 groups; social URLs empty, never invented |

**Defects found and fixed**

- Delayed `motion` animations were cancelled when `useReducedMotion` resolved,
  leaving the hero headline at `opacity: 0`. The hero entrance is now pure CSS,
  so it renders even if JavaScript never runs
- The hero video played but stayed invisible when served from cache, because
  `canplay` had fired before React attached the handler
- Four hooks violated React 19's cascading-render rules; scroll, client
  detection and localStorage now use `useSyncExternalStore`, and `useAsync`
  derives its loading state instead of setting it from an effect
- Helper components were being defined inside render in the admin dashboard and
  the car form, which remounted their subtrees — and would have dropped focus
  mid-typing in the form. Both are hoisted to module scope

**Deferred**

- Jest and Playwright suites are Phase 9

*(Image upload was later built — see below.)*

## Phase 9 — Testing ✅

**160 automated tests, all passing**

| Suite | Tests | Covers |
| ----- | ----- | ------ |
| `backend/src/**/*.spec.ts` | 24 | Slug generation, durations, token hashing, order references, Argon2id hashing |
| `test/auth.e2e-spec.ts` | 22 | Registration rules, login, session rotation, replay handling, password reset |
| `test/authorization.e2e-spec.ts` | 26 | Six admin routes × anonymous/customer/admin, ownership checks, self-lockout guards |
| `test/cars.e2e-spec.ts` | 20 | Listing, filters, search, sort, facets, CRUD, publish cycle, archive-on-delete |
| `test/customer-features.e2e-spec.ts` | 18 | Favorites, view history, comparisons, dashboard, profile |
| `test/orders.e2e-spec.ts` | 19 | Submission, snapshots, guest path, every legal and illegal transition |
| `test/journey.e2e-spec.ts` | 16 | The complete §71 journey as one continuous sequence |
| `frontend/e2e/journey.spec.ts` | 15 | Browser flows: home, cars, filters, detail, i18n, guards, order, admin |

Integration tests run against a dedicated `car_platform_test` database and
truncate between suites, so no test depends on another. Playwright drives the
real browser against the real API — nothing is mocked, so a passing run proves
the whole chain from browser to PostgreSQL.

**Defect found and fixed: concurrent refresh logged users out**

The end-to-end run surfaced a real bug the manual checks had missed. Refresh
tokens rotate on every use, and any replay revoked the entire token family. But
two refreshes legitimately fire at once — React StrictMode double-mounts in
development, a user opens a second tab, or a navigation overlaps an in-flight
request. The second call presented an already-rotated token, was read as theft,
and signed the user out of every session.

Fixed on both sides:

- The client now makes refresh **single-flight**, so concurrent callers share
  one request rather than racing.
- The server distinguishes a race from theft: a token replayed within 30 seconds
  of rotation is refused without touching the family, while replay after that
  window still burns every session. Both paths are covered by tests.

**Commands**

```bash
npm test                    # unit tests, both workspaces
npm run test:e2e            # Playwright, needs both servers running
npm run test --workspace backend
npx jest --config ./test/jest-e2e.json --workspace backend
```

Rate limiting is skipped under `NODE_ENV=test`, since every request in a suite
comes from one address; the limiter is verified against the running server in
the security audit instead.

## Phases 10–12 — Audits ✅

Full results in [AUDITS.md](AUDITS.md) and [PERFORMANCE.md](PERFORMANCE.md).

| Audit | Result |
| ----- | ------ |
| Security | 42 live probes passing; 0 dependency vulnerabilities |
| Accessibility | 18 checks passing; 4 real violations found and fixed |
| Performance | All budgets met — worst FCP 264 ms, CLS 0 on every page |

Index coverage was verified against a 50,000-vehicle fixture, since seed volume
would not exercise the planner. One scaling limit was measured and documented
rather than papered over: ranking most-viewed vehicles costs 157 ms at 200,000
view rows and grows with the table. Forcing an index path was tested and is
slower, so the fix at real volume is a rollup table, not an index.

## Phase 13 — Final audit ✅

Everything below was executed, not reviewed.

### Build, types and lint

| Check | Result |
| ----- | ------ |
| `npm run build` (both workspaces) | Succeeds |
| `npm run typecheck` | 0 errors |
| `npm run lint` (`--max-warnings 0`) | Clean in both workspaces |

### Tests — 178 total, all passing

| Suite | Count |
| ----- | ----- |
| Backend unit | 24 |
| Backend integration | 121 |
| End-to-end (browser) | 33 |

### Database reproducible from empty (spec §74)

A brand-new database was created, migrated and seeded from scratch: 25 tables,
17 vehicles, 14 brands, 5 orders. The scratch database was then dropped.

### Routes

All seven public routes return 200. All six master-prompt URL variants redirect
to the route map's canonical paths, so links from either document work:

| From | To |
| ---- | -- |
| `/sign-in` → `/login` | 308 |
| `/sign-up` → `/signup` | 308 |
| `/cars/:id` → `/car/:id` | 308 |
| `/dashboard/recently-viewed` → `/dashboard/recent` | 308 |
| `/admin/cars/new` → `/admin/cars/add` | 308 |
| `/admin` → `/admin/dashboard` | 307 |

An unknown route returns 404.

### Data integrity

The development database holds exactly what the seed created — 17 cars, 6 users,
5 orders, 22 favourites. Artifacts from end-to-end and audit runs were removed,
and the 50,000-row performance fixture was truncated from the test database.

### Definition of done (spec §77)

| Requirement | Evidence |
| ----------- | -------- |
| Implemented | 69 API endpoints, 22 frontend routes |
| Connected | End-to-end tests drive a browser through to PostgreSQL, nothing mocked |
| Validated | DTO validation server-side, Zod client-side, unknown properties rejected |
| Tested | 178 automated tests |
| Error-handled | Loading, empty, error and success states throughout; structured API errors |
| Accessible | 18 checks passing, WCAG 2.2 AA rules, 4 violations found and fixed |
| Responsive | No horizontal overflow at 375, 768 or 1440 px |
| Security-checked | 42 live probes, 0 dependency vulnerabilities |
| Verified | Every claim above traces to a command that was run |

## Image upload ✅

The admin car form accepts real photographs uploaded from the administrator's
computer, rather than paths typed by hand.

- Drag files in or pick them; several at once
- Each becomes a row with its own type (main, gallery, exterior, interior,
  wheels), alt text and position
- Exactly one photo is the main one — promoting another demotes the previous
- Removing a photo that was uploaded here also deletes the file from disk
- The listing card, detail gallery, dashboards and admin tables all render
  uploaded photography through one resolver, so no caller needs to know whether
  an image is a bundled placeholder or an upload

**Security** — 8 tests, all passing:

| Case | Result |
| ---- | ------ |
| Real image | Stored, dimensions reported |
| Text file named `.png` with an image mime type | 422 |
| SVG (can carry script) | 422 |
| Anonymous | 401 |
| Customer | 403 |
| `../../.env` as a filename | 400 |
| Two uploads with the same name | Different stored names; the uploaded name never reaches disk |

The declared mime type is deliberately not trusted — the file's own bytes decide.
Rejected files are never written, because validation happens while the upload is
still in memory.
