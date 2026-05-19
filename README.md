# Notenrechner v2

Production-oriented Swiss grade calculator for students. The project is a clean remake of an older Notenrechner and is intentionally built as a serious full-stack portfolio app.

## Current Status

Student MVP is feature-complete for v1. Remaining production work is operator deployment with real hosting, secrets, and database credentials.

- Monorepo structure with shared calculation logic, NestJS API, Next.js web app, and Prisma/PostgreSQL persistence
- No-login demo mode with local browser storage
- Authenticated account mode with user-owned subjects, terms, grades, and CSV import/export
- Dedicated required-grade, BMS, and EFZ calculator pages
- Responsive UI, accessible busy/error states, and light/dark theme support
- Prisma migration and local seed data for account-mode smoke testing
- Deployment, environment, and smoke-test notes in [docs/deployment.md](docs/deployment.md)

Teacher/class features are intentionally out of scope for v1. The current polish backlog is tracked in GitHub issues.

## Screenshots

| Landing                                       | Demo mode                                         |
| --------------------------------------------- | ------------------------------------------------- |
| ![Landing page](docs/screenshots/landing.png) | ![Demo mode dashboard](docs/screenshots/demo.png) |

| Account mode                                            | Required grade                                                    |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| ![Account mode dashboard](docs/screenshots/account.png) | ![Required grade calculator](docs/screenshots/required-grade.png) |

| BMS calculator                              | EFZ calculator                              |
| ------------------------------------------- | ------------------------------------------- |
| ![BMS calculator](docs/screenshots/bms.png) | ![EFZ calculator](docs/screenshots/efz.png) |

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

## First-Time Local Setup

Install dependencies from the repository root:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Make sure PostgreSQL is running and that `DATABASE_URL` in `.env` points at your local database. Then generate the Prisma client, apply migrations, and load the fake sample account:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Seed login:

- Email: `demo.student@example.test`
- Password: `DemoStudent123!`

The seed is safe to share and intentionally non-production. Re-running `npm run prisma:seed` upserts that account, resets its password, deletes that account's refresh tokens, subjects, terms, and grades, then recreates the deterministic BMS/EFZ sample data. Other accounts are not touched. For a full local database reset, run `npx prisma migrate reset`; Prisma will reapply migrations and run the configured seed unless you pass `--skip-seed`.

Start the full local app:

```bash
npm run dev
```

Default local ports:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Frontend API origin: `NEXT_PUBLIC_API_URL`
- API CORS origin: `WEB_ORIGIN`

Demo mode and calculator routes can run without a database. Account mode needs PostgreSQL, migrations, and working auth/cookie configuration.

## Daily Commands

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

Useful workspace commands:

```bash
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run test:e2e
npm run dev:api
npm run dev:web
```

## Continuous Integration

Pull requests and pushes to `master` or `main` run the GitHub Actions quality gate in `.github/workflows/quality.yml`.

The workflow uses Node.js 20 on `ubuntu-latest`, installs dependencies with `npm ci`, generates the Prisma client, validates `prisma/schema.prisma` without a live database, then runs:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The CI `DATABASE_URL` is a placeholder used for Prisma schema validation only. Deployment environments still need real secrets and database credentials.

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

Production deployment variables, CORS, cookie settings, migrations, and smoke tests are documented in [docs/deployment.md](docs/deployment.md).

Browser E2E setup and CI strategy are documented in [docs/e2e.md](docs/e2e.md).

Calculator routes:

- `/calculators/required-grade`
- `/calculators/bms`
- `/calculators/efz`

## Deployment

No public production URL is committed in this repository yet. The supported deployment shape is:

- Web: Vercel project rooted at `apps/web`
- API: Render, Railway, or Fly service running `apps/api`
- Database: managed PostgreSQL such as Neon, Supabase, Render Postgres, or Railway Postgres

Use [docs/deployment.md](docs/deployment.md) for the complete deployment walkthrough, environment variable tables, cookie/CORS guidance, migration commands, and production smoke checklist.

Deployment command summary:

```bash
npm ci
npm run prisma:generate
npm run build
npm run prisma:deploy
```

Run `npm run prisma:deploy` only against staging or production databases that should receive committed migrations. Never run `prisma migrate reset` against production.

## API Surface

Health:

- `GET /health`

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
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

`npm audit --audit-level=moderate` is expected to pass. Next.js 16.2.6 still declares `postcss@8.4.31`, so the root npm `overrides` section and lockfile resolve Next's PostCSS edge to `postcss@8.5.14` until stable Next ships the patched dependency directly.

## Operator Runbook

Local bootstrap:

1. Install with `npm install`.
2. Copy `.env.example` to `.env`.
3. Start PostgreSQL and confirm `DATABASE_URL`.
4. Run `npm run prisma:generate`.
5. Run `npm run prisma:migrate`.
6. Run `npm run prisma:seed`.
7. Run `npm run dev`.

Reset local sample data:

1. Run `npm run prisma:seed` to reset only `demo.student@example.test`.
2. Run `npx prisma migrate reset` only when you want to wipe the local database and replay migrations.

Pre-PR quality gate:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Production release smoke:

1. Check `GET /health` on the API.
2. Open the web app home, demo, login, register, and calculator routes.
3. Register a disposable account.
4. Create one subject, one term, and one grade.
5. Refresh account mode and confirm saved records reload.
6. Export CSV, then import a small valid CSV row.
7. Check required-grade, BMS, and EFZ calculators with known values.
8. Log out and confirm protected account data is not accessible.

Screenshot refresh:

1. Run a production web build with the target API origin.
2. Start the web app locally.
3. Capture `docs/screenshots/*.png` for `/`, `/demo`, `/account`, `/calculators/required-grade`, `/calculators/bms`, and `/calculators/efz`.
4. Review the PNGs before committing so the README does not drift from the current UI.

## Troubleshooting

| Symptom                                        | Likely Cause                                                   | Fix                                                                                                |
| ---------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Environment variable not found: DATABASE_URL` | `.env` is missing or the shell did not load it.                | Copy `.env.example` to `.env` and rerun the Prisma command from the repo root.                     |
| Prisma `P1000` or `P1001`                      | PostgreSQL credentials are wrong or the server is unreachable. | Check the database is running, then update `DATABASE_URL`.                                         |
| `@prisma/client` has stale fields              | Prisma client was not regenerated after schema changes.        | Run `npm run prisma:generate`.                                                                     |
| Account page asks for login after login        | Cookies are blocked or the API origin is wrong.                | Check `NEXT_PUBLIC_API_URL`, `WEB_ORIGIN`, `COOKIE_SAME_SITE`, HTTPS, and browser cookie settings. |
| CORS errors in account mode                    | API `WEB_ORIGIN` does not exactly match the frontend origin.   | Use the exact scheme, host, and port, without a trailing slash.                                    |
| `npm run dev` port conflict                    | Another process uses `3000` or `3001`.                         | Stop the process or set `API_PORT`/`PORT` for the API and adjust `NEXT_PUBLIC_API_URL`.            |
| Next.js still calls an old API URL             | `NEXT_PUBLIC_API_URL` changed after build/start.               | Restart dev mode or rebuild the web app.                                                           |
| Workspace command cannot find a package        | Command was run from the wrong directory.                      | Run root scripts from the repository root or use `npm -w @notenrechner/<workspace> ...`.           |
| Playwright cannot find Chrome                  | The default E2E browser channel is not installed.              | Run `npx playwright install chromium`, then `PLAYWRIGHT_BROWSER_CHANNEL=bundled npm run test:e2e`. |

## V1 Feature Checklist

- [x] No-login demo mode
- [x] User registration and login
- [x] Subject, term, and grade management
- [x] Weighted averages and rounded semester grades
- [x] Required-grade calculator
- [x] BMS calculator with diagnostics
- [x] EFZ calculator with diagnostics
- [x] CSV import/export for demo and account modes
- [x] Ownership-scoped backend resource access
- [x] Prisma migration and deterministic local seed account
- [x] Deployment and operator documentation
- [x] Local Playwright end-to-end smoke tests for MVP workflows
- [x] Responsive, accessibility, and UI-state polish pass
- [x] Dark mode theme support
- [x] Stable Next.js/PostCSS dependency-security cleanup

## Known Limitations

- No public production deployment URL is documented yet.
- Teacher accounts, classes, invite codes, teacher-shared grades, PDF reports, Excel import, advanced analytics, and native/PWA wrappers are later features.
- The seed account is local demo data only and should not be used in production.
- The account-mode screenshot in this README uses local sample data; production data depends on the deployed database.
- The temporary Next.js/PostCSS npm override should be removed after stable Next ships a patched direct dependency.
