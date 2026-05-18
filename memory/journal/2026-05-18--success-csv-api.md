# Success: CSV import/export API

Date: 2026-05-18

Issue #3 added the backend CSV import/export module:

- `GET /import-export/csv` exports the current user's subjects, terms, and grades
  as a single CSV file.
- `POST /import-export/grades/csv` imports grade rows from CSV text supplied in a
  JSON body.
- Imports map subjects and terms by owned id or owned name, validate row values,
  and reject the whole import with row-level errors before creating anything.
- Cross-user subject and term ids are rejected during import.

Verification:

- `npm -w @notenrechner/api test` passed.
- `npm run typecheck` passed.
- `npm run lint --workspaces --if-present` passed.
- `npm run format:check` passed.
