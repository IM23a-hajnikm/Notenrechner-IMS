# Notenrechner v2

Production-oriented Swiss grade calculator for students. The project is a clean remake of an older Notenrechner and is intentionally built as a serious full-stack portfolio app.

## Current Status

Foundation in progress.

- Monorepo structure
- Shared TypeScript calculation package
- Prisma schema for users, subjects, terms, and grades
- NestJS API with auth, calculation endpoints, and ownership-scoped student CRUD
- Next.js web app with local demo mode and authenticated account mode
- Dedicated required-grade, BMS, and EFZ calculator pages

The first priority is correct Swiss grade calculation. UI polish and teacher features come later.

## Architecture

```txt
apps/
  api/       NestJS backend
  web/       Next.js frontend
packages/
  shared/    Shared calculation logic and domain types
prisma/      PostgreSQL schema
docs/        Product and calculation notes
```

## Requirements

- Node.js 20+
- npm 10+
- PostgreSQL 15+ for persistent account mode

## Local Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run dev
```

Run the shared calculation tests:

```bash
npm -w @notenrechner/shared test
```

Run all available checks:

```bash
npm run typecheck
npm test
npm run build
```

Validate the Prisma schema without requiring a running database:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/notenrechner_v2?schema=public" npx prisma validate
```

## Environment

See `.env.example`.

The MVP must support two modes:

- Demo mode: no login, local browser storage only
- Account mode: authenticated user data persisted in PostgreSQL

Local frontend API calls use `NEXT_PUBLIC_API_URL`; by default this points to `http://localhost:3001`.

Calculator routes:

- `/calculators/required-grade`
- `/calculators/bms`
- `/calculators/efz`

## API Surface

Health:

- `GET /health`

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Student resources, protected by the HTTP-only access-token cookie:

- `GET /subjects`
- `POST /subjects`
- `GET /subjects/:id`
- `PATCH /subjects/:id`
- `DELETE /subjects/:id`
- `GET /terms`
- `POST /terms`
- `GET /terms/:id`
- `PATCH /terms/:id`
- `DELETE /terms/:id`
- `GET /grades`
- `POST /grades`
- `GET /grades/:id`
- `PATCH /grades/:id`
- `DELETE /grades/:id`

Calculations:

- `POST /calculations/weighted-average`
- `POST /calculations/required-grade`
- `POST /calculations/bms`
- `POST /calculations/efz`

## Security Notes

All user-owned backend resource methods are scoped by `userId`; reads and mutations use the authenticated user id rather than trusting a client-provided owner id.

`npm audit --omit=dev` currently reports a moderate PostCSS advisory through Next.js 16.2.6's nested `postcss@8.4.31` dependency. The direct project PostCSS dependency is patched, and npm does not currently offer a non-breaking Next.js fix.

## Development Priorities

1. Reliable shared calculation engine with unit tests
2. Prisma schema and ownership-safe backend services
3. Student CRUD for subjects, terms, and grades
4. No-login demo mode
5. Authenticated persistence
6. BMS, EFZ, and required-grade screens
7. CSV import/export

Teacher/class features are intentionally out of scope for the MVP.
