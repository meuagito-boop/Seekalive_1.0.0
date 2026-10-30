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
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return findTypeScriptFiles(entryPath);
      return entry.isFile() && entry.name.endsWith(".ts") ? [entryPath] : [];
    }),
  );
  return nestedFiles.flat();
}

test("Profiles application and presentation delegate database access to infrastructure", async () => {
  const applicationFiles = await findTypeScriptFiles(
    path.join(profilesDirectory, "application"),
  );
  const presentationFiles = await findTypeScriptFiles(
    path.join(profilesDirectory, "presentation"),
  );
  assert.ok(
    applicationFiles.length > 0,
    "Profiles application must contain use cases.",
  );
  assert.ok(
    presentationFiles.length > 0,
    "Profiles presentation must contain routes.",
  );

  for (const file of applicationFiles) {
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
    assert.doesNotMatch(
      source,
      /from\s*["']\.\.\/infrastructure\//,
      `${relativePath} must depend on a Profiles application port, not an adapter.`,
    );
    assert.doesNotMatch(
      source,
      /from\s*["'][^"']+\/composition\//,
      `${relativePath} must not import runtime composition from another module.`,
    );
  }

  for (const file of presentationFiles) {
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
    const normalizedImports = source.replace(/\s+/g, " ");
    assert.doesNotMatch(
      normalizedImports,
      /\bimport\s+(?!type\b)[^;]*?\sfrom\s*["']\.\.\/application\//,
      `${relativePath} must receive application operations through composition.`,
    );
  }

  const infrastructureFiles = await findTypeScriptFiles(
    path.join(profilesDirectory, "infrastructure"),
  );
  const infrastructureSources = await Promise.all(
    infrastructureFiles.map((file) => readFile(file, "utf8")),
  );
  assert.ok(
    infrastructureSources.some((source) =>
      /from\s*["']@workspace\/db["']/.test(source),
    ),
    "Profiles infrastructure must own database adapters.",
  );

  const publicProfileRoute = await readFile(
    path.join(profilesDirectory, "presentation/publicProfileRoutes.ts"),
    "utf8",
  );
  assert.match(publicProfileRoute, /getPublicProfileByUsername/);
  assert.match(publicProfileRoute, /getPublicAccountById/);
  assert.doesNotMatch(
    publicProfileRoute,
    /listProfilePosts|getRelationshipFor|accountView/,
  );

  const composition = await readFile(
    path.join(profilesDirectory, "composition/router.ts"),
    "utf8",
  );
  assert.match(composition, /createOwnerProfileIdentityLoader/);
  assert.match(composition, /createOwnerProfileUpdater/);
  assert.match(composition, /createPrivacySettingsService/);
  assert.match(composition, /createPublicProfileRouter/);
  assert.match(composition, /findOwnerProfileIdentity/);
  const entrypoint = await readFile(
    path.resolve(profilesDirectory, "../index.ts"),
    "utf8",
  );
  assert.match(entrypoint, /profiles\/composition\/router/);
});

test("Profiles owns commercial profile data and has no dependency on Seek", async () => {
  const composition = await readFile(
    path.join(profilesDirectory, "composition/router.ts"),
    "utf8",
  );
  const profilesSchema = await readFile(
    path.resolve(
      profilesDirectory,
      "../../../../../infra/database/src/schema/profiles/businessProfiles.ts",
    ),
    "utf8",
  );

  assert.match(profilesSchema, /profilesTable\("business_profiles"/);
  assert.match(composition, /commercialProfileDetailsRepository/);
  assert.doesNotMatch(composition, /(?:\.\.\/)+seek\//);
});
