# Car Platform

A production-oriented automotive platform for showcasing vehicles — with a focus on
Chinese automotive brands — built as a full-stack monorepo.

**Frontend** Next.js · React · TypeScript · Tailwind CSS · shadcn/ui
**Backend** NestJS · TypeScript · REST API
**Database** PostgreSQL · Prisma ORM

> Status: **Phase 1 complete** (architecture + database). See [docs/PROGRESS.md](docs/PROGRESS.md)
> for what is implemented and what remains.

---

## Architecture

The frontend never talks to PostgreSQL directly. Every read and write travels:

```
Frontend (Next.js)
      ↓  REST
NestJS Backend  ── authentication · authorization · validation · business logic
      ↓
Prisma ORM
      ↓
PostgreSQL
```

## Repository layout

```
car-platform/
├── frontend/            Next.js application
├── backend/             NestJS REST API
├── prisma/
│   ├── schema.prisma    Database schema (24 tables)
│   ├── migrations/      Version-controlled SQL migrations
│   ├── data/            Development seed catalogue
│   └── seed.ts          Idempotent seed script
├── docs/                Architecture, database, API and decision records
├── prisma.config.ts     Prisma CLI configuration
├── .env.example         Environment template — copy to .env
└── package.json         npm workspaces root
```

## Prerequisites

| Requirement | Version |
| ----------- | ------- |
| Node.js     | 20 or newer (developed on 25) |
| npm         | 10 or newer |
| PostgreSQL  | 16 or newer (developed on 17) |

## Installation

```bash
npm install
```

### 1. Environment

```bash
cp .env.example .env
```

Then fill in the values. Generate the two JWT secrets with:

```bash
openssl rand -base64 48
```

Every variable is documented inline in `.env.example`. `.env` is git-ignored and
must never be committed (spec §67, §70).

### 2. Database

Create a role and databases (adjust names to taste):

```bash
createdb car_platform_dev
```

Point `DATABASE_URL` at that database, then apply the schema:

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 3. Seed development data

```bash
npm run db:seed
```

This creates 14 brands, 17 fully specified vehicles, one admin, five customers,
favorites, recently-viewed history, view analytics, a saved comparison and five
orders spanning every order status.

**Every seeded vehicle is stored with `isDemoData = true`.** Demo inventory is
never presented as verified production listings (spec §73).

Seed account credentials are read from `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`,
`SEED_CUSTOMER_EMAIL` and `SEED_CUSTOMER_PASSWORD` in your `.env`. They are not
hard-coded anywhere in the repository. Change them before any shared deployment.

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Run frontend and backend together |
| `npm run dev:frontend` | Next.js dev server only |
| `npm run dev:backend` | NestJS watch mode only |
| `npm run build` | Production build of both workspaces |
| `npm run typecheck` | TypeScript check across workspaces |
| `npm run lint` | Lint both workspaces |
| `npm test` | Unit and integration tests |
| `npm run test:e2e` | End-to-end tests |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run prisma:migrate` | Create and apply a migration |
| `npm run prisma:deploy` | Apply migrations (production) |
| `npm run prisma:studio` | Browse the database |
| `npm run db:seed` | Seed development data (idempotent) |
| `npm run db:reset` | Drop, re-migrate and re-seed |

## Documentation

| Document | Contents |
| -------- | -------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design and request flow |
| [docs/DATABASE.md](docs/DATABASE.md) | Every table, relation and constraint |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Technical decisions and specification conflict resolutions |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Phase-by-phase implementation status |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Every environment variable explained |
| `docs/spec/` | The original owner specification documents |

## Security

- Passwords are hashed with Argon2id — never stored in plain text.
- Authorization is enforced in the backend; frontend route guards are UX only.
- Secrets live in environment variables and are excluded from version control.
- Deleting a car cannot destroy order history (foreign-key `RESTRICT`).

## License

Private and unpublished.
