# Deployment config pass

Date: 2026-05-18

Issue #16 exposed two deployment configuration mismatches that belong in the
deployment work:

- The API listened only to `API_PORT`; hosted Node services usually inject `PORT`.
  The bootstrap now prefers `API_PORT`, then `PORT`, then local default `3001`.
- Production auth cookies need configurable SameSite behavior. Same-site custom
  domains can use `lax`; split platform domains such as Vercel plus Render need
  `none` with HTTPS/Secure cookies.

Also discovered that the repo has no committed Prisma migration history. Filed
GitHub issue #23 and did not create migrations inside #16.
