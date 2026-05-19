# End-to-End Smoke Tests

The E2E suite uses Playwright from the repository root.

```bash
npm run test:e2e
```

The Playwright config builds the web app, starts the production server on `127.0.0.1:3100`, and points account-mode API calls at `127.0.0.1:3999`. Account tests intercept that API origin in the browser and return deterministic mock data, so the suite does not depend on a developer's local PostgreSQL state.

## Coverage

- Demo mode first-run sample data
- Demo add, edit, delete, reset, CSV export, and CSV import flows
- Register, login, and logout UI paths through the account API contract
- Account subject, term, and grade CRUD through mocked HTTP responses
- Account CSV export/import through the mocked import/export API
- Required-grade, BMS, and EFZ calculator smoke paths

## Browser Setup

By default the config uses the installed Google Chrome channel:

```bash
npm run test:e2e
```

If Chrome is not installed, install Playwright's bundled Chromium and run with the bundled browser:

```bash
npx playwright install chromium
PLAYWRIGHT_BROWSER_CHANNEL=bundled npm run test:e2e
```

On PowerShell, set the variable before the command:

```powershell
$env:PLAYWRIGHT_BROWSER_CHANNEL = "bundled"
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_BROWSER_CHANNEL
```

Use headed mode while developing tests:

```bash
npm run test:e2e:headed
```

## CI Strategy

The default GitHub Actions quality gate intentionally skips E2E for now. Reasons:

- Browser installation/cache policy has not been chosen for the private-repo Actions minute budget.
- The deterministic account suite uses mocked HTTP responses; true database-backed browser tests need a dedicated disposable PostgreSQL service and secrets policy.

The normal CI job still runs lint, typecheck, unit/API tests, Prisma validation, and production build. Run `npm run test:e2e` locally before merging UI workflow changes and promote it into CI once the browser and database strategy is agreed.
