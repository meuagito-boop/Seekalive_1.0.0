import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { test } from "node:test";

const socialRoot = fileURLToPath(new URL("../src/modules/social/", import.meta.url));

async function collectTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTypeScriptFiles(path);
    return entry.isFile() && entry.name.endsWith(".ts") ? [path] : [];
  }));
  return paths.flat();
}

test("Social application and presentation layers do not issue database queries", async () => {
  const files = await collectTypeScriptFiles(join(socialRoot, "application"));
  files.push(...await collectTypeScriptFiles(join(socialRoot, "presentation")));
  const sources = await Promise.all(files.map((path) => readFile(path, "utf8")));

  for (const source of sources) {
    assert.doesNotMatch(source, /from\s+["'](?:@workspace\/db|drizzle-orm)["']/);
    assert.doesNotMatch(source, /\bdb\s*\./);
  }
});

test("Social infrastructure owns SQL and transaction adapters", async () => {
  const files = await collectTypeScriptFiles(join(socialRoot, "infrastructure"));
  const sources = await Promise.all(files.map((path) => readFile(path, "utf8")));

  assert.ok(sources.some((source) => source.includes("@workspace/db")));
  assert.ok(sources.some((source) => source.includes("drizzle-orm")));
  assert.ok(sources.some((source) => source.includes("db.transaction")));
});
