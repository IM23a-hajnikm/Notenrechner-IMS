---
namespace: discoveries
status: active
updated: 2026-05-18
---

# npm Audit Moderate Toolchain Advisories

While preparing #2 endpoint-test dependencies, `npm audit --audit-level=moderate --json` reported moderate advisories in the existing dependency graph:

- `next` via bundled `postcss` (`GHSA-qx2v-qp2m-jg93`)
- `vitest` / `vite` / `vite-node` / `@vitest/mocker`
- `vite` (`GHSA-4w7w-66w2-5vf9`)
- `esbuild` (`GHSA-67mh-4wv8-2f99`)

The fixes require a dedicated dependency-maintenance pass because the suggested `vitest` fix is semver-major and the `next` fix path reported by npm audit is not a straightforward patch upgrade. Tracked as GitHub #20.
