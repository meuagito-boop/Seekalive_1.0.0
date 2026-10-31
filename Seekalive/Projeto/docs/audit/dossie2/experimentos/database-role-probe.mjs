import assert from "node:assert/strict";
import { createRequire } from "node:module";

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

const requireFromBack = createRequire(
  new URL("../../../../Aplicativo/back/package.json", import.meta.url),
);
const esbuild = requireFromBack("esbuild");
const entryPoint = new URL("../../../../infra/database/src/index.ts", import.meta.url).pathname;

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
executeBundle(requireFromBack, probeModule, probeModule.exports, process);
const { pool } = probeModule.exports;

try {
    const roleResult = await pool.query(`
      SELECT
        r.rolsuper AS is_superuser,
        r.rolcreatedb AS can_create_database,
        r.rolcreaterole AS can_create_role,
        r.rolbypassrls AS can_bypass_row_security,
        r.rolcanlogin AS can_login
      FROM pg_roles AS r
      WHERE r.rolname = current_user
    `);
    const peerRoleResult = await pool.query(`
      SELECT
        count(*) FILTER (
          WHERE r.rolcanlogin
            AND NOT r.rolsuper
            AND NOT r.rolcreatedb
            AND NOT r.rolcreaterole
            AND NOT r.rolbypassrls
        )::integer AS non_admin_login_role_count
      FROM pg_roles AS r
      WHERE r.rolname <> current_user
        AND r.rolname NOT LIKE 'pg_%'
    `);
    const ownershipResult = await pool.query(`
      WITH role_oid AS (
        SELECT oid FROM pg_roles WHERE rolname = current_user
      )
      SELECT
        count(*)::integer AS non_system_schema_count,
        coalesce(bool_or(n.nspowner = r.oid), false) AS owns_any_non_system_schema,
        coalesce(bool_or(has_schema_privilege(current_user, n.nspname, 'CREATE')), false) AS can_create_in_any_non_system_schema,
        coalesce(bool_and(has_schema_privilege(current_user, n.nspname, 'CREATE')), false) AS can_create_in_all_non_system_schemas,
        coalesce(bool_or(n.nspowner = r.oid), false) AS can_drop_at_least_one_schema
      FROM pg_namespace AS n
      CROSS JOIN role_oid AS r
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
        AND n.nspname NOT LIKE 'pg_toast%'
        AND n.nspname NOT LIKE 'pg_temp_%'
        AND n.nspname NOT LIKE 'pg_toast_temp_%'
    `);
    const tableResult = await pool.query(`
      SELECT
        count(*)::integer AS non_system_table_count,
        count(*) FILTER (WHERE tableowner = current_user)::integer AS owned_table_count,
        coalesce(bool_and(has_table_privilege(format('%I.%I', schemaname, tablename), 'SELECT')), false) AS can_select_all_tables,
        coalesce(bool_and(has_table_privilege(format('%I.%I', schemaname, tablename), 'INSERT')), false) AS can_insert_all_tables,
        coalesce(bool_and(has_table_privilege(format('%I.%I', schemaname, tablename), 'UPDATE')), false) AS can_update_all_tables,
        coalesce(bool_and(has_table_privilege(format('%I.%I', schemaname, tablename), 'DELETE')), false) AS can_delete_all_tables,
        coalesce(bool_and(has_table_privilege(format('%I.%I', schemaname, tablename), 'TRUNCATE')), false) AS can_truncate_all_tables,
        coalesce(bool_or(has_table_privilege(format('%I.%I', schemaname, tablename), 'TRUNCATE')), false) AS can_truncate_any_table
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        AND schemaname NOT LIKE 'pg_toast%'
        AND schemaname NOT LIKE 'pg_temp_%'
        AND schemaname NOT LIKE 'pg_toast_temp_%'
    `);

    assert.equal(roleResult.rows.length, 1, "Expected exactly one effective login role.");
    const role = roleResult.rows[0];
    const ownership = ownershipResult.rows[0];
    const tables = tableResult.rows[0];
    const isSuperuser = role.is_superuser === true;
    console.log(JSON.stringify({
      runtimeTarget: configuredTarget || "replit (runtime default)",
      connectionResolver: "infra/database/src/index.ts runtime pool",
      environment: "development",
      role: {
        isSuperuser,
        canCreateDatabase: role.can_create_database,
        canCreateRole: role.can_create_role,
        canBypassRowSecurity: role.can_bypass_row_security,
        canLogin: role.can_login,
      },
      otherNonAdminLoginRoles: Number(
        peerRoleResult.rows[0]?.non_admin_login_role_count ?? 0,
      ),
      nonSystemSchemas: {
        count: Number(ownership.non_system_schema_count),
        ownsAny: ownership.owns_any_non_system_schema,
        canCreateInAny: ownership.can_create_in_any_non_system_schema,
        canCreateInAll: ownership.can_create_in_all_non_system_schemas,
        canDropAtLeastOne: isSuperuser || ownership.can_drop_at_least_one_schema,
      },
      nonSystemTables: {
        count: Number(tables.non_system_table_count),
        ownedCount: Number(tables.owned_table_count),
        canSelectAll: tables.can_select_all_tables,
        canInsertAll: tables.can_insert_all_tables,
        canUpdateAll: tables.can_update_all_tables,
        canDeleteAll: tables.can_delete_all_tables,
        canTruncateAll: tables.can_truncate_all_tables,
        canTruncateAny: tables.can_truncate_any_table,
      },
      queryScope: "catalog metadata only; no application rows read",
    }));
  await pool.end();
} finally {
  await pool.end().catch(() => {});
}
