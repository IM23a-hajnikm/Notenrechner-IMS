---
namespace: journal
status: active
updated: 2026-05-18
---

# Backend API Coverage Success

Issue #2 added CI-safe endpoint coverage through a Nest test app with an in-memory Prisma substitute.

Coverage now includes:

- `GET /health`
- calculation endpoints for weighted average, required grade, BMS, and EFZ
- auth register, me, refresh, and logout cookie flow
- unauthenticated protected-route rejection
- subject, term, and grade CRUD happy paths
- cross-user read, update, delete, and grade-create ownership failures

The new suite exposed a real module-wiring issue: feature modules using `JwtAuthGuard` needed `AuthModule` imports, and `AuthModule` needed to export `JwtModule` for guard dependencies. That fix is included with #2.

Verification passed:

- `npm -w @notenrechner/api test`
- `npm test`
- `npm run typecheck`
- `npm -w @notenrechner/api run lint`
- `npm -w @notenrechner/api run build`
- targeted Prettier check for touched files
