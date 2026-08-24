# Architecture

## Principle

The frontend never communicates with PostgreSQL. Every operation crosses the REST
boundary so that authentication, authorization, validation and business logic have
exactly one home: the backend.

```
┌──────────────────────────────────────────────┐
│ Frontend — Next.js / React / TypeScript      │
│ Tailwind · shadcn/ui · motion · lucide-react │
│ Service layer (typed API clients)            │
└──────────────────────┬───────────────────────┘
                       │ REST / JSON
┌──────────────────────▼───────────────────────┐
│ Backend — NestJS                             │
│ Guards · DTO validation · services · modules │
│ auth · users · cars · favorites              │
│ recently-viewed · comparisons · orders       │
│ analytics · notifications · settings         │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│ Prisma ORM                                   │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│ PostgreSQL                                   │
└──────────────────────────────────────────────┘
```

## Authorization

Role checks live in backend guards. Frontend route guards exist only to avoid
showing a customer a page they cannot use — they are never the enforcement point.
Every `/admin` endpoint independently verifies the `ADMIN` role, so a forged
client-side state cannot reach admin data.

```
Request → Throttle → Auth guard → Role guard → DTO validation → Service → Prisma
```

## Order flow

```
Customer on /car/:id
      ↓
/car/:id/order  (name · email · phone · car · colour)
      ↓  POST /api/orders
Validate → authenticate → verify car is published → create order
      ↓
PostgreSQL  (order + initial status history row)
      ↓
├──► Admin dashboard  (/admin/orders)
└──► Email notification to administrator  (failure logged, order preserved)
```

The API responds successfully once the order is committed. Email dispatch is
handled separately so a mail outage can never lose an order (§26).

## Authentication

```
/signup or /login
      ↓
NestJS auth module → Argon2id hash verify
      ↓
Access token (short-lived) + refresh token (rotating, hashed at rest)
      ↓
role = CUSTOMER → /dashboard        role = ADMIN → /admin/dashboard
```

Google OAuth is a second provider on the same user records, activated only when
`GOOGLE_CLIENT_ID` is configured.

## Backend modules

| Module | Responsibility |
| ------ | -------------- |
| `auth` | Register, login, logout, refresh, password reset, Google OAuth, guards |
| `users` | Profile management, admin user management |
| `cars` | Catalogue CRUD, search, filter, sort, pagination, publish/unpublish |
| `favorites` | Add, remove, list |
| `recently-viewed` | Record and list view history |
| `comparisons` | Create, add/remove cars, clear, retrieve |
| `orders` | Submit, list, retrieve, status transitions |
| `analytics` | Database aggregates for the admin overview |
| `notifications` | Pluggable email provider, delivery logging |
| `settings` | Site configuration and public settings |

## Frontend structure

```
frontend/
├── app/                  Routes (App Router)
├── components/
│   └── ui/               shadcn/ui primitives and provided components
├── lib/                  Utilities, i18n, theme
├── hooks/                Client-side hooks
├── services/             Typed API clients — no raw fetch in components
├── types/                Shared response types
└── public/
    ├── images/{cars,interior,wheels,brands}/
    └── videos/
```

The service layer is the only place that talks to the API, so loading, empty,
error and success states are handled consistently (§58, §72).

## Internationalisation

Interface strings are provided in French, Arabic and English, with Arabic
rendering right-to-left. Authored car copy is English on the `cars` table with
optional FR/AR overlays in `car_translations`.
