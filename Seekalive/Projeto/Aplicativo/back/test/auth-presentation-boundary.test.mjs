import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const presentationDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/modules/auth/presentation",
);

async function findTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findTypeScriptFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".ts") ? [entryPath] : [];
  }));
  return nestedFiles.flat();
}

test("Auth presentation does not import or call database persistence directly", async () => {
  const files = await findTypeScriptFiles(presentationDirectory);
  assert.ok(files.length > 0, "Auth presentation should contain route adapters.");

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const relativePath = path.relative(presentationDirectory, file);
    assert.doesNotMatch(
      source,
      /(?:from\s*|import\s*\()\s*["'](?:@workspace\/db|drizzle-orm)(?:\/[^"']*)?["']/,
      `${relativePath} must not import database packages.`,
    );
    assert.doesNotMatch(
      source,
      /\bdb\s*\./,
      `${relativePath} must not call the database client directly.`,
    );
  }
});
