import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { test } from "node:test";

const socialRoot = fileURLToPath(
  new URL("../src/modules/social/", import.meta.url),
);

async function collectTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return collectTypeScriptFiles(path);
      return entry.isFile() && entry.name.endsWith(".ts") ? [path] : [];
    }),
  );
  return paths.flat();
}

test("Social application and presentation layers depend on ports, not persistence adapters", async () => {
  const files = await collectTypeScriptFiles(join(socialRoot, "application"));
  files.push(
    ...(await collectTypeScriptFiles(join(socialRoot, "presentation"))),
  );
  const sources = await Promise.all(
    files.map((path) => readFile(path, "utf8")),
  );

  for (const source of sources) {
    assert.doesNotMatch(
      source,
      /from\s+["'](?:@workspace\/db|drizzle-orm)["']/,
    );
    assert.doesNotMatch(source, /\bdb\s*\./);
    assert.doesNotMatch(
      source,
      /from\s+["'][^"']*\/infrastructure\//,
      "Social application and presentation must not import concrete persistence adapters.",
    );
  }

  const applicationFiles = await collectTypeScriptFiles(
    join(socialRoot, "application"),
  );
  const applicationSources = await Promise.all(
    applicationFiles.map((path) => readFile(path, "utf8")),
  );
  for (const source of applicationSources) {
    assert.doesNotMatch(
      source,
      /from\s+["'][^"']*modules\/(?:accounts|feed)\/application\//,
      "Social application must not reach into another domain's application implementation.",
    );
  }
});

test("Social presentation receives services from its composition root", async () => {
  const presentationFiles = await collectTypeScriptFiles(
    join(socialRoot, "presentation"),
  );
  const presentationSources = await Promise.all(
    presentationFiles.map((path) => readFile(path, "utf8")),
  );
  for (const source of presentationSources) {
    assert.doesNotMatch(
      source,
      /from\s+["'][^"']*\/composition\//,
      "Social presentation must receive composed services as dependencies.",
    );
  }

  const compositionRouter = await readFile(
    join(socialRoot, "composition", "router.ts"),
    "utf8",
  );
  assert.match(compositionRouter, /createFollowAccountRoutes/);
  assert.match(compositionRouter, /createAccountSearchRoutes/);
  assert.match(compositionRouter, /relationshipListServices/);

  const modulesEntry = await readFile(
    fileURLToPath(new URL("../src/modules/index.ts", import.meta.url)),
    "utf8",
  );
  assert.match(modulesEntry, /social\/composition\/router/);
});

test("Social infrastructure owns SQL and transaction adapters", async () => {
  const files = await collectTypeScriptFiles(
    join(socialRoot, "infrastructure"),
  );
  const sources = await Promise.all(
    files.map((path) => readFile(path, "utf8")),
  );

  assert.ok(sources.some((source) => source.includes("@workspace/db")));
  assert.ok(sources.some((source) => source.includes("drizzle-orm")));
  assert.ok(sources.some((source) => source.includes("db.transaction")));
});

test("Social composition binds use-case ports to infrastructure adapters", async () => {
  const files = await collectTypeScriptFiles(join(socialRoot, "composition"));
  const sources = await Promise.all(
    files.map((path) => readFile(path, "utf8")),
  );
  const composition = sources.join("\n");

  assert.match(composition, /createFollowAccount/);
  assert.match(composition, /persistFollowAccount/);
  assert.match(composition, /createRelationshipListQueries/);
  assert.match(composition, /listFollowerIds/);
  assert.match(composition, /createAccountSearchRoutes/);
});
