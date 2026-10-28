import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const require = createRequire(
  new URL("../Aplicativo/back/package.json", import.meta.url),
);
const { build } = require("esbuild");
const directory = await mkdtemp(join(tmpdir(), "seekalive-tests-"));
try {
  const testEntries = [
    "Aplicativo/front/tests/content.test.ts",
    "Aplicativo/front/tests/messages.test.ts",
    "Aplicativo/front/tests/notifications.test.ts",
    "Aplicativo/front/tests/onboarding.test.ts",
    "Aplicativo/front/tests/contracts.test.ts",
    "Aplicativo/front/tests/profilePresentation.test.ts",
    "Aplicativo/front/tests/profileEdit.test.ts",
    "Aplicativo/front/tests/relationshipActions.test.ts",
    "Aplicativo/front/tests/tabKeyboard.test.ts",
    "Aplicativo/front/tests/authSessionState.test.ts",
    "Aplicativo/front/tests/httpClient.test.ts",
    "Aplicativo/front/tests/registrationForm.test.ts",
  ];
  const testFiles = [];
  for (const entryPoint of testEntries) {
    const outfile = join(
      directory,
      `${entryPoint.split("/").at(-1).replace(/\.ts$/, "")}.cjs`,
    );
    await build({
      entryPoints: [entryPoint],
      outfile,
      bundle: true,
      platform: "node",
      format: "cjs",
      tsconfig: "Aplicativo/front/tsconfig.json",
      define: { "import.meta.env": JSON.stringify({ DEV: true }) },
      logLevel: "error",
    });
    testFiles.push(outfile);
  }
  const result = spawnSync(process.execPath, ["--test", ...testFiles], {
    stdio: "inherit",
  });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
