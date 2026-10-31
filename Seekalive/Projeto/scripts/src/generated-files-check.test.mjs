import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { assertGeneratedFilesCurrent } from "./generated-files-check.mjs";

test("generated API docs check accepts current fixtures and rejects stale or missing files", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "seekalive-api-docs-"));
  context.after(() => rm(directory, { recursive: true, force: true }));

  const path = join(directory, "routes.generated.md");
  const output = { path, content: "# Current routes\n" };
  await writeFile(path, output.content);
  await assertGeneratedFilesCurrent([output]);

  await writeFile(path, "# Stale routes\n");
  await assert.rejects(
    assertGeneratedFilesCurrent([output]),
    /Generated API documentation is stale/,
  );

  await rm(path);
  await assert.rejects(
    assertGeneratedFilesCurrent([output]),
    /Generated API documentation is stale/,
  );
});
