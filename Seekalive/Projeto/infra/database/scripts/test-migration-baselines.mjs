import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
const expectedDatabase = process.env.SEEKALIVE_EXPECTED_DATABASE?.trim();
if (
  process.env.NODE_ENV !== "test" ||
  process.env.SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS !== "1" ||
  process.env.SEEKALIVE_DB_MIGRATION_TARGET !== "replit" ||
  process.env.REPLIT_DEPLOYMENT !== undefined ||
  !databaseUrl ||
  !expectedDatabase
) {
  throw new Error(
    "Baseline replay requires an explicitly authorized isolated development test run.",
  );
}

const tracks = ["accounts", "security", "profiles", "seek"];
const expectedTables = {
  accounts: 4,
  security: 4,
  profiles: 3,
  seek: 1,
};
const schemaSuffix = randomUUID().replaceAll("-", "");
const isolatedSchemas = Object.fromEntries(
  tracks.map((track) => [track, `seekalive_test_${schemaSuffix}_${track}`]),
);

function quoteIdentifier(identifier) {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(identifier)) {
    throw new Error("Refusing an invalid temporary schema identifier.");
  }
  return `"${identifier}"`;
}

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));
const pool = new Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();
let transactionOpen = false;

try {
  const database = await client.query("SELECT current_database() AS name");
  assert.equal(
    database.rows[0]?.name,
    expectedDatabase,
    "Refusing to run against an unexpected database.",
  );

  await client.query("BEGIN");
  transactionOpen = true;

  for (const schemaName of Object.values(isolatedSchemas)) {
    await client.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`);
  }

  for (const track of tracks) {
    const sqlPath = path.join(
      packageDirectory,
      "..",
      "migrations",
      track,
      "0000_baseline.sql",
    );
    let sql = await readFile(sqlPath, "utf8");
    const isolatedSchema = quoteIdentifier(isolatedSchemas[track]);
    sql = sql.replaceAll(
      `CREATE SCHEMA IF NOT EXISTS "${track}"`,
      `CREATE SCHEMA IF NOT EXISTS ${isolatedSchema}`,
    );
    sql = sql.replaceAll(`"${track}".`, `${isolatedSchema}.`);
    await client.query(sql);
  }

  const schemaNames = Object.values(isolatedSchemas);
  const tableRows = await client.query(
    `SELECT table_schema, count(*)::int AS table_count
     FROM information_schema.tables
     WHERE table_type = 'BASE TABLE' AND table_schema = ANY($1::text[])
     GROUP BY table_schema`,
    [schemaNames],
  );
  assert.deepEqual(
    Object.fromEntries(
      tableRows.rows.map((row) => [
        tracks.find((track) => isolatedSchemas[track] === row.table_schema),
        row.table_count,
      ]),
    ),
    expectedTables,
  );

  const metadata = await client.query(
    `SELECT
       (SELECT count(*)::int FROM information_schema.columns
        WHERE table_schema = ANY($1::text[])) AS columns,
       (SELECT count(*)::int FROM information_schema.table_constraints
        WHERE constraint_schema = ANY($1::text[]) AND constraint_type = 'FOREIGN KEY') AS foreign_keys,
       (SELECT count(*)::int FROM pg_constraint AS constraint_row
        JOIN pg_namespace AS namespace_row
          ON namespace_row.oid = constraint_row.connamespace
        WHERE namespace_row.nspname = ANY($1::text[])
          AND constraint_row.contype = 'c') AS check_constraints,
       (SELECT count(*)::int FROM pg_indexes
        WHERE schemaname = ANY($1::text[])) AS indexes`,
    [schemaNames],
  );
  assert.deepEqual(metadata.rows[0], {
    columns: 91,
    foreign_keys: 15,
    check_constraints: 5,
    indexes: 28,
  });

  for (const schemaName of Object.values(isolatedSchemas)) {
    await client.query(`DROP SCHEMA ${quoteIdentifier(schemaName)} CASCADE`);
  }
  await client.query("COMMIT");
  transactionOpen = false;

  const remainingSchemas = await client.query(
    `SELECT count(*)::int AS count
     FROM information_schema.schemata
     WHERE schema_name = ANY($1::text[])`,
    [schemaNames],
  );
  assert.equal(remainingSchemas.rows[0]?.count, 0);
  console.log(
    "Four baseline migrations replayed and verified in isolated schemas; all 12 temporary tables were removed.",
  );
} catch (error) {
  if (transactionOpen) await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
