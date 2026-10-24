import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveDatabaseConnectionUrl } from "../../infra/database/src/connection.ts";

const replitUrl = "postgresql://replit:test@db.invalid/seekalive";
const externalUrl = "postgresql://external:test@db.invalid/seekalive";

test("runtime defaults to the Replit-managed connection", () => {
  assert.equal(
    resolveDatabaseConnectionUrl({ DATABASE_URL: replitUrl }, "runtime"),
    replitUrl,
  );
});

test("runtime selects the external connection only when explicitly requested", () => {
  assert.equal(
    resolveDatabaseConnectionUrl(
      {
        DATABASE_URL: replitUrl,
        SEEKALIVE_DATABASE_TARGET: "external",
        SEEKALIVE_EXTERNAL_DATABASE_URL: externalUrl,
      },
      "runtime",
    ),
    externalUrl,
  );
});

test("migrations stay on Replit by default even when runtime uses an external database", () => {
  assert.equal(
    resolveDatabaseConnectionUrl(
      {
        DATABASE_URL: replitUrl,
        SEEKALIVE_DATABASE_TARGET: "external",
        SEEKALIVE_EXTERNAL_DATABASE_URL: externalUrl,
      },
      "migration",
    ),
    replitUrl,
  );
});

test("external migrations require their own explicit target", () => {
  assert.equal(
    resolveDatabaseConnectionUrl(
      {
        DATABASE_URL: replitUrl,
        SEEKALIVE_DB_MIGRATION_TARGET: "external",
        SEEKALIVE_EXTERNAL_DATABASE_URL: externalUrl,
      },
      "migration",
    ),
    externalUrl,
  );
});

test("external target fails clearly when its secret is missing", () => {
  assert.throws(
    () =>
      resolveDatabaseConnectionUrl(
        { SEEKALIVE_DATABASE_TARGET: "external" },
        "runtime",
      ),
    /SEEKALIVE_EXTERNAL_DATABASE_URL is required/,
  );
});

test("invalid targets and non-PostgreSQL URLs are rejected", () => {
  assert.throws(
    () =>
      resolveDatabaseConnectionUrl(
        { DATABASE_URL: replitUrl, SEEKALIVE_DATABASE_TARGET: "other" },
        "runtime",
      ),
    /SEEKALIVE_DATABASE_TARGET must be either/,
  );
  assert.throws(
    () => resolveDatabaseConnectionUrl({ DATABASE_URL: "https://invalid.test" }, "runtime"),
    /must use the postgres or postgresql protocol/,
  );
});
