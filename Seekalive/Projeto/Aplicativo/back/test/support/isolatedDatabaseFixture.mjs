import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

export const isolatedDatabaseTableNames = Object.freeze([
  "account_blocks",
  "account_emails",
  "account_follow_requests",
  "account_follows",
  "account_interests",
  "account_profiles",
  "account_username_reservations",
  "accounts",
  "assets",
  "auth_challenges",
  "business_profiles",
  "comment_likes",
  "password_credentials",
  "post_bookmarks",
  "post_comments",
  "post_likes",
  "post_reposts",
  "post_tags",
  "posts",
  "sessions",
  "trusted_devices",
]);

export function createIsolatedSchemaName() {
  return `seekalive_test_${randomUUID().replaceAll("-", "")}`;
}

export function quoteIsolatedSchema(name) {
  assert.match(name, /^seekalive_test_[0-9a-f]{32}$/i);
  return `"${name}"`;
}

export function configureIsolatedDatabaseEnvironment({
  schemaName,
  sessionSecret,
}) {
  const isProductionRuntime =
    process.env.NODE_ENV?.trim().toLowerCase() === "production" ||
    Boolean(process.env.REPLIT_DEPLOYMENT?.trim());

  if (process.env.SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS !== "1") {
    throw new Error(
      "Set SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1 to authorize isolated database writes.",
    );
  }
  if (isProductionRuntime) {
    throw new Error("Isolated database tests are prohibited in production.");
  }
  if (!process.env.DATABASE_URL || !process.env.SEEKALIVE_EXPECTED_DATABASE) {
    throw new Error(
      "DATABASE_URL and SEEKALIVE_EXPECTED_DATABASE are required for isolated tests.",
    );
  }
  quoteIsolatedSchema(schemaName);

  process.env.NODE_ENV = "test";
  process.env.SEEKALIVE_DATABASE_TARGET = "replit";
  process.env.SEEKALIVE_DB_MIGRATION_TARGET = "replit";
  process.env.SEEKALIVE_DB_SCHEMA = schemaName;
  process.env.SESSION_SECRET = sessionSecret;
  process.env.RESEND_ENABLED = "false";
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
}

export async function publicSchemaFingerprint(pool) {
  const [columns, constraints, indexes, views] = await Promise.all([
    pool.query(`
      SELECT table_name, column_name, ordinal_position, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `),
    pool.query(`
      SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS definition
      FROM pg_catalog.pg_constraint
      WHERE connamespace = 'public'::regnamespace
      ORDER BY conrelid::regclass::text, conname
    `),
    pool.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_catalog.pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `),
    pool.query(`
      SELECT table_name, view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name
    `),
  ]);
  return createHash("sha256")
    .update(
      JSON.stringify({
        columns: columns.rows,
        constraints: constraints.rows,
        indexes: indexes.rows,
        views: views.rows,
      }),
    )
    .digest("hex");
}

export async function setupIsolatedDatabaseFixture({
  schemaName,
  expectedDatabase,
  projectRoot,
  pool,
}) {
  assert.equal(
    process.env.SEEKALIVE_DB_SCHEMA,
    schemaName,
    "The database package must be configured for the isolated schema before import.",
  );
  assert.ok(pool, "The database pool must be available for the isolated test.");

  const currentDatabase = await pool.query(
    "SELECT current_database() AS database_name",
  );
  assert.equal(
    currentDatabase.rows[0]?.database_name,
    expectedDatabase,
    "DATABASE_URL must point to the confirmed development database.",
  );

  const publicSchemaBefore = await publicSchemaFingerprint(pool);
  let schemaCreated = false;
  let cleanupPromise;

  try {
    await pool.query(`CREATE SCHEMA ${quoteIsolatedSchema(schemaName)}`);
    schemaCreated = true;

    const push = spawnSync(
      "pnpm",
      ["--filter", "@workspace/db", "run", "push"],
      {
        cwd: projectRoot,
        encoding: "utf8",
        maxBuffer: 2 * 1024 * 1024,
        env: {
          ...process.env,
          NODE_ENV: "test",
          SEEKALIVE_DB_SCHEMA: schemaName,
          SEEKALIVE_DB_MIGRATION_TARGET: "replit",
        },
      },
    );
    const databaseUrl = process.env.DATABASE_URL;
    const pushOutput = `${push.stdout ?? ""}\n${push.stderr ?? ""}`
      .replaceAll(databaseUrl, "[DATABASE_URL REDACTED]")
      .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "[DATABASE_URL REDACTED]");
    if (push.error || push.status !== 0) {
      throw new Error(
        `Drizzle could not initialize the isolated schema (exit ${push.status ?? "unknown"}):\n${pushOutput}`,
      );
    }

    const createdTables = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = $1 AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
      [schemaName],
    );
    assert.deepEqual(
      createdTables.rows.map((row) => row.table_name),
      isolatedDatabaseTableNames,
    );
    assert.equal(
      await publicSchemaFingerprint(pool),
      publicSchemaBefore,
      "Initializing the isolated schema changed public objects.",
    );
  } catch (error) {
    if (schemaCreated) {
      try {
        await pool.query(
          `DROP SCHEMA ${quoteIsolatedSchema(schemaName)} CASCADE`,
        );
      } catch {
        throw new Error(
          "Isolated database setup failed and automatic schema cleanup also failed.",
        );
      }
    }
    throw error;
  }

  return {
    publicSchemaBefore,
    async cleanup() {
      if (cleanupPromise) return cleanupPromise;
      cleanupPromise = (async () => {
        try {
          await pool.query(
            `DROP SCHEMA ${quoteIsolatedSchema(schemaName)} CASCADE`,
          );
          schemaCreated = false;
          const remaining = await pool.query(
            `SELECT EXISTS (
               SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
             ) AS schema_exists`,
            [schemaName],
          );
          const schemaRemoved = !remaining.rows[0]?.schema_exists;
          const publicSchemaUnchanged =
            (await publicSchemaFingerprint(pool)) === publicSchemaBefore;
          assert.equal(schemaRemoved, true);
          assert.equal(publicSchemaUnchanged, true);
          return { schemaRemoved, publicSchemaUnchanged };
        } finally {
          await pool.end();
        }
      })();
      return cleanupPromise;
    },
  };
}
