---
name: Workspace bundle boundaries
description: Keep local TypeScript workspace sources and external npm runtime imports resolvable in server builds.
---

When building a server entrypoint in a pnpm workspace, resolve internal workspace TypeScript packages to local source paths before bundling them. Externalize installed third-party packages only when every emitted bare import is declared in the owning app's runtime dependencies. Do not assume a sibling workspace package's dependencies resolve from the server output directory.

**Why:** Node resolves bare imports from the emitted file's location, while workspace source entrypoints may still be TypeScript and are not necessarily runtime-loadable. A build can succeed yet fail when the server starts if external runtime imports are undeclared.

**How to apply:** When changing server bundling or deployment packaging, inspect emitted imports, verify the runtime manifest, and start the real workflow plus its health endpoint. Keep each esbuild version within its parent packages' declared compatibility range instead of forcing one global version.
