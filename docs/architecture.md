# Architecture

## Monorepo

The project uses npm workspaces:

- `packages/shared`: Swiss grading calculation engine and shared types
- `apps/api`: NestJS backend
- `apps/web`: Next.js frontend
- `prisma`: PostgreSQL schema

## Shared Calculations

Calculation logic belongs in `@notenrechner/shared`. The frontend uses it for instant feedback, and the backend uses it to validate calculation endpoints and future persisted results.

## Backend

The backend uses NestJS and Prisma. Every user-owned operation must accept `userId` and scope reads/writes with that `userId`.

Example service shape:

```ts
updateGrade(userId: string, gradeId: string, dto: UpdateGradeDto)
```

Avoid service methods that only accept a resource id for user-owned records.

## Frontend

The frontend uses Next.js App Router and Tailwind. Demo mode stores data locally and remains separated from authenticated account mode.

## Database

PostgreSQL is the production database. Prisma is the schema source of truth.
