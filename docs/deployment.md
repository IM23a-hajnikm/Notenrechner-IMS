# Deployment Guide

This app deploys as three services:

- Next.js web app on Vercel
- NestJS API on Render, Railway, or Fly.io
- PostgreSQL on Neon, Supabase, Render Postgres, or another managed PostgreSQL host

Use HTTPS everywhere. Production account mode depends on browser cookies, so the frontend and API origins must be configured as a pair.

## Runtime Versions

- Node.js 24 LTS is recommended.
- Node.js 20.19+ is the minimum practical runtime for the current workspace toolchain.
- npm is pinned through the root `packageManager` field.

## Production Environment Variables

### Web

Set these on the Vercel project for `apps/web`.

| Variable              | Example                       | Notes                                               |
| --------------------- | ----------------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `https://api.notenrechner.ch` | Public API origin. Do not include a trailing slash. |

`NEXT_PUBLIC_API_URL` is embedded into the client build. Update it for preview and production environments before building.

### API

Set these on the API service.

| Variable             | Example                                    | Notes                                                      |
| -------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| `NODE_ENV`           | `production`                               | Required for secure cookies and fail-closed auth secrets.  |
| `DATABASE_URL`       | `postgresql://USER:PASSWORD@HOST:5432/DB`  | Use the provider's pooled or direct production connection. |
| `JWT_ACCESS_SECRET`  | generated 32+ byte random value            | Required in production.                                    |
| `JWT_REFRESH_SECRET` | different generated 32+ byte random value  | Required in production.                                    |
| `WEB_ORIGIN`         | `https://notenrechner.ch`                  | Exact frontend origin for credentialed CORS.               |
| `COOKIE_SAME_SITE`   | `lax` for same-site, `none` for cross-site | See the cookie section below.                              |
| `COOKIE_DOMAIN`      | `.notenrechner.ch`                         | Optional. Usually leave empty for host-only API cookies.   |
| `PORT`               | provider managed                           | Render/Railway/Fly usually inject this automatically.      |
| `API_PORT`           | `3001`                                     | Optional local override. `PORT` is used when unset.        |

Generate each JWT secret separately:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

## CORS And Cookies

The API allows one credentialed CORS origin: `WEB_ORIGIN`. It must match the deployed frontend origin exactly, including scheme and without a trailing slash.

Preferred production setup:

- Frontend: `https://notenrechner.ch`
- API: `https://api.notenrechner.ch`
- `WEB_ORIGIN=https://notenrechner.ch`
- `NEXT_PUBLIC_API_URL=https://api.notenrechner.ch`
- `COOKIE_SAME_SITE=lax`

This keeps the app same-site while still splitting frontend and backend hosts.

If you use platform domains such as `*.vercel.app` for the frontend and `*.onrender.com` for the API, the browser treats the calls as cross-site. Set:

```bash
COOKIE_SAME_SITE=none
NODE_ENV=production
```

`SameSite=None` cookies require HTTPS and the `Secure` attribute. The API sets `Secure` automatically in production.

## Database And Migrations

Production deploys must use committed Prisma migrations:

```bash
npm run prisma:generate
npm run prisma:deploy
```

`npm run prisma:deploy` runs `prisma migrate deploy`, which applies pending migrations in production and staging environments.

Current blocker: the repository has a Prisma schema but no committed `prisma/migrations` history yet. Track that separately in issue #23 before relying on automated production migrations.

Rollback expectations:

- App rollback: redeploy the previous known-good Git commit for both web and API.
- Database rollback: do not run `migrate reset` in production. Take a managed database backup before risky migrations and prefer a forward corrective migration. Use Prisma migration repair commands only after reviewing the failed migration state.

## Vercel Web Deployment

1. Import the repository into Vercel.
2. Select `apps/web` as the project root for the Next.js app.
3. Use the Next.js framework preset.
4. Keep npm as the package manager.
5. Set `NEXT_PUBLIC_API_URL` for Preview and Production.
6. Build with `npm run build`; the web workspace runs the shared package build first.

Vercel supports monorepos with separate projects per app directory and injects framework-prefixed public variables such as `NEXT_PUBLIC_*` into builds.

## Render API Deployment

The root `render.yaml` defines the API service:

- Node runtime in the Frankfurt region
- `npm ci && npm run prisma:generate && npm run build:api`
- `npm run prisma:deploy` as the pre-deploy migration command
- `npm -w @notenrechner/api run start`
- HTTP health checks at `/health`
- generated JWT secrets
- prompted `WEB_ORIGIN` and `DATABASE_URL`

For Neon or Supabase PostgreSQL, paste the provider connection string into `DATABASE_URL`. For Render Postgres, you can adapt `render.yaml` to reference a Render database via `fromDatabase`.

## Railway Or Fly API Deployment

Use the same commands if you choose Railway or Fly instead of Render:

```bash
npm ci
npm run prisma:generate
npm run build:api
npm run prisma:deploy
npm -w @notenrechner/api run start
```

The API listens on `PORT` when the platform provides it. Keep `WEB_ORIGIN`, `DATABASE_URL`, the JWT secrets, and cookie settings identical to the Render setup.

## Production Smoke Test

Run this checklist after each production deploy:

1. `GET https://api.example.com/health` returns `{ "status": "ok" }`.
2. Open the web app and confirm the home, calculator, login, and register routes render.
3. Register a new account with a disposable email.
4. Confirm the browser receives `nr_access_token` and `nr_refresh_token` cookies from the API response.
5. Create one subject, one term, and one grade in account mode.
6. Refresh the page and confirm the saved records reload from the API.
7. Run required-grade, BMS, and EFZ calculators with known passing values.
8. Log out, then confirm protected account data is no longer accessible.

## References

- [Vercel monorepo deployments](https://vercel.com/docs/monorepos)
- [Vercel framework environment variables](https://vercel.com/docs/environment-variables/framework-environment-variables)
- [Render Blueprint YAML reference](https://render.com/docs/blueprint-spec)
- [Render health checks](https://render.com/docs/health-checks)
- [Prisma migrate deploy](https://docs.prisma.io/docs/cli/migrate/deploy)
- [Railway start command](https://docs.railway.com/deployments/start-command)
