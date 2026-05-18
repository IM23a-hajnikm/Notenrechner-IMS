# Success: account view split

Date: 2026-05-18

Issue #5 split the account mode into durable, focused views:

- Dashboard keeps the account summary, quick grade entry, required-grade shortcut,
  and recent grades.
- Subjects, terms, and grades now have separate URL-addressable views through
  `?view=subjects`, `?view=terms`, and `?view=grades`.
- The account route wraps the dashboard client component in Suspense so query
  state can be read without breaking the production build.

Verification:

- `npm -w @notenrechner/web run typecheck` passed.
- `npm -w @notenrechner/web run lint` passed.
- `npm -w @notenrechner/web run build` passed.
- Targeted Prettier check passed.
- Browser smoke test passed with local Edge on `http://localhost:3002/account`
  using mocked account API responses for navigation and quick grade creation.
