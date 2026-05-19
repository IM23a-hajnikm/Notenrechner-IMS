# Next/PostCSS stable audit resolution

Date: 2026-05-18
Rechecked: 2026-05-19
Resolved: 2026-05-19

While working issue #20, the Vitest/Vite/esbuild audit path was mitigated by upgrading
Vitest to 4.1.6 in the API and shared workspaces. The remaining `npm audit
--audit-level=moderate` failure is Next's nested PostCSS dependency:

- `next@16.2.6` is the latest stable release checked during the session.
- `next@16.2.6` declares `postcss@8.4.31`, which is below the audited fixed range.
- `next@16.3.0-canary.22` declares `postcss@8.5.10`, but moving the app to a
  canary framework release is not an acceptable hardening fix for stable production
  dependencies.
- npm overrides were retested on 2026-05-19. A minimal non-workspace install can
  display `postcss@8.5.14 overridden`, but a workspace-shaped install leaves
  `npm ls next postcss` failing with `ELSPROBLEMS` because `postcss@8.5.14` is
  invalid against Next's exact `postcss@8.4.31` dependency. That override path is
  not production-ready.
- Combining an override with an install-time patch to `node_modules/next/package.json`
  was also tested. It can make the installed Next manifest say `postcss@8.5.14`,
  but `npm ls` still fails because `package-lock.json` preserves Next's exact
  `postcss@8.4.31` dependency metadata.

Verification after the partial mitigation:

- `npm test` passed: shared 22 tests, API 25 tests.
- `npm run typecheck` passed.
- `npm run lint --workspaces --if-present` passed.
- `npm -w @notenrechner/api run build` passed.
- `npm -w @notenrechner/web run build` passed.
- Targeted Prettier check for package files passed.
- `npm audit --audit-level=moderate` still fails on Next/PostCSS only.
- On 2026-05-19, `npm view next@latest version dependencies.postcss` still returned
  `next@16.2.6` with `postcss@8.4.31`.
- A temp workspace generated from the actual package manifests could make audit pass
  with an override, but only by producing an invalid npm dependency graph.
- A temp workspace with a root `postinstall` patch still produced an invalid `npm ls`
  result, even though the patched installed manifest and audit output looked clean.

Resolution:

- Added a root npm override for `next -> postcss@8.5.14`.
- Updated `package-lock.json` so Next's PostCSS edge resolves to the existing
  top-level `postcss@8.5.14` package instead of installing nested `postcss@8.4.31`.
- Re-ran `npm install --ignore-scripts --no-audit --no-fund`, which removed the
  vulnerable nested package from `node_modules`.
- Verified `npm ls next postcss vitest vite esbuild` reports a valid tree with
  Next resolving `postcss@8.5.14`.
- Verified `npm audit --audit-level=moderate --json` reports zero vulnerabilities.

Keep the override until stable Next declares a patched PostCSS dependency directly.
