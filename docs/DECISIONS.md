# Technical Decisions & Specification Conflict Resolutions

Every entry records a decision that was **not** already settled by the owner
specification. Anything here can be reversed on request — nothing was removed
from any specification document.

---

## Part 1 — Conflicts between the specification documents

The three documents (Master Prompt, System Graph, Final Route Map) disagree on
eight points. The Master Prompt is authoritative for features and behaviour; the
**Final Route Map** is authoritative for *routing*, because that is its declared
purpose and it is titled "final".

To avoid discarding either document's URLs, the Master Prompt's variants are kept
as **permanent redirects** to the canonical routes. Both sets of links work.

| # | Canonical route | Redirects from | Source |
| - | --------------- | -------------- | ------ |
| 1 | `/login` | `/sign-in` | Route Map |
| 2 | `/signup` | `/sign-up` | Route Map |
| 3 | `/car/:id` | `/cars/:id` | Route Map |
| 4 | `/car/:id/order` | — (dedicated page) | Route Map + Graph |
| 5 | `/dashboard/recent` | `/dashboard/recently-viewed` | Route Map |
| 6 | `/dashboard/orders` | — (included) | Route Map + Master §38 |
| 7 | `/admin/cars/add` | `/admin/cars/new` | Route Map |
| 8 | `/admin/dashboard` | `/admin` | Route Map + Graph |

### D-1.1 — Order page is a dedicated route, not a modal

The Master Prompt (§24) shows the order form as a step after the car detail page
without naming a route; the Route Map and System Graph both define
`/car/:id/order`. **Decision:** a dedicated page at `/car/:id/order`, pre-filled
from the selected car and colour. This satisfies all three documents.

### D-1.2 — Authentication is required to submit an order, but the schema allows guests

The System Graph places an authentication gate before the order step. The Master
Prompt (§24) says "*if* the customer is authenticated, link the order to their
account", and §54 requires `user_id` to be **nullable** — which only matters if
guest orders are representable.

**Decision — both are honoured:**

- `orders.user_id` is nullable at the database level, as §54 requires.
- Order submission requires authentication by default, as the Graph requires.
- The gate is a setting (`orders.requireAuth`, seeded `true`, initialised from
  `REQUIRE_AUTH_FOR_ORDERS`), so allowing guest orders later is a config change,
  not a migration.
- The seed includes one guest order to prove the nullable path works.

**This is the one conflict where the two readings produce genuinely different
product behaviour. Confirm the default if guest ordering is wanted.**

---

## Part 2 — Open items awaiting owner input

| Item | Current state | Needed from owner |
| ---- | ------------- | ----------------- |
| Google authentication (§3, §36, §37) | Provider will be built but stays **disabled** while `GOOGLE_CLIENT_ID` is empty | Google Cloud OAuth client ID + secret |
| `components/ui/footer-section.tsx` (§10, §62) | **Written in-house** — see D-2.2 | Optional: paste the original to replace it |
| `components/ui/elegant-dark-pattern.tsx` (§61) | **Written in-house** — see D-2.2 | Optional: paste the original to replace it |
| Logo (§7) | Placeholder | Final logo asset |
| Hero video (§8) | Three `kling_*.mov` clips exist in the project folder | Confirm which clip is the hero video |
| Social URLs (§27) | Settings seeded **empty** — never invented | Real TikTok / Instagram / Facebook URLs |
| Team & owner facts (§29, §34) | Placeholder text | Real content |
| Price currency | `USD`, stored per car | Confirm the intended market currency |

### D-2.2 — The two "provided" components were authored in-house, with approval

Spec §10, §61 and §62 refer to two components as "the provided" and "the
supplied" component, but neither was ever included with the specification
documents. §61 in particular says "Do not replace it. Do not redesign it without
approval."

The owner was asked directly, presented with three options, and answered that
they had **no preference**, under a standing instruction to "do the best always".
That is recorded here as the approval §61 requires.

**Decision:** both components are written in-house in the project's own premium
automotive style, and both are kept deliberately swap-ready:

- Each lives at exactly the path the specification names, so replacing one is a
  single-file overwrite.
- Neither exports anything beyond what the specification implies, so no other
  file needs to change when the original arrives.
- `footer-section.tsx` follows §10's link requirements: Cars, About Us, Privacy
  Policy, Terms, plus TikTok / Instagram / Facebook / GitHub read from settings.
  The SaaS links §10 rejects — Pricing, Changelog, Integration — are absent.

If the original components are supplied later, paste them over these files.

### D-2.1 — The §33 statistics are marketing content, not analytics

Spec §33 lists "500+ Cars Listed, 50+ Brands, 10K+ Visitors, 24/7" and says these
must either come from real analytics or be "clearly structured as configurable
content". The platform does not have 500 cars or 10,000 visitors, so presenting
them as live analytics would be fabricated data — which §45 and §68 forbid.

**Decision:** they are stored in the `settings` table under the
`marketing-stats` group, editable from admin settings, and clearly labelled as
marketing copy. The **admin dashboard** computes its own figures from real
database aggregates. Say the word to switch the About page to live counts instead.

---

## Part 3 — Technical decisions (no effect on product behaviour)

### D-3.1 — TypeScript 5.9.3, not 7.x
TypeScript 7.0 is a days-old major release. NestJS depends on decorator metadata
emit and `ts-jest`, neither of which is proven against it. Revisit once the
ecosystem catches up.

### D-3.2 — Prisma 6.19.3, not 7.x
Prisma 7 changes the generated-client contract and configuration surface. Pinning
to the mature 6.x line keeps migrations and client imports predictable.

### D-3.3 — Argon2id for password hashing
Spec §49 requires secure hashing without naming an algorithm. Argon2id is the
current OWASP recommendation; parameters are 19 MiB memory, 2 iterations,
parallelism 1. Verified to build natively on Node 25.

### D-3.4 — Specification groups are 1:1 satellite tables
Spec §50 forbids storing everything as JSON. Sections §15–§22 define roughly 120
attributes. Putting them all on `cars` would create an unwieldy table, so each
group (`car_engines`, `car_wheels`, `car_exteriors`, `car_interiors`,
`car_technologies`, `car_safeties`, `car_dimensions`) is its own table with a
unique `car_id`. Every attribute is a typed column; PostgreSQL arrays are used
for `drive_modes` and `airbag_types`.

### D-3.5 — Brands are normalised; models are not
`brand` becomes a table (it needs a logo, country and description per §63 and
§11). `model` stays a column on `cars`: it is meaningful only in combination with
its brand, and the model filter is served from distinct values.

### D-3.6 — `Car.isDemoData` flag
Spec §73 requires demo data to be "clearly marked". A convention is not
enforceable, so this is a real column that the admin UI surfaces and that makes
purging demo inventory a one-line query.

### D-3.7 — Soft deletion for cars
Spec §55 warns against destroying order history. `cars.deleted_at` plus a
`CarStatus.ARCHIVED` state provide soft deletion, and `orders.car_id` uses
`onDelete: Restrict` so a hard delete is refused by PostgreSQL itself. Verified.

### D-3.8 — Supporting tables added for required features
None of these are new product features; each exists to make a specified
requirement work honestly:

| Table | Required by |
| ----- | ----------- |
| `car_views` | §68 "most viewed cars" needs real tracking data |
| `order_status_history` | §25 status transitions need an audit trail |
| `email_logs` | §26, §69 "handle email failures safely and log them" |
| `refresh_tokens` | §37 secure sessions |
| `password_reset_tokens` | §37 forgot/reset password |
| `settings` | §33, §75 website settings |
| `car_translations` | §7 FR/AR/EN support for authored car copy |

### D-3.9 — Electric-vehicle fields on `car_engines`
Spec §16 lists `ELECTRIC` and `HYBRID` fuel types but no battery or range
attributes. Chinese-market vehicles are heavily electrified, so
`battery_capacity_kwh`, `electric_range_km`, `charging_ac_kw` and
`charging_dc_kw` were added. Without them an EV listing could not state its
range.

### D-3.10 — English is the base language; FR/AR are overlays
Authored car copy lives on `cars` (English), with optional FR/AR rows in
`car_translations`. Interface strings are handled by the frontend i18n layer.
This keeps the §47 admin form single-language as specified while making
translation possible.

### D-3.11 — `deepmerge-ts` advisory accepted for now
`npm audit` reports one high-severity stack-exhaustion advisory reached through
`@prisma/config` → `deepmerge-ts`. It affects the **Prisma CLI at development
time only**, is not present in `@prisma/client`, and is fed exclusively by our own
configuration file. The suggested "fix" is a CLI downgrade. Re-evaluate during
the Phase 10 security audit.
