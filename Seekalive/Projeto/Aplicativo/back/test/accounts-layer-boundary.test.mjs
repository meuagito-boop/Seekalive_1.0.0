import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { test } from "node:test";

const accountsRoot = fileURLToPath(new URL("../src/modules/accounts/", import.meta.url));

async function collectTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTypeScriptFiles(path);
    return entry.isFile() && entry.name.endsWith(".ts") ? [path] : [];
  }));
  return paths.flat();
}

test("Accounts application depends on ports, not concrete persistence", async () => {
  const files = await collectTypeScriptFiles(join(accountsRoot, "application"));
  const sources = await Promise.all(files.map((path) => readFile(path, "utf8")));

  for (const source of sources) {
    assert.doesNotMatch(source, /from\s+["'](?:@workspace\/db|drizzle-orm)["']/);
    assert.doesNotMatch(source, /\bdb\s*\./);
    assert.doesNotMatch(source, /from\s+["'][^"']*\/infrastructure\//);
  }
});

test("Accounts composition binds account repositories and Social views", async () => {
  const source = await readFile(join(accountsRoot, "composition/publicApi.ts"), "utf8");

  assert.match(source, /accountReadRepository/);
  assert.match(source, /social\/composition\/publicApi/);
  assert.match(source, /createAccountViews/);
});
