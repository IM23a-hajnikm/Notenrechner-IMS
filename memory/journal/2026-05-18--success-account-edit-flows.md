# Success: account edit flows

Date: 2026-05-18

Issue #6 added full edit flows to account mode:

- Subjects can be edited for name, short name, color, type, and archived state.
- Terms can be edited for name, date range, and active state.
- Grades can be edited for subject, term, title, value, weight, date, type, and
  notes through the existing backend PATCH route.
- Delete actions now require confirmation before calling the API.
- Failed edit requests keep the draft open and show the API error message.

Verification:

- `npm -w @notenrechner/web run typecheck` passed.
- `npm -w @notenrechner/web run lint` passed.
- `npm -w @notenrechner/web run build` passed.
- Targeted Prettier check passed.
- Browser smoke test passed with local Edge on `http://localhost:3002/account`
  using mocked account API responses for failed subject edit, subject PATCH, term
  PATCH, grade PATCH, recalculated dashboard summary, and delete confirmation.
