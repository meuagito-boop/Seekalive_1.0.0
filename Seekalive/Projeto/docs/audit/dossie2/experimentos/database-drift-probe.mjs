import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

if (process.env.REPLIT_DEPLOYMENT) {
  throw new Error("Refusing to probe a deployment environment.");
}
if (process.env.NODE_ENV !== "development") {
  throw new Error("Run this read-only probe only with NODE_ENV=development.");
}
const configuredTarget = process.env.SEEKALIVE_DATABASE_TARGET?.trim().toLowerCase();
if (configuredTarget && configuredTarget !== "replit") {
  throw new Error("Refusing to probe a non-Replit runtime database target.");
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const backendRequire = createRequire(
  new URL("../../../../Aplicativo/back/package.json", import.meta.url),
);
const esbuild = backendRequire("esbuild");
const entryPoint = path.join(projectRoot, "infra/database/src/index.ts");
const bundle = await esbuild.build({
  entryPoints: [entryPoint],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  packages: "external",
  write: false,
  logLevel: "silent",
});
const probeModule = { exports: {} };
const executeBundle = new Function(
  "require",
  "module",
  "exports",
  "process",
  bundle.outputFiles[0].text,
);
executeBundle(backendRequire, probeModule, probeModule.exports, process);
const { pool } = probeModule.exports;

const tracks = [
  ["accounts", "0001_snapshot.json"],
  ["security", "0000_snapshot.json"],
  ["profiles", "0003_snapshot.json"],
  ["feed", "0003_snapshot.json"],
  ["media", "0000_snapshot.json"],
  ["seek", "0000_snapshot.json"],
];
const expected = new Map();

for (const [track, snapshotName] of tracks) {
  const snapshotPath = path.join(
    projectRoot,
    "infra/database/migrations",
    track,
    "meta",
    snapshotName,
  );
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
  for (const [qualifiedName, table] of Object.entries(snapshot.tables ?? {})) {
    expected.set(qualifiedName, table);
  }
}

function normalizeType(value) {
  const match = String(value).match(/^(?:varchar|character varying)\((\d+)\)$/);
  if (match) return { base: "character varying", length: Number(match[1]) };
  const base =
    {
      int2: "smallint",
      int4: "integer",
      int8: "bigint",
      bool: "boolean",
      varchar: "character varying",
      timestamptz: "timestamp with time zone",
      timestamp: "timestamp without time zone",
      float8: "double precision",
      float4: "real",
      numeric: "numeric",
      jsonb: "jsonb",
      uuid: "uuid",
      text: "text",
      bytea: "bytea",
    }[value] ?? value;
  return { base, length: null };
}

function normalizeDefault(value) {
  if (value === null || value === undefined) return null;
  return String(value)
    .replace(/::[a-zA-Z0-9_. ]+/g, "")
    .replace(/\s+/g, "")
    .replace(/^\((.*)\)$/g, "$1")
    .toLowerCase();
}

try {
  const tablesResult = await pool.query(`
    SELECT schemaname AS schema_name, tablename AS table_name
    FROM pg_tables
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'drizzle')
      AND schemaname NOT LIKE 'pg_toast%'
      AND schemaname NOT LIKE 'pg_temp_%'
      AND schemaname NOT LIKE 'pg_toast_temp_%'
    ORDER BY schemaname, tablename
  `);
  const actualNames = new Set(
    tablesResult.rows.map((row) => `${row.schema_name}.${row.table_name}`),
  );
  const columnsResult = await pool.query(`
    SELECT
      table_schema AS schema_name,
      table_name,
      column_name,
      udt_name,
      data_type,
      character_maximum_length,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'drizzle')
      AND table_schema NOT LIKE 'pg_toast%'
      AND table_schema NOT LIKE 'pg_temp_%'
      AND table_schema NOT LIKE 'pg_toast_temp_%'
    ORDER BY table_schema, table_name, ordinal_position
  `);
  const indexesResult = await pool.query(`
    SELECT schemaname AS schema_name, tablename AS table_name, indexname AS index_name
    FROM pg_indexes
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'drizzle')
      AND schemaname NOT LIKE 'pg_toast%'
      AND schemaname NOT LIKE 'pg_temp_%'
      AND schemaname NOT LIKE 'pg_toast_temp_%'
  `);
  const constraintsResult = await pool.query(`
    SELECT
      n.nspname AS schema_name,
      t.relname AS table_name,
      c.conname AS constraint_name,
      c.contype AS constraint_type
    FROM pg_constraint AS c
    JOIN pg_class AS t ON t.oid = c.conrelid
    JOIN pg_namespace AS n ON n.oid = t.relnamespace
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'drizzle')
      AND n.nspname NOT LIKE 'pg_toast%'
      AND n.nspname NOT LIKE 'pg_temp_%'
      AND n.nspname NOT LIKE 'pg_toast_temp_%'
  `);

  const columnsByTable = new Map();
  for (const row of columnsResult.rows) {
    const tableName = `${row.schema_name}.${row.table_name}`;
    const columns = columnsByTable.get(tableName) ?? new Map();
    columns.set(row.column_name, row);
    columnsByTable.set(tableName, columns);
  }
  const indexesByTable = new Map();
  for (const row of indexesResult.rows) {
    const tableName = `${row.schema_name}.${row.table_name}`;
    const indexes = indexesByTable.get(tableName) ?? new Set();
    indexes.add(row.index_name);
    indexesByTable.set(tableName, indexes);
  }
  const constraintsByTable = new Map();
  for (const row of constraintsResult.rows) {
    const tableName = `${row.schema_name}.${row.table_name}`;
    const constraints = constraintsByTable.get(tableName) ?? [];
    constraints.push(row);
    constraintsByTable.set(tableName, constraints);
  }

  const missingTables = [...expected.keys()].filter((name) => !actualNames.has(name));
  const unexpectedTables = [...actualNames].filter((name) => !expected.has(name));
  const columnDifferences = [];
  const missingIndexes = [];
  const missingForeignKeys = [];
  const missingChecks = [];
  const missingUniqueConstraints = [];

  for (const [tableName, snapshotTable] of expected) {
    const actualColumns = columnsByTable.get(tableName) ?? new Map();
    const expectedColumns = snapshotTable.columns ?? {};
    for (const [columnName, expectedColumn] of Object.entries(expectedColumns)) {
      const actualColumn = actualColumns.get(columnName);
      if (!actualColumn) {
        columnDifferences.push(`${tableName}.${columnName}: missing`);
        continue;
      }
      const expectedType = normalizeType(expectedColumn.type);
      const actualType = normalizeType(actualColumn.data_type);
      if (expectedType.base !== actualType.base) {
        columnDifferences.push(
          `${tableName}.${columnName}: type ${actualType.base} != snapshot ${expectedType.base}`,
        );
      } else if (
        expectedType.length !== null &&
        Number(actualColumn.character_maximum_length) !== expectedType.length
      ) {
        columnDifferences.push(`${tableName}.${columnName}: varchar length differs`);
      }
      const expectedNullable = expectedColumn.notNull ? "NO" : "YES";
      if (actualColumn.is_nullable !== expectedNullable) {
        columnDifferences.push(
          `${tableName}.${columnName}: nullable ${actualColumn.is_nullable} != snapshot ${expectedNullable}`,
        );
      }
      if (
        normalizeDefault(actualColumn.column_default) !==
        normalizeDefault(expectedColumn.default)
      ) {
        columnDifferences.push(`${tableName}.${columnName}: default differs`);
      }
    }
    for (const actualColumn of actualColumns.keys()) {
      if (!Object.hasOwn(expectedColumns, actualColumn)) {
        columnDifferences.push(`${tableName}.${actualColumn}: unexpected column`);
      }
    }
    const actualIndexes = indexesByTable.get(tableName) ?? new Set();
    for (const indexName of Object.keys(snapshotTable.indexes ?? {})) {
      if (!actualIndexes.has(indexName)) missingIndexes.push(`${tableName}.${indexName}`);
    }
    const actualConstraints = constraintsByTable.get(tableName) ?? [];
    const actualForeignKeys = new Set(
      actualConstraints.filter((item) => item.constraint_type === "f").map((item) => item.constraint_name),
    );
    const actualChecks = new Set(
      actualConstraints.filter((item) => item.constraint_type === "c").map((item) => item.constraint_name),
    );
    const actualUniqueConstraints = new Set(
      actualConstraints.filter((item) => item.constraint_type === "u").map((item) => item.constraint_name),
    );
    for (const name of Object.keys(snapshotTable.foreignKeys ?? {})) {
      if (!actualForeignKeys.has(name)) missingForeignKeys.push(`${tableName}.${name}`);
    }
    for (const name of Object.keys(snapshotTable.checkConstraints ?? {})) {
      if (!actualChecks.has(name)) missingChecks.push(`${tableName}.${name}`);
    }
    for (const name of Object.keys(snapshotTable.uniqueConstraints ?? {})) {
      if (!actualUniqueConstraints.has(name)) {
        missingUniqueConstraints.push(`${tableName}.${name}`);
      }
    }
  }

  const ledgerTables = [
    ["accounts", "accounts_migrations"],
    ["security", "security_migrations"],
    ["profiles", "profiles_migrations"],
    ["feed", "feed_migrations"],
    ["media", "media_migrations"],
  ];
  const ledgers = [];
  for (const [track, table] of ledgerTables) {
    const ledger = await pool.query(
      `SELECT id, hash, created_at FROM drizzle.${table} ORDER BY created_at`,
    );
    const localSqlDir = path.join(projectRoot, "infra/database/migrations", track);
    const { readdir } = await import("node:fs/promises");
    const localSqlFiles = (await readdir(localSqlDir))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    const localHashes = [];
    for (const filename of localSqlFiles) {
      const sql = await readFile(path.join(localSqlDir, filename), "utf8");
      localHashes.push(createHash("sha256").update(sql).digest("hex"));
    }
    const databaseHashes = ledger.rows.map((row) => String(row.hash));
    const appliedLocalHashes = localHashes.slice(0, databaseHashes.length);
    const rawCreatedAt =
      ledger.rows.length > 0 ? Number(ledger.rows.at(-1).created_at) : null;
    const parsedCreatedAt =
      rawCreatedAt !== null && Number.isFinite(rawCreatedAt)
        ? new Date(rawCreatedAt).toISOString()
        : null;
    ledgers.push({
      track,
      databaseEntries: ledger.rows.length,
      localSqlFiles: localSqlFiles.length,
      hashesMatchAppliedPrefix:
        databaseHashes.length <= localHashes.length &&
        databaseHashes.every((hash, index) => hash === appliedLocalHashes[index]),
      pendingLocalSqlFiles: Math.max(0, localSqlFiles.length - databaseHashes.length),
      latestAppliedAt: parsedCreatedAt,
      latestAppliedAtParseable: ledger.rows.length === 0 || parsedCreatedAt !== null,
    });
  }
  const optionalLedgers = [
    ["seek", "seek_migrations", "seek"],
    ["legacy-root", "__drizzle_migrations", null],
  ];
  for (const [track, table, directory] of optionalLedgers) {
    const regclass = await pool.query(
      "SELECT to_regclass($1) IS NOT NULL AS exists",
      [`drizzle.${table}`],
    );
    if (!regclass.rows[0]?.exists) {
      ledgers.push({ track, ledgerExists: false });
      continue;
    }
    const ledger = await pool.query(
      `SELECT id, hash, created_at FROM drizzle.${table} ORDER BY created_at`,
    );
    const localSqlDir = directory
      ? path.join(projectRoot, "infra/database/migrations", directory)
      : path.join(projectRoot, "infra/database/migrations");
    const { readdir } = await import("node:fs/promises");
    const localSqlFiles = (await readdir(localSqlDir))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    const localHashes = [];
    for (const filename of localSqlFiles) {
      const sql = await readFile(path.join(localSqlDir, filename), "utf8");
      localHashes.push(createHash("sha256").update(sql).digest("hex"));
    }
    const databaseHashes = ledger.rows.map((row) => String(row.hash));
    const appliedLocalHashes = localHashes.slice(0, databaseHashes.length);
    ledgers.push({
      track,
      ledgerExists: true,
      databaseEntries: ledger.rows.length,
      localSqlFiles: localSqlFiles.length,
      hashesMatchAppliedPrefix:
        databaseHashes.length <= localHashes.length &&
        databaseHashes.every((hash, index) => hash === appliedLocalHashes[index]),
      pendingLocalSqlFiles: Math.max(0, localSqlFiles.length - databaseHashes.length),
    });
  }

  console.log(
    JSON.stringify({
      runtimeTarget: configuredTarget || "replit (runtime default)",
      environment: "development",
      applicationRowsRead: false,
      migrationSnapshots: tracks.map(([track, snapshot]) => `${track}/${snapshot}`),
      snapshotTableCount: expected.size,
      databaseApplicationTableCount: actualNames.size,
      missingTables,
      unexpectedTables,
      columnDifferences,
      missingIndexes,
      missingForeignKeys,
      missingCheckConstraints: missingChecks,
      missingUniqueConstraints,
      ledgers,
      activeMigrationTracks: ["accounts", "security", "profiles", "feed", "media"],
      seekSchemaDirectoryExistsButIsNotAnActiveMigrationTrack: true,
      legacyCombinedRootSnapshotPresent: true,
      legacyRootMigrationFiles: 7,
      comparisons: "table/column/type/null/default/index/FK/check/unique names; no DDL or application rows",
    }),
  );
} finally {
  await pool.end().catch(() => {});
}
