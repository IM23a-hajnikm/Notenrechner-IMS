# Notenrechner v2 - Codex Context Report

## Project Goal

Build a clean, modern, production-ready grade calculator web app for Swiss students.

This is a full remake of an older Notenrechner project. The previous version had a decent frontend direction but became messy around backend, database, authentication, and API integration. The goal of v2 is to rebuild from scratch with a serious full-stack portfolio architecture.

The app should first target students. Teacher/class features can come later. Students must be able to manually enter grades and eventually import grades from a file.

The project should become a real usable website for students, not just a school prototype.

## Preferred Architecture

- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui
- Backend: NestJS, TypeScript
- Database: PostgreSQL
- ORM: Prisma preferred
- Auth: JWT-based auth with secure HTTP-only cookies, or another production-safe auth approach
- Validation: Zod on frontend, class-validator or Zod-compatible validation on backend
- Testing: Unit tests for calculation logic, API tests for backend, Playwright/Cypress later for E2E
- Deployment target: Vercel for frontend, Render/Railway/Fly.io for backend, Neon/Supabase for PostgreSQL

Use a monorepo structure:

```txt
notenrechner-v2/
├── apps/
│   ├── web/       # Next.js frontend
│   └── api/       # NestJS backend
├── packages/
│   ├── shared/    # shared types, grade calculation logic, constants
│   └── config/    # shared eslint/tsconfig/prettier config if useful
├── prisma/
│   └── schema.prisma
├── docs/
│   └── grading-rules.md
├── README.md
└── CODEX_CONTEXT.md
```

Core calculation logic should live in a shared package so both frontend and backend can use and test the same functions.

## Product Scope: Student First

Build the student version first.

### Must-have MVP

- No-login demo mode
- User registration/login
- Dashboard
- Subjects
- Semesters/terms
- Grades/exams
- Weighted subject average
- Rounded semester grade
- BMS calculator
- EFZ calculator
- Required grade calculator
- CSV import/export
- Mobile-friendly design
- Dark mode if easy
- Clean README and deployment docs

### Later features

- Teacher accounts
- Classes
- Invite codes
- Shared grades from teachers
- Student/teacher role system
- PDF export
- Excel import
- Advanced analytics
- PWA/mobile app wrapper

## Core Domain Concepts

### User

A student using the app.

Fields: id, email, username/name, passwordHash or auth provider fields, createdAt, updatedAt.

### Subject

A school subject or module category.

Fields: id, userId, name, shortName, color, subjectType, archived, createdAt, updatedAt.

Possible subject types:

- regular
- bms_exam_subject
- bms_non_exam_subject
- bms_idpa_idaf
- efz_school_module
- efz_uek_module
- custom

### Term / Semester

A semester or time period.

Fields: id, userId, name, startDate, endDate, isActive, createdAt, updatedAt.

### Grade / Exam

An individual grade entered by the student.

Fields: id, userId, subjectId, termId, title, gradeValue, weight, date, type, notes, createdAt, updatedAt.

Examples:

- Pruefung 1, grade 5.0, weight 1
- LB01, grade 5.28, weight 0.33
- WR Test, grade 3.4, weight 33

## Swiss Grade Rounding Rules

### Round to nearest 0.5

Used for Swiss official semester grades, BMS position grades, BMS Fachnoten, and EFZ module group averages.

```ts
export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}
```

Important behavior:

- 4.24 -> 4.0
- 4.25 -> 4.5
- 3.75 -> 4.0

### Round to one decimal

Used for final BMS Gesamtnote and EFZ Erfahrungsnote.

```ts
export function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
```

### Optional round to 0.25

Useful as a display/internal feature, not usually official.

```ts
export function roundToQuarter(value: number): number {
  return Math.round(value * 4) / 4;
}
```

## Subject and Semester Calculation Logic

Individual exams inside a semester use weighted averages.

```ts
export function calculateWeightedAverage(items: { value: number; weight: number }[]): number | null {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return null;

  const totalScore = items.reduce((sum, item) => sum + item.value * item.weight, 0);
  return totalScore / totalWeight;
}
```

Official semester grade / Zeugnisnote:

```ts
export function calculateSemesterGrade(items: { value: number; weight: number }[]): number | null {
  const exactAverage = calculateWeightedAverage(items);
  if (exactAverage === null) return null;
  return roundToHalf(exactAverage);
}
```

Only the 0.5-rounded semester grade should be pushed into BMS Position 2.

## Required Grade Calculator

The app should include a "Benoetigte Note" calculator.

```ts
export function calculateRequiredGrade(
  currentItems: { value: number; weight: number }[],
  upcomingWeight: number,
  targetExactAverage: number,
): number | null {
  const currentTotalWeight = currentItems.reduce((sum, item) => sum + item.weight, 0);
  const currentTotalScore = currentItems.reduce((sum, item) => sum + item.value * item.weight, 0);

  if (upcomingWeight <= 0) return null;

  const requiredTotalScore = targetExactAverage * (currentTotalWeight + upcomingWeight);
  return (requiredTotalScore - currentTotalScore) / upcomingWeight;
}
```

Important: if a user wants a rounded semester grade of 4.5, they only need an exact average of 4.25 because Swiss 0.5 rounding rounds 4.25 up to 4.5.

## BMS Calculation Logic

BMS should be implemented as its own calculator module.

Position 2, Erfahrungsnote:

```ts
position2 = roundToHalf(sum(semesterGrades) / numberOfSemesterGrades);
```

Position 1, Pruefungsnote:

- For subjects with written and oral exam: `position1 = roundToHalf((writtenExam + oralExam) / 2)`
- For subjects with only one exam: `position1 = examGrade`

Final Fachnote:

- Standard exam subject: `fachnote = roundToHalf((position1 + position2) / 2)`
- Subject without final exam: `fachnote = position2`
- IDPA / IDAF exception: `fachnote = roundToHalf((idpaGrade + average(idafGrades)) / 2)`

BMS overall average:

```ts
gesamtnote = roundToOneDecimal(sum(fachnoten) / 9);
```

BMS passing criteria:

- `gesamtnote >= 4.0`
- `count(fachnoten < 4.0) <= 2`
- `sum(4.0 - fachnote for all fachnote < 4.0) <= 2.0`

Return detailed pass/fail diagnostics.

## EFZ Calculation Logic

School module average:

```ts
schoolAverage = roundToHalf(sum(schoolModules) / count(schoolModules));
```

UeK module average:

```ts
uekAverage = roundToHalf(sum(uekModules) / count(uekModules));
```

EFZ Erfahrungsnote:

```ts
erfa = roundToOneDecimal(schoolAverage * 0.8 + uekAverage * 0.2);
```

Student passes EFZ only if both conditions are true:

- `erfa >= 4.0`
- `ipa >= 4.0`

Return detailed pass/fail diagnostics.

## UX Requirements

The app should feel useful immediately.

Landing page:

- Explain what Notenrechner does
- CTA: "Demo starten"
- CTA: "Account erstellen"
- Mention Swiss BMS/EFZ support
- Mention weighted averages and required grade calculator

Demo mode:

- No login required
- Use local state or localStorage
- Allow sample data
- Show dashboard
- Allow adding/editing grades
- Clearly say data is local/demo-only
- Offer "Create account to save permanently"

Dashboard:

- Current semester average
- Best/worst subject
- Grades below 4.0
- BMS/EFZ status if configured
- Recent grades
- Quick add grade button
- Required grade shortcut

Grades page:

- Table/list of grades
- Filters by subject, semester, date
- Add/edit/delete grade
- Weight support
- Notes/title

Subjects page:

- Subject cards
- Average per subject
- Grade count
- Archive subject
- Color customization

Calculator pages:

- BMS calculator page with 9 Fachnoten and diagnostics
- EFZ calculator page with school modules, UeK modules, IPA, and diagnostics
- Required grade calculator UI

Import/export MVP:

- CSV export
- CSV import if feasible

## Backend Requirements

Use NestJS with clean modules:

- AuthModule
- UsersModule
- SubjectsModule
- TermsModule
- GradesModule
- CalculationsModule
- ImportExportModule
- HealthModule

Every user-owned resource must check ownership.

Bad:

```ts
updateGrade(id, dto);
```

Good:

```ts
updateGrade(userId, gradeId, dto);
```

Never allow a user to access or mutate another user's grades, subjects, or terms.

Use DTO validation for every request.

Add `GET /health`, returning:

```json
{ "status": "ok" }
```

## API Ideas

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Subjects:

- `GET /subjects`
- `POST /subjects`
- `GET /subjects/:id`
- `PATCH /subjects/:id`
- `DELETE /subjects/:id`

Terms:

- `GET /terms`
- `POST /terms`
- `GET /terms/:id`
- `PATCH /terms/:id`
- `DELETE /terms/:id`

Grades:

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

Calculation endpoints are useful, but shared calculation logic should also be available in the frontend for instant UI feedback.

## Testing Requirements

Calculation logic must be tested carefully.

Required unit tests:

- `roundToHalf`
- `4.24 -> 4.0`
- `4.25 -> 4.5`
- `3.75 -> 4.0`
- `roundToOneDecimal`
- weighted average
- semester grade
- required grade
- BMS Position 1
- BMS Position 2
- BMS Fachnote
- BMS pass/fail
- EFZ school average
- EFZ UeK average
- EFZ Erfahrungsnote
- EFZ pass/fail

Backend tests:

- user cannot access another user's grades
- user cannot update another user's subjects
- auth protected routes reject unauthenticated access
- CRUD works for grades/subjects/terms

## Development Principles

Prioritize:

- Correct grade calculation
- Data safety and ownership checks
- Clean architecture
- Good UX
- Tests
- Deployment readiness

Avoid:

- overbuilding teacher features too early
- mixing old v1 code into v2 without cleanup
- storing auth tokens insecurely if avoidable
- making calculations only in frontend without backend validation
- hardcoding user IDs
- building native apps before the web app is stable

## First Implementation Milestones

1. Project setup: monorepo, Next.js app, NestJS app, PostgreSQL + Prisma, shared package, linting/formatting, `.env.example`, README setup instructions.
2. Shared calculation engine: rounding utilities, weighted averages, required grade calculator, BMS calculator, EFZ calculator, unit tests.
3. Backend MVP: auth, user model, Subject CRUD, Term CRUD, Grade CRUD, ownership checks, calculation endpoints, health endpoint, API tests.
4. Frontend MVP: landing page, demo mode, dashboard, subjects, terms, grades, BMS, EFZ, required-grade UI.
5. Production polish: responsive layout, loading/error/empty states, CSV import/export, account persistence, deployment setup, README with screenshots, seed/demo data.

## Definition of Done

The app is done for v1 when:

- A student can use demo mode without logging in
- A student can create an account and save data
- A student can create subjects, semesters, and grades
- The app calculates weighted averages correctly
- The app calculates official rounded semester grades correctly
- The app calculates BMS status correctly
- The app calculates EFZ status correctly
- The app has a required grade calculator
- User data is protected by ownership checks
- The project can be deployed
- README explains setup, env vars, and deployment
- Unit tests cover calculation logic
