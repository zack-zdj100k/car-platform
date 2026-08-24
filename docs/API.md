# REST API

Base URL: `http://localhost:4000/api`
Interactive reference (development only): `http://localhost:4000/api/docs`

## Conventions

**Authentication.** Send the access token as `Authorization: Bearer <token>`. The
refresh token is delivered as an **httpOnly cookie** (`cp_refresh`) so browser
JavaScript — and therefore any XSS payload — cannot read it. Call
`POST /auth/refresh` with the cookie to obtain a new access token.

Access is **deny-by-default**: every route requires authentication unless marked
public below. Admin routes verify the `ADMIN` role server-side on every request.

**Validation.** Request bodies are validated and stripped. Unknown properties are
**rejected with 400**, not silently ignored — a client cannot smuggle a field
such as `role` into a payload.

**Pagination.** List endpoints accept `page` (≥1) and `pageSize` (1–100) and
return:

```json
{
  "data": [ ... ],
  "meta": { "page": 1, "pageSize": 12, "total": 17, "totalPages": 2,
            "hasNextPage": true, "hasPreviousPage": false }
}
```

**Errors.** Every failure has the same shape. Internal details are logged, never
returned.

```json
{
  "statusCode": 404,
  "error": "NOT_FOUND",
  "message": "Vehicle not found",
  "path": "/api/cars/unknown",
  "timestamp": "2026-08-24T20:32:37.000Z"
}
```

| Status | Meaning |
| ------ | ------- |
| 400 | Validation failure or an illegal state transition |
| 401 | Missing, invalid or expired authentication |
| 403 | Authenticated but not permitted |
| 404 | Not found, or not visible to this caller |
| 409 | Conflict — duplicate record, or a record still referenced |
| 429 | Rate limit exceeded |
| 503 | Database unavailable (health check) |

**Rate limits.** Global default 120 requests/60s per IP. Stricter per route:
login 10/15min, register 12/15min, password reset 5/15min, order submission
5/hour.

---

## Authentication — `/auth`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| POST | `/auth/register` | public | Create a customer account. New accounts are always `CUSTOMER`; the role cannot be supplied. |
| POST | `/auth/login` | public | Email and password. `rememberMe` extends the refresh lifetime to 90 days. |
| POST | `/auth/refresh` | cookie | Rotates the refresh token and returns a new access token. |
| POST | `/auth/logout` | cookie | Revokes the current refresh token. 204. |
| GET | `/auth/me` | any signed-in | Current profile. |
| POST | `/auth/forgot-password` | public | Sends a reset link. Always 202 — the response never reveals whether an address is registered. |
| POST | `/auth/reset-password` | public | Consumes a single-use token, sets the password and revokes all sessions. |
| GET | `/auth/google` | public | Begins Google OAuth. Inactive until credentials are configured. |
| GET | `/auth/google/callback` | public | Completes OAuth, sets the cookie and redirects by role. |

**Security behaviours worth knowing.** A wrong password and an unknown email
return an identical message and comparable timing, so the endpoint cannot be used
to enumerate accounts. Refresh tokens are single-use: presenting a rotated token
again revokes the entire token family, on the assumption of replay or theft.

## Cars — `/cars`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| GET | `/cars` | public | Published vehicles with search, filters, sorting, pagination. |
| GET | `/cars/facets` | public | Available filter values with counts, derived from the published catalogue. |
| GET | `/cars/featured` | public | Featured vehicles for the home page. |
| GET | `/cars/:idOrSlug` | public | Full detail. Records a view, and view history when signed in. |
| GET | `/cars/admin/all` | ADMIN | Every vehicle including drafts. |
| GET | `/cars/admin/:idOrSlug` | ADMIN | Detail including drafts. |
| POST | `/cars` | ADMIN | Create, with all specification groups nested. |
| PATCH | `/cars/:id` | ADMIN | Partial update; specification groups are upserted. |
| PATCH | `/cars/:id/publish` | ADMIN | Publish. |
| PATCH | `/cars/:id/unpublish` | ADMIN | Return to draft. |
| DELETE | `/cars/:id` | ADMIN | Deletes, **or archives when orders reference the vehicle**. |

**Query parameters for `GET /cars`**

| Parameter | Notes |
| --------- | ----- |
| `search` | Matches brand name, model or trim, case-insensitive |
| `brand` | Brand slug. Repeatable or comma-separated: `?brand=byd,mg` |
| `model` | Partial, case-insensitive |
| `bodyType` | `SUV`, `CROSSOVER`, `SEDAN`, `HATCHBACK`, `COUPE`, `CONVERTIBLE`, `WAGON`, `MPV`, `VAN`, `PICKUP` |
| `fuelType` | `PETROL`, `DIESEL`, `HYBRID`, `PLUG_IN_HYBRID`, `ELECTRIC`, `LPG`, `CNG` |
| `transmission`, `drivetrain` | Repeatable enums |
| `year`, `yearMin`, `yearMax` | Inverted ranges are rejected with 400 |
| `priceMin`, `priceMax` | Inverted ranges are rejected with 400 |
| `seats`, `featured` | |
| `sort` | `newest` (default), `oldest`, `price-asc`, `price-desc`, `year-asc`, `year-desc`, `popular` |

`popular` ranks by real view counts from `car_views` — never an invented score.

**Deletion semantics.** `DELETE /cars/:id` returns `{ archived: true }` and sets
status `ARCHIVED` when the vehicle has orders, preserving order history per spec
§55. Only an unreferenced vehicle is removed outright.

## Brands — `/brands`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| GET | `/brands` | public | Brands with published-vehicle counts. |
| GET | `/brands/:idOrSlug` | public | Brand detail. |
| POST | `/brands` | ADMIN | Create. |
| PATCH | `/brands/:id` | ADMIN | Update. |
| DELETE | `/brands/:id` | ADMIN | Refused with 409 while vehicles reference it. |

## Favorites — `/favorites`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| GET | `/favorites` | CUSTOMER | Paginated favourites with the fields the card needs. |
| GET | `/favorites/ids` | CUSTOMER | Car ids only, for rendering heart states in one request. |
| POST | `/favorites/:carId` | CUSTOMER | Idempotent — favouriting twice is not an error. |
| DELETE | `/favorites/:carId` | CUSTOMER | 404 if it was not a favourite. |

## Recently viewed — `/recently-viewed`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| GET | `/recently-viewed` | CUSTOMER | Most recent first. |
| POST | `/recently-viewed/:carId` | CUSTOMER | Explicit record. Re-viewing updates the timestamp rather than duplicating. |
| DELETE | `/recently-viewed` | CUSTOMER | Clear history. |

## Comparisons — `/comparisons`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| GET | `/comparisons` | CUSTOMER | Saved comparisons. |
| GET | `/comparisons/:id` | CUSTOMER | One comparison, with every specification group for the table. |
| POST | `/comparisons` | CUSTOMER | Create, optionally seeded with `carIds`. |
| POST | `/comparisons/:id/cars` | CUSTOMER | Add a vehicle. Adding a duplicate is a no-op. |
| PUT | `/comparisons/:id/cars` | CUSTOMER | Replace the whole set. |
| DELETE | `/comparisons/:id/cars/:carId` | CUSTOMER | Remove one vehicle. |
| PATCH | `/comparisons/:id/clear` | CUSTOMER | Empty it but keep the comparison. |
| DELETE | `/comparisons/:id` | CUSTOMER | Delete it. |

The maximum vehicles per comparison comes from the `compare.maxCars` setting
(default 4). Ownership is checked on the record, so a guessed id returns 403.

## Orders — `/orders`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| POST | `/orders` | see below | Submit a request for a vehicle. |
| GET | `/orders/mine` | CUSTOMER | Own orders. |
| GET | `/orders/admin/all` | ADMIN | Every order, with search and status filters. |
| GET | `/orders/:id` | owner or ADMIN | Detail with full status history. |
| GET | `/orders/reference/:reference` | owner or ADMIN | Look up by reference. |
| GET | `/orders/:id/transitions` | ADMIN | Which statuses this order may move to. |
| PATCH | `/orders/:id/status` | ADMIN | Change status. |

**Authentication requirement.** `POST /orders` requires a signed-in customer when
the `orders.requireAuth` setting is true (the default, matching the system
graph). Set it to false to accept guest orders — `user_id` is nullable, so no
migration is needed. See [DECISIONS.md](DECISIONS.md) D-1.2.

**This is not a payment endpoint.** It records a request; there are no payment
fields, per spec §24.

**Permitted status transitions** (spec §25). Anything else returns 400:

```
PENDING   → CONTACTED, CONFIRMED, CANCELLED
CONTACTED → CONFIRMED, CANCELLED, COMPLETED
CONFIRMED → COMPLETED, CANCELLED
CANCELLED → PENDING
COMPLETED → (final)
```

Buyer name, email, phone and the colour name are snapshotted onto the order, so
the record stays accurate if the customer later edits their profile or an admin
edits the vehicle's colours.

**Email.** The order is committed before notifications are attempted. A mail
failure is recorded in `email_logs` and never surfaces to the customer or rolls
back the order.

## Users — `/users`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| GET | `/users/me` | any signed-in | Own profile with activity counts. |
| PATCH | `/users/me` | any signed-in | Update name, phone, picture, locale. |
| PATCH | `/users/me/password` | any signed-in | Change password; revokes all sessions. |
| GET | `/users` | ADMIN | List with search and role/status filters. |
| GET | `/users/:id` | ADMIN | Detail with recent orders. |
| PATCH | `/users/:id` | ADMIN | Change role or account status. |

Password hashes are never selected into a response. An admin cannot demote or
suspend their own account, and the last active administrator cannot be removed.
A suspension or role change revokes that user's sessions immediately.

## Dashboard — `/dashboard`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| GET | `/dashboard` | CUSTOMER | Everything the customer dashboard home needs: profile, four summary counts, recent vehicles and recent favourites — in one request. |

## Analytics — `/analytics` (ADMIN only)

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/analytics/dashboard` | Complete admin overview in one request. |
| GET | `/analytics/overview` | Headline counts, including how many vehicles are demo data. |
| GET | `/analytics/most-viewed` | `?limit=&days=` — from real `car_views` rows. |
| GET | `/analytics/most-favorited` | `?limit=` |
| GET | `/analytics/most-ordered` | `?limit=` |
| GET | `/analytics/growth` | `?days=` — daily users, cars, orders and views. |
| GET | `/analytics/orders` | Counts per status. |
| GET | `/analytics/catalogue` | Distribution by brand, body type and fuel type. |
| GET | `/analytics/email-health` | Delivery counts and recent failures. |

Every figure is a database aggregate. The marketing figures in spec §33 are
separate, editable settings — see [DECISIONS.md](DECISIONS.md) D-2.1.

## Settings — `/settings`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| GET | `/settings/public` | public | Public settings grouped by category. |
| GET | `/settings` | ADMIN | Every setting, with who last changed it. |
| GET | `/settings/:key` | ADMIN | One setting. |
| PUT | `/settings` | ADMIN | Bulk update in a single transaction. |
| PATCH | `/settings/:key` | ADMIN | Update one. Unknown keys return 404 — settings are seeded, not created ad hoc. |

## Uploads — `/uploads` (ADMIN only)

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/uploads/image` | Upload one car photograph. Multipart, field `file`. |
| POST | `/uploads/images` | Upload up to 20 at once. Multipart, field `files`. |
| DELETE | `/uploads/:filename` | Delete a stored file. |

Returns `{ url, filename, width, height, sizeBytes, mimeType }`. Store the `url`
on the car's image record; the file is served from `/uploads/…` on the API host.

**What is accepted, and why.** JPG, PNG, WebP, AVIF and GIF, up to
`MAX_UPLOAD_MB` (8 by default). The decision is made by reading the file's own
bytes — the declared mime type and the extension are both supplied by the
client and prove nothing. A file that is not a readable image returns 422.

**SVG is refused.** It is a document format that can carry script, and it would
be served from the API's own origin.

**Stored names are random.** An uploaded filename never reaches the filesystem,
so it cannot traverse directories or overwrite another file. Deletion accepts a
bare filename only, and the resolved path is checked to be inside the upload
directory.

Files are held in memory during validation, so anything rejected is never
written to disk at all.

## Health — `/health`

| Method | Path | Access | Description |
| ------ | ---- | ------ | ----------- |
| GET | `/health` | public | Returns 200 with database connectivity, or 503 when the database is unreachable. |
