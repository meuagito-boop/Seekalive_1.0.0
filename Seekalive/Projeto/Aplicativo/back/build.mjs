import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    // Bundle workspace TypeScript source, but resolve installed npm packages at runtime.
    alias: {
      "@workspace/api-zod": path.resolve(artifactDir, "../../shared/contracts/src/index.ts"),
      "@workspace/db": path.resolve(artifactDir, "../../infra/database/src/index.ts"),
    },
    packages: "external",
    sourcemap: "linked",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
