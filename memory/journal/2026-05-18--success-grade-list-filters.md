# Success: grade list filters

Date: 2026-05-18

Issue #7 added grade list ergonomics to account and demo mode:

- Filters for search, subject, semester, grade type, date range, and grades under
  4.0.
- Sorting by date, grade value, subject, semester, and weight.
- Active filter labels, result counts, reset action, and empty filtered states.
- Filtering is local UI state only and does not mutate saved account or demo
  grades.

Verification:

- `npm -w @notenrechner/web run typecheck` passed.
- `npm -w @notenrechner/web run lint` passed.
- `npm -w @notenrechner/web run build` passed.
- Targeted Prettier check passed.
- Browser smoke test passed with local Edge on `http://localhost:3002/account`
  and `http://localhost:3002/demo` for filtering, sorting, reset, and empty
  state behavior.
