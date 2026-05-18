# Success: prompt format check scoping

Date: 2026-05-18

Issue #19 fixed the repo-wide format check without changing prompt doctrine
content:

- Added `.prettierignore` for `AICodingAgentSuperPrompt.md`, `flagprompt.md`,
  and `hardeningprompt.md`.
- The long operating-doctrine prompts remain byte-for-byte semantically untouched
  while product code and normal docs still participate in Prettier checks.

Verification:

- `npm run format:check` passed.
- `npm run lint --workspaces --if-present` passed.
