import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const require = createRequire(new URL("../artifacts/api-server/package.json", import.meta.url));
const { build } = require("esbuild");
const directory = await mkdtemp(join(tmpdir(), "seekalive-tests-"));
try {
  const outfile = join(directory, "content.test.cjs");
  await build({
    entryPoints: ["artifacts/social/tests/content.test.ts"], outfile,
    bundle: true, platform: "node", format: "cjs",
    tsconfig: "artifacts/social/tsconfig.json",
    logLevel: "error",
  });
  const result = spawnSync(process.execPath, ["--test", outfile], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
