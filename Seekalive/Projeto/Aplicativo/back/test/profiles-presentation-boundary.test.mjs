import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const profilesDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/modules/profiles",
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

test("Profiles application and presentation delegate database access to infrastructure", async () => {
  for (const layer of ["application", "presentation"]) {
    const directory = path.join(profilesDirectory, layer);
    const files = await findTypeScriptFiles(directory);
    assert.ok(files.length > 0, `Profiles ${layer} should contain focused modules.`);

    for (const file of files) {
      const source = await readFile(file, "utf8");
      const relativePath = path.relative(profilesDirectory, file);
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
  }

  const infrastructureFiles = await findTypeScriptFiles(path.join(profilesDirectory, "infrastructure"));
  const infrastructureSources = await Promise.all(
    infrastructureFiles.map((file) => readFile(file, "utf8")),
  );
  assert.ok(
    infrastructureSources.some((source) => /from\s*["']@workspace\/db["']/.test(source)),
    "Profiles infrastructure must own database adapters.",
  );

  const publicProfileRoute = await readFile(
    path.join(profilesDirectory, "presentation/publicProfileRoutes.ts"),
    "utf8",
  );
  assert.match(publicProfileRoute, /getPublicProfileByUsername/);
  assert.match(publicProfileRoute, /getPublicAccountById/);
  assert.doesNotMatch(publicProfileRoute, /listProfilePosts|getRelationshipFor|accountView/);
});
