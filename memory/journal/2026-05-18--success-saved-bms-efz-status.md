# Success: saved BMS and EFZ status

Date: 2026-05-18

Issue #8 connected account dashboard status cards to saved subject and grade
data:

- BMS status now derives semester grades from subjects marked as BMS subject
  types and uses `calculateBmsResult` from `@notenrechner/shared`.
- BMS exam, IDPA, and IDAF inputs can be filled directly on the dashboard when
  saved grade rows do not contain those final values.
- EFZ status now derives school and UeK module grades from EFZ subject types and
  uses `calculateEfzResult` from `@notenrechner/shared`.
- Incomplete BMS/EFZ data is shown as incomplete with diagnostics instead of a
  misleading pass/fail result.

Verification:

- `npm -w @notenrechner/web run typecheck` passed.
- `npm -w @notenrechner/web run lint` passed.
- `npm -w @notenrechner/web run build` passed.
- Targeted Prettier check passed.
- Browser smoke test passed with local Edge on `http://localhost:3002/account`
  for complete BMS data and EFZ data moving from incomplete to passed after IPA
  entry.
