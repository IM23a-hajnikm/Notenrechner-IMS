---
namespace: blockers
status: active
severity: medium
updated: 2026-05-18
---

# Local Postgres Cookie Flow Blocker

While resolving #1, local TCP connectivity to `localhost:5432` succeeded, but Prisma could not push the schema to either:

- `postgresql://postgres:postgres@localhost:5432/notenrechner_v2_codex_issue1?schema=public`
- `postgresql://postgres:postgres@localhost:5432/notenrechner_v2?schema=public`

Observed command failure:

```txt
npx prisma db push --skip-generate
Error: Schema engine error:
```

Docker CLI is installed, but Docker Desktop's Linux engine pipe is unavailable, so an ephemeral Postgres container could not be used for the live API cookie-flow check.

Impact: #1 has service/controller regression coverage for cookie issuance, refresh rotation, expired/reused rejection, and logout revocation, but no live local HTTP + PostgreSQL FSV run was completed in this session.
