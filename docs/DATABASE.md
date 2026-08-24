# Database

PostgreSQL with Prisma ORM. 24 application tables, 76 indexes, 31 foreign keys.
Schema source: [`prisma/schema.prisma`](../prisma/schema.prisma).

## Entity overview

```
User ──┬── Favorite ──────────┐
       ├── RecentlyViewed ────┤
       ├── Comparison ── ComparisonCar ─┤
       ├── Order ─────────────┤        │
       ├── RefreshToken       ├────────┴──► Car ──► Brand
       ├── PasswordResetToken │             │
       └── CarView ───────────┘             ├── CarEngine        (1:1)
                                            ├── CarWheels        (1:1)
                                            ├── CarExterior      (1:1)
                                            ├── CarInterior      (1:1)
                                            ├── CarTechnology    (1:1)
                                            ├── CarSafety        (1:1)
                                            ├── CarDimensions    (1:1)
                                            ├── CarColor         (1:N)
                                            ├── CarImage         (1:N)
                                            └── CarTranslation   (1:N)

Order ──► OrderStatusHistory,  EmailLog
Setting (standalone key/value)
```

## Tables

### Identity & access

| Table | Purpose |
| ----- | ------- |
| `users` | Accounts. `password` is an Argon2id hash and is nullable for Google-only accounts. `role` is `CUSTOMER` or `ADMIN`; `status` supports admin suspension (§48). |
| `refresh_tokens` | Rotating refresh tokens, hashed at rest, with revocation and expiry. |
| `password_reset_tokens` | Single-use reset tokens, hashed at rest. |

### Catalogue

| Table | Purpose |
| ----- | ------- |
| `brands` | Marque, country, logo, description. |
| `cars` | Vehicle identity (§15), price, authored copy, publication status. `is_demo_data` marks seeded rows. `deleted_at` provides soft deletion. |
| `car_engines` | Engine & performance (§16) including electric range and charging rates. |
| `car_wheels` | Wheels & tyres (§17). |
| `car_exteriors` | 19 exterior design attributes (§18). |
| `car_interiors` | 21 interior attributes (§19). |
| `car_technologies` | Equipment flags (§20) plus `drive_modes` as a PostgreSQL array. |
| `car_safeties` | Driver-assistance flags (§21), airbag count and `airbag_types` array. |
| `car_dimensions` | Dimensions and capacities (§22). |
| `car_colors` | Exterior and interior swatches with hex codes, unique per car+kind+name. |
| `car_images` | Media buckets: `MAIN`, `GALLERY`, `EXTERIOR`, `INTERIOR`, `WHEEL`. A gallery image may be tied to a colour. |
| `car_translations` | Optional FR/AR overlays for authored copy, unique per car+locale. |

### Customer features

| Table | Constraint |
| ----- | ---------- |
| `favorites` | `UNIQUE (user_id, car_id)` — duplicate favorites impossible (§51) |
| `recently_viewed` | `UNIQUE (user_id, car_id)`, ordered by `viewed_at` — re-viewing updates rather than duplicates (§52) |
| `comparisons` | One saved comparison per row, owned by a user (§53) |
| `comparison_cars` | `UNIQUE (comparison_id, car_id)` — a car cannot appear twice in one comparison (§53) |

### Orders

| Table | Purpose |
| ----- | ------- |
| `orders` | `user_id` **nullable** (§54). Buyer name, email and phone are stored on the order as a deliberate historical snapshot (§24), alongside `selected_color_name`. `reference` is unique and human-quotable. |
| `order_status_history` | Every transition with who changed it and when (§25). |
| `email_logs` | Delivery attempts and failures for order notifications (§26, §69). |

### Analytics & configuration

| Table | Purpose |
| ----- | ------- |
| `car_views` | One row per car view, attributed to a user or an anonymous id. The real source for "most viewed cars" (§68). |
| `settings` | Typed JSON key/value store with grouping and a public/private flag. Holds site config, social links and the §33 marketing figures. |

## Referential guarantees

Verified against the live database:

| Behaviour | Mechanism | Verified |
| --------- | --------- | -------- |
| Duplicate favorite rejected | `UNIQUE (user_id, car_id)` | ✅ |
| Duplicate recently-viewed rejected | `UNIQUE (user_id, car_id)` | ✅ |
| Duplicate comparison entry rejected | `UNIQUE (comparison_id, car_id)` | ✅ |
| **Deleting a car with orders is refused** | `orders.car_id ON DELETE RESTRICT` | ✅ |
| Deleting a user keeps their orders | `orders.user_id ON DELETE SET NULL` | ✅ |
| Deleting a car removes its spec groups | `ON DELETE CASCADE` | ✅ |
| Deleting a colour keeps the order's colour name | snapshot column + `SET NULL` | ✅ |

Cars are therefore **archived**, not deleted, whenever order history exists.

## Indexing

Indexes back the filters the Cars page needs (§11): `brand_id`, `year`, `price`,
`body_type`, `model`, plus a composite `(status, deleted_at)` for the published
listing. Time-series indexes support analytics: `car_views (car_id, viewed_at)`,
`orders (status, created_at)`, `favorites (user_id, created_at)`.

## Migrations

```bash
npm run prisma:migrate      # create + apply in development
npm run prisma:deploy       # apply in production
npm run db:reset            # drop, re-migrate, re-seed
```

Applied migrations:

1. `init_car_platform_schema` — all 24 tables
2. `add_car_is_demo_data` — demo-data flag (§73)

The database is fully reproducible from an empty PostgreSQL instance.

## Seed data

`npm run db:seed` is idempotent. It creates 14 brands, 17 fully specified
vehicles, 6 users, 85 colour swatches, 102 image records, 22 favorites, 25
recently-viewed entries, 485 car views, 1 saved comparison and 5 orders covering
all five statuses — including one guest order.

Every vehicle carries `is_demo_data = true`.
