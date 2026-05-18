# Success: demo CRUD parity

Date: 2026-05-18

Issue #4 expanded demo mode from grade-only entry into local subject, term, and
grade management:

- Subjects now support create, edit, archive, delete, colors, short names, and
  subject types.
- Terms now support create, edit, active-term selection, and delete.
- Grades now support create, edit, delete, subject, term, title, value, weight,
  date, type, and notes.
- Demo state persists in localStorage, migrates the older demo shape, and resets
  through a two-step confirmation.

Verification:

- `npm -w @notenrechner/web run typecheck` passed.
- `npm -w @notenrechner/web run lint` passed.
- `npm -w @notenrechner/web run build` passed.
- Targeted Prettier check passed.
- Browser smoke test passed with local Edge on `http://localhost:3002/demo`.

During browser verification a hydration mismatch was found and fixed by loading
localStorage after mount instead of during the initial render.
