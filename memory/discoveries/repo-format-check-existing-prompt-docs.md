---
namespace: discoveries
status: active
updated: 2026-05-18
---

# Repo Format Check Fails On Existing Prompt Docs

During #1 verification, `npm run format:check` reported formatting warnings in existing prompt doctrine files:

- `AICodingAgentSuperPrompt.md`
- `flagprompt.md`
- `hardeningprompt.md`

The #1 touched files were formatted separately and pass targeted Prettier checks. The repo-wide issue is tracked as GitHub #19 and should not be fixed opportunistically inside unrelated feature/security issues.
