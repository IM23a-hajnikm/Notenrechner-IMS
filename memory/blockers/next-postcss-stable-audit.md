# Next/PostCSS stable audit blocker

Date: 2026-05-18

While working issue #20, the Vitest/Vite/esbuild audit path was mitigated by upgrading
Vitest to 4.1.6 in the API and shared workspaces. The remaining `npm audit
--audit-level=moderate` failure is Next's nested PostCSS dependency:

- `next@16.2.6` is the latest stable release checked during the session.
- `next@16.2.6` declares `postcss@8.4.31`, which is below the audited fixed range.
- `next@16.3.0-canary.22` declares `postcss@8.5.10`, but moving the app to a
  canary framework release is not an acceptable hardening fix for stable production
  dependencies.
- npm overrides were tested and did not replace Next's nested PostCSS install.

Verification after the partial mitigation:

- `npm test` passed: shared 22 tests, API 25 tests.
- `npm run typecheck` passed.
- `npm run lint --workspaces --if-present` passed.
- `npm -w @notenrechner/api run build` passed.
- `npm -w @notenrechner/web run build` passed.
- Targeted Prettier check for package files passed.
- `npm audit --audit-level=moderate` still fails on Next/PostCSS only.

Issue #20 should remain blocked until a stable Next release includes a fixed PostCSS
dependency or a safe vendor-supported override path becomes available.
