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

const tracks = ["accounts", "security", "profiles", "seek", "feed", "media"];
const expectedTablesAfterTransfer = {
  accounts: 4,
  security: 4,
  profiles: 5,
  seek: 0,
  feed: 6,
  media: 1,
};
const expectedBusinessProfileColumns = [
  "account_id",
  "category_key",
  "discovery_kind",
  "address",
  "postal_code",
  "city_name",
  "state_name",
  "country_name",
  "created_at",
  "updated_at",
];
const expectedAccountProfileColumns = [
  "account_id",
  "first_name",
  "last_name",
  "display_name",
  "bio",
  "location_label",
  "website_url",
  "public_name_changed_at",
  "is_private",
  "created_at",
  "updated_at",
];
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

function rewriteDomainNames(sql, schemas) {
  for (const [domain, schemaName] of Object.entries(schemas)) {
    sql = sql.replaceAll(
      `CREATE SCHEMA IF NOT EXISTS "${domain}"`,
      `CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schemaName)}`,
    );
    sql = sql.replaceAll(
      `SET SCHEMA ${domain}`,
      `SET SCHEMA ${quoteIdentifier(schemaName)}`,
    );
    sql = sql.replaceAll(`"${domain}".`, `${quoteIdentifier(schemaName)}.`);
    sql = sql.replaceAll(`'${domain}.`, `'${schemaName}.`);
    sql = sql.replace(
      new RegExp(`(?<![a-z0-9_])${domain}(?=\\.)`, "g"),
      schemaName,
    );
  }
  return sql;
}

async function readSchemaMetadata(client, schemaNames) {
  const result = await client.query(
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
  return result.rows[0];
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
    const sql = rewriteDomainNames(
      await readFile(sqlPath, "utf8"),
      isolatedSchemas,
    );
    await client.query(sql);
  }

  const businessAccountId = "11111111-1111-4111-8111-111111111111";
  const accountsSchema = quoteIdentifier(isolatedSchemas.accounts);
  const seekSchema = quoteIdentifier(isolatedSchemas.seek);
  await client.query(
    `INSERT INTO ${accountsSchema}.accounts
      (id, username, age, accepted_terms_version, first_name, last_name,
       display_name, bio, location_label, website_url, public_name_changed_at,
       is_private, account_type)
     VALUES ($1, 'migration_test', 30, 'test-v1', 'Maria', 'Teste',
       'Migration test', 'Profile biography', 'São Paulo',
       'https://example.test', '2026-10-01T00:00:00Z', true, 'commercial')`,
    [businessAccountId],
  );
  await client.query(
    `INSERT INTO ${seekSchema}.business_profiles
      (account_id, category_key, discovery_kind, address, postal_code,
       city_name, state_name, country_name)
     VALUES ($1, 'cafes', 'place', 'Rua de Teste, 10', '01001000',
       'São Paulo', 'SP', 'Brasil')`,
    [businessAccountId],
  );
  const schemaNames = Object.values(isolatedSchemas);
  const metadataBeforeTransfer = await readSchemaMetadata(client, schemaNames);

  const profileMigrationPath = path.join(
    packageDirectory,
    "..",
    "migrations",
    "profiles",
    "0001_talented_clint_barton.sql",
  );
  const profileMigration = rewriteDomainNames(
    await readFile(profileMigrationPath, "utf8"),
    isolatedSchemas,
  );
  await client.query(profileMigration);
  const accountProfileMigrationPath = path.join(
    packageDirectory,
    "..",
    "migrations",
    "profiles",
    "0002_charming_alice.sql",
  );
  const accountProfileMigration = rewriteDomainNames(
    await readFile(accountProfileMigrationPath, "utf8"),
    isolatedSchemas,
  );
  await client.query(accountProfileMigration);

  const tableRows = await client.query(
    `SELECT table_schema, count(*)::int AS table_count
     FROM information_schema.tables
     WHERE table_type = 'BASE TABLE' AND table_schema = ANY($1::text[])
     GROUP BY table_schema`,
    [schemaNames],
  );
  const actualTableCounts = Object.fromEntries(
    tracks.map((track) => [track, 0]),
  );
  for (const row of tableRows.rows) {
    const track = tracks.find(
      (candidate) => isolatedSchemas[candidate] === row.table_schema,
    );
    assert.ok(track, `Unexpected isolated schema: ${row.table_schema}`);
    actualTableCounts[track] = row.table_count;
  }
  assert.deepEqual(actualTableCounts, expectedTablesAfterTransfer);

  const movedProfile = await client.query(
    `SELECT account_id, category_key, address
     FROM ${quoteIdentifier(isolatedSchemas.profiles)}.business_profiles
     WHERE account_id = $1`,
    [businessAccountId],
  );
  assert.deepEqual(movedProfile.rows, [
    {
      account_id: businessAccountId,
      category_key: "cafes",
      address: "Rua de Teste, 10",
    },
  ]);
  const movedAccountProfile = await client.query(
    `SELECT account_id, first_name, last_name, display_name, bio,
            location_label, website_url, public_name_changed_at, is_private
     FROM ${quoteIdentifier(isolatedSchemas.profiles)}.account_profiles
     WHERE account_id = $1`,
    [businessAccountId],
  );
  assert.deepEqual(movedAccountProfile.rows, [
    {
      account_id: businessAccountId,
      first_name: "Maria",
      last_name: "Teste",
      display_name: "Migration test",
      bio: "Profile biography",
      location_label: "São Paulo",
      website_url: "https://example.test",
      public_name_changed_at: new Date("2026-10-01T00:00:00.000Z"),
      is_private: true,
    },
  ]);
  const remainingLegacyProfileColumns = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = $1
       AND table_name = 'accounts'
       AND column_name = ANY($2::text[])`,
    [
      isolatedSchemas.accounts,
      [
        "first_name",
        "last_name",
        "display_name",
        "bio",
        "location_label",
        "website_url",
        "public_name_changed_at",
        "is_private",
      ],
    ],
  );
  assert.deepEqual(remainingLegacyProfileColumns.rows, []);
  const metadataAfterTransfer = await readSchemaMetadata(client, schemaNames);
  assert.equal(metadataAfterTransfer.columns, metadataBeforeTransfer.columns + 3);
  assert.equal(
    metadataAfterTransfer.foreign_keys,
    metadataBeforeTransfer.foreign_keys + 1,
  );
  assert.equal(
    metadataAfterTransfer.indexes,
    metadataBeforeTransfer.indexes + 1,
  );
  assert.equal(metadataAfterTransfer.check_constraints, metadataBeforeTransfer.check_constraints);
  const businessProfileReviewsMigrationPath = path.join(
    packageDirectory,
    "..",
    "migrations",
    "profiles",
    "0003_misty_rhodey.sql",
  );
  const businessProfileReviewsMigration = rewriteDomainNames(
    await readFile(businessProfileReviewsMigrationPath, "utf8"),
    isolatedSchemas,
  );
  await client.query(businessProfileReviewsMigration);
  const migratedReviewsTable = await client.query(
    `SELECT to_regclass($1) AS table_name`,
    [`${isolatedSchemas.profiles}.business_profile_reviews`],
  );
  assert.equal(
    migratedReviewsTable.rows[0]?.table_name,
    `${isolatedSchemas.profiles}.business_profile_reviews`,
  );
  const metadataAfterReviews = await readSchemaMetadata(client, schemaNames);
  assert.equal(metadataAfterReviews.columns, metadataAfterTransfer.columns + 8);
  assert.equal(
    metadataAfterReviews.foreign_keys,
    metadataAfterTransfer.foreign_keys + 2,
  );
  assert.equal(
    metadataAfterReviews.check_constraints,
    metadataAfterTransfer.check_constraints + 4,
  );
  assert.equal(metadataAfterReviews.indexes, metadataAfterTransfer.indexes + 4);

  const freshSchemas = {
    accounts: `seekalive_test_${schemaSuffix}_fresh_accounts`,
    profiles: `seekalive_test_${schemaSuffix}_fresh_profiles`,
    seek: `seekalive_test_${schemaSuffix}_fresh_seek`,
  };
  for (const schemaName of Object.values(freshSchemas).slice(0, 2)) {
    await client.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`);
  }
  for (const track of ["accounts", "profiles"]) {
    const baselinePath = path.join(
      packageDirectory,
      "..",
      "migrations",
      track,
      "0000_baseline.sql",
    );
    await client.query(
      rewriteDomainNames(await readFile(baselinePath, "utf8"), freshSchemas),
    );
  }
  await client.query(
    rewriteDomainNames(
      await readFile(profileMigrationPath, "utf8"),
      freshSchemas,
    ),
  );
  await client.query(
    rewriteDomainNames(
      await readFile(accountProfileMigrationPath, "utf8"),
      freshSchemas,
    ),
  );
  const freshBusinessProfile = await client.query(
    `SELECT to_regclass($1) AS table_name`,
    [`${freshSchemas.profiles}.business_profiles`],
  );
  assert.equal(
    freshBusinessProfile.rows[0]?.table_name,
    `${freshSchemas.profiles}.business_profiles`,
  );
  const freshBusinessProfileColumns = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = 'business_profiles'
     ORDER BY ordinal_position`,
    [freshSchemas.profiles],
  );
  assert.deepEqual(
    freshBusinessProfileColumns.rows.map((row) => row.column_name),
    expectedBusinessProfileColumns,
  );
  const freshBusinessProfileForeignKeys = await client.query(
    `SELECT count(*)::int AS count
     FROM information_schema.table_constraints
     WHERE constraint_schema = $1
       AND table_name = 'business_profiles'
       AND constraint_type = 'FOREIGN KEY'`,
    [freshSchemas.profiles],
  );
  assert.equal(freshBusinessProfileForeignKeys.rows[0]?.count, 1);
  const freshAccountProfileColumns = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = 'account_profiles'
     ORDER BY ordinal_position`,
    [freshSchemas.profiles],
  );
  assert.deepEqual(
    freshAccountProfileColumns.rows.map((row) => row.column_name),
    expectedAccountProfileColumns,
  );

  for (const schemaName of [
    ...Object.values(isolatedSchemas),
    ...Object.values(freshSchemas).slice(0, 2),
  ]) {
    await client.query(`DROP SCHEMA ${quoteIdentifier(schemaName)} CASCADE`);
  }
  await client.query("COMMIT");
  transactionOpen = false;

  const remainingSchemas = await client.query(
    `SELECT count(*)::int AS count
     FROM information_schema.schemata
     WHERE schema_name = ANY($1::text[])`,
    [[...schemaNames, ...Object.values(freshSchemas).slice(0, 2)]],
  );
  assert.equal(remainingSchemas.rows[0]?.count, 0);
  console.log(
    "Legacy domain baselines and the Profiles ownership transfer were verified in isolated schemas; all temporary tables and schemas were removed.",
  );
} catch (error) {
  if (transactionOpen) await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
