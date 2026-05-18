---
namespace: context
status: active
updated: 2026-05-18
---

# Mission Brief

Objective: autonomously resolve all open GitHub issues in `IM23a-hajnikm/Notenrechner-IMS` while obeying `AICodingAgentSuperPrompt.md`, `flagprompt.md`, `hardeningprompt.md`, and `CODEX_CONTEXT.md`.

Current architectural source of truth:

- Monorepo with `apps/web` (Next.js), `apps/api` (NestJS), `packages/shared` (calculation logic), and Prisma.
- Swiss grading rules are governed by `CODEX_CONTEXT.md`, especially BMS, EFZ, weighted averages, and 0.5 / one-decimal rounding.
- GitHub issue coordination is mandatory: claim before code changes, comment milestones, verify before closure.

Current claimed issue:

- #1 `[Backend MVP] Add refresh-token session lifecycle and auth hardening`
- Claimed by `agent:codex` on 2026-05-18 at commit `c60d136`.
