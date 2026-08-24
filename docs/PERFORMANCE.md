# Performance Audit (Phase 12)

Measured against the **production build**, not the development server. Every
number below came from a real run; nothing is estimated.

---

## Page metrics

| Page | TTFB | First Contentful Paint | Load | Transferred | Requests | CLS |
| ---- | ---- | ---------------------- | ---- | ----------- | -------- | --- |
| Home | 27 ms | **264 ms** | 388 ms | 718 KB | 40 | **0** |
| Cars listing | 21 ms | **140 ms** | 174 ms | 564 KB | 46 | **0** |
| Car detail | 48 ms | **160 ms** | 217 ms | 539 KB | 27 | **0** |
| About | 18 ms | **148 ms** | 164 ms | 518 KB | 21 | 0 |
| Sign in | 16 ms | **116 ms** | 178 ms | 537 KB | 20 | 0 |

**Cumulative Layout Shift is zero on every page.** Images reserve their space
through aspect-ratio containers, and the hero renders its final layout
immediately rather than settling after the video loads.

### Budgets

| Budget | Threshold | Worst measured | Result |
| ------ | --------- | -------------- | ------ |
| First Contentful Paint | < 1800 ms | 264 ms | ✅ 6.8× under |
| Cumulative Layout Shift | < 0.1 | 0 | ✅ |
| Page weight | < 1 MB | 718 KB | ✅ |

The home page carries the most weight because of the hero video poster; the
video itself streams separately and only while on screen.

## API response times

Ten runs each against the running server.

| Endpoint | Median | p95 |
| -------- | ------ | --- |
| `GET /cars` (12 per page) | 18 ms | 56 ms |
| `GET /cars` filtered + sorted | 12 ms | 16 ms |
| `GET /cars/facets` | 13 ms | 18 ms |
| `GET /cars/:slug` (full detail, all spec groups) | 15 ms | 20 ms |
| `GET /health` | 3 ms | 5 ms |

The full car detail — brand, seven specification groups, colours, images and
counts — resolves in 15 ms because it is a single Prisma query with nested
includes rather than a sequence of round trips.

## Image delivery

- All 12 images on the listing pass through the Next image pipeline
- 9 of 12 lazy-load; the three above the fold load eagerly
- AVIF and WebP are configured; the placeholders are SVG, so they are served
  as-is, and real photography will be converted automatically

## Database index coverage

Verified with `EXPLAIN (ANALYZE, BUFFERS)` against a **50,000-vehicle,
200,000-view** fixture, because at seed volume the planner correctly ignores
indexes and the measurement would prove nothing.

| Query | Plan | Time |
| ----- | ---- | ---- |
| Listing, page 1, newest first | Index scan on `cars_created_at_idx` | **0.12 ms** |
| Filter by brand | Index scan on `cars_created_at_idx` | **0.28 ms** |
| Filter by price range | Index scan on `cars_price_idx` | **0.13 ms** |
| Filter by year | Sequential scan, short-circuited by `LIMIT` | **0.21 ms** |
| View count for one car | Bitmap index scan on `car_views_car_id_viewed_at_idx` | **0.31 ms** |

Pagination stays fast at 50,000 rows because the sort column is indexed, so the
planner reads only the rows the page needs instead of sorting the table.

The year filter chooses a sequential scan rather than `cars_year_idx`. That is
the planner making the right call: matches are dense, and `LIMIT 12` is
satisfied after reading a handful of rows. The index still earns its place for
selective year ranges.

### Known scaling limit: the "most viewed" aggregate

| Rows in `car_views` | Query time |
| ------------------- | ---------- |
| 200,000 | **157 ms** |

This is the one query that does not scale flat. Grouping every view row to rank
vehicles costs time proportional to the table.

Forcing the index path was tested and is **slower** — 205 ms for an index-only
scan versus 157 ms sequential — so the planner is already choosing correctly and
no index would help. The cost is inherent to the aggregation.

It is acceptable today: this runs on an admin-only page, and 157 ms at 200,000
views is not a problem. Past roughly a million view rows the right fix is a
rollup — a `car_view_daily` table of per-day counts maintained on write, turning
the ranking into a small indexed sum. That is recorded here rather than built
now, because the platform has no such volume and the table would be dead weight.

## Applied optimisations

- **Server components by default.** Only genuinely interactive parts opt into
  the client, so the listing and detail pages ship markup rather than a data
  layer.
- **One request per view.** The customer dashboard and admin overview each
  resolve in a single API call instead of one per card.
- **Favourites as a set of ids.** The grid renders every heart from one request
  rather than one per card.
- **Debounced search.** Typing updates the URL immediately but waits 350 ms
  before issuing a request.
- **Parallel independent queries.** Read-only aggregates use `Promise.all`
  rather than a transaction, since they need no atomicity.
- **Selective payloads.** The listing selects only the fields a card shows; the
  full specification tree loads only on the detail page.
- **Lazy hero video.** Playback is attached through an `IntersectionObserver`
  and paused off screen, and is not downloaded at all under reduced motion. The
  clip is the owner-supplied 1920×1080 footage, remuxed to MP4 (4.5 MB) with its
  poster frame extracted from the film itself.

## How to reproduce

```bash
npm run build --workspace frontend
npm run start --workspace frontend -- --port 3100
```

Then run the audit script against `http://localhost:3100`. The database
measurements use the test database with the load fixture described above; it is
truncated afterwards so the fixture never affects test runs.
