# Running the project

```bash
cd "/Users/snow/myproject-Visual-Studio-code/CARS PROJECT/car-platform"
npm run dev
```

That is the whole thing. It checks the environment, then starts both servers in
one terminal with their output labelled:

```
✓ car-platform/.env found
✓ PostgreSQL is accepting connections on 5432 (database car_platform_dev)
✓ Database schema is up to date
✓ Port 3000 is free for the frontend
✓ Port 4000 is free for the backend

Ready.  site http://localhost:3000   api http://localhost:4000/api

[FRONTEND] ✓ Ready in 593ms
[BACKEND]  API listening on http://localhost:4000/api [development]
```

`Ctrl+C` stops both. Running `npm run dev` again picks up where you left off —
nothing in the database is touched by starting or stopping.

| | |
|---|---|
| Site | http://localhost:3000 |
| API | http://localhost:4000/api |
| API documentation | http://localhost:4000/api/docs |
| Database | PostgreSQL 17, `car_platform_dev`, on port 5432 |

## The shape of it

```
Browser → Next.js (3000) → NestJS API (4000) → Prisma → PostgreSQL (5432)
```

The frontend never speaks to the database. It has no database driver and no
connection string; every piece of data it shows arrives over HTTP from the API,
which is the only thing holding `DATABASE_URL`.

## What the preflight check catches

`npm run dev` runs `scripts/dev-preflight.mjs` first, because three things have
actually gone wrong on this machine and each one failed in a confusing place:

1. **PostgreSQL not running.** It once shut down uncleanly and left a stale
   `postmaster.pid`, so every start refused and the API died with "Can't reach
   database server" — which reads like lost data, though nothing was lost. The
   check starts PostgreSQL if it is down, and if it will not start it prints the
   exact remedy for the stale lock.

2. **A port still held by an old server.** `EADDRINUSE: address already in use
   :::4000` means a previous run is still there. The check stops leftovers
   belonging to this project automatically — it identifies them by their working
   directory, so a backend started by hand as `node dist/main.js` is recognised
   too — and waits for the port to be released. Anything that is *not* this
   project is reported, never killed.

3. **A migration the database has not been given.** Otherwise this surfaces much
   later as a query about a column that does not exist. It warns and names the
   command: `npm run prisma:deploy`.

Run the checks alone at any time with `npm run doctor`.

## Your data is in PostgreSQL, not in memory

Nothing about closing the editor, stopping the servers or restarting your Mac
removes users, cars or orders — they are rows in PostgreSQL, which runs as a
system service independently of this project.

- Registration writes a `users` row with an Argon2id password hash.
- Login reads that row and verifies the hash. There is no mock login anywhere.
- Sessions are refresh tokens stored as SHA-256 digests in the `refresh_tokens`
  table, in an httpOnly cookie — not in frontend state, not in backend memory.
  Restarting the API does not sign anyone out.

Verified after a full stop and restart: an account registered before the restart
logged in afterwards and its dashboard greeted it by name.

The only commands that touch data are the ones that say so: `npm run db:reset`
(destroys and rebuilds) and `npm run db:seed` (inserts the demo catalogue).
Neither runs on its own.

## Every script

| Command | What it does |
|---|---|
| `npm run dev` | Preflight, then frontend + backend together |
| `npm run doctor` | The preflight checks on their own |
| `npm run build` | Production build of both |
| `npm start` | Both production servers (after a build) |
| `npm run typecheck` | TypeScript across both workspaces |
| `npm run lint` | ESLint across both workspaces |
| `npm test` | Backend unit tests |
| `npm run test:e2e` | Playwright browser tests |
| `npm run prisma:studio` | Browse the database in a GUI |
| `npm run prisma:deploy` | Apply pending migrations |
| `npm run db:seed` | Insert the demo catalogue |

## Settings live in one file

`car-platform/.env` — the API, Prisma and the frontend all read it. The frontend
used to keep a second copy of two of those values in `frontend/.env.local`,
which meant editing the shared file changed nothing and the site quietly carried
on with the stale value. `frontend/next.config.ts` loads the shared file now, and
the duplicate is gone. `.env.example` lists every key.

The frontend's port is the exception: `next dev` takes it on the command line,
so it is set in `frontend/package.json` rather than in `.env`. If you change it,
change `NEXT_PUBLIC_SITE_URL` and `CORS_ORIGINS` to match.

## Browser tests

They run against a production build, not the dev server:

```bash
npm run build
npm start                       # serves on 3000
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```

Against `next dev` they mostly pass but occasionally time out, because dev-mode
Next compiles each route the first time it is requested and a cold compile can
outlast a test's patience. That is a property of the dev server, not a fault in
the site.
