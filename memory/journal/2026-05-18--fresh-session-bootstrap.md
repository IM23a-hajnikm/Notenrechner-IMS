---
namespace: journal
status: active
updated: 2026-05-18
---

# Fresh Session Bootstrap

`./memory/` did not exist at session start, so the required SAMP directories were created.

Read before work:

- `AICodingAgentSuperPrompt.md`
- `flagprompt.md`
- `hardeningprompt.md`
- `CODEX_CONTEXT.md`

GitHub state:

- No open issues were labeled `status:in-progress`.
- No open issues were labeled `status:blocked`.
- Open issue queue uses `source:codex` rather than `source:agent`.
- #1 was claimed via GitHub CLI after adding the missing coordination labels `status:in-progress` and `agent:codex`.

Next action:

- Inspect AuthModule, Prisma refresh-token schema, cookie config, and tests for #1.
