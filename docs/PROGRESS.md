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

- Image upload endpoints: the car form takes asset paths for now
- Jest and Playwright suites are Phase 9
