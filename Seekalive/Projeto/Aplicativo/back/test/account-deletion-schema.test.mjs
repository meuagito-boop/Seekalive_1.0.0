import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import {
  configureIsolatedDatabaseEnvironment,
  createIsolatedSchemaName,
  setupIsolatedDatabaseFixture,
} from "./support/isolatedDatabaseFixture.mjs";

const schemaName = createIsolatedSchemaName();
const projectRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const expectedDatabase = process.env.SEEKALIVE_EXPECTED_DATABASE?.trim();

configureIsolatedDatabaseEnvironment({
  schemaName,
  sessionSecret: "seekalive-account-deletion-schema-test-session-secret",
});

const { accounts, db, pool } = await import("@workspace/db");
let isolatedDatabaseFixture;

before(async () => {
  isolatedDatabaseFixture = await setupIsolatedDatabaseFixture({
    schemaName,
    expectedDatabase,
    projectRoot,
    pool,
  });
});

after(async () => {
  if (isolatedDatabaseFixture) {
    await isolatedDatabaseFixture.cleanup();
    return;
  }

  await pool.end();
});

test("account deletion state is coherent and can be cleared on restoration", async () => {
  const [account] = await db
    .insert(accounts)
    .values({
      username: `del_${randomUUID().replaceAll("-", "").slice(0, 12)}`,
      age: 18,
      acceptedTermsVersion: "test",
      displayName: "Isolated test account",
      accountType: "personal",
      status: "active",
    })
    .returning({ id: accounts.id });

  assert.ok(account);

  const requestedAt = new Date("2026-10-29T12:00:00.000Z");
  const scheduledFor = new Date(
    requestedAt.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const retentionUntil = new Date(
    scheduledFor.getTime() + 90 * 24 * 60 * 60 * 1000,
  );

  await db
    .update(accounts)
    .set({
      status: "deletion_pending",
      deletionRequestedAt: requestedAt,
      deletionScheduledFor: scheduledFor,
    })
    .where(eq(accounts.id, account.id));

  await assert.rejects(
    db
      .update(accounts)
      .set({ deletionScheduledFor: null })
      .where(eq(accounts.id, account.id)),
  );

  await assert.rejects(
    db
      .update(accounts)
      .set({ deletionScheduledFor: requestedAt })
      .where(eq(accounts.id, account.id)),
  );

  await assert.rejects(
    db
      .update(accounts)
      .set({ status: "active" })
      .where(eq(accounts.id, account.id)),
  );

  await db
    .update(accounts)
    .set({
      status: "deletion_retained",
      deletionRetentionUntil: retentionUntil,
    })
    .where(eq(accounts.id, account.id));

  await assert.rejects(
    db
      .update(accounts)
      .set({ deletionRetentionUntil: scheduledFor })
      .where(eq(accounts.id, account.id)),
  );

  await db
    .update(accounts)
    .set({
      status: "active",
      deletionRequestedAt: null,
      deletionScheduledFor: null,
      deletionRetentionUntil: null,
    })
    .where(eq(accounts.id, account.id));

  const [restoredAccount] = await db
    .select({
      status: accounts.status,
      deletionRequestedAt: accounts.deletionRequestedAt,
      deletionScheduledFor: accounts.deletionScheduledFor,
      deletionRetentionUntil: accounts.deletionRetentionUntil,
    })
    .from(accounts)
    .where(eq(accounts.id, account.id));

  assert.deepEqual(restoredAccount, {
    status: "active",
    deletionRequestedAt: null,
    deletionScheduledFor: null,
    deletionRetentionUntil: null,
  });

  const indexResult = await pool.query(
    `SELECT indexdef
     FROM pg_catalog.pg_indexes
     WHERE schemaname = $1 AND indexname = 'accounts_deletion_due_idx'`,
    [schemaName],
  );
  assert.equal(indexResult.rows.length, 1);
  assert.match(indexResult.rows[0].indexdef, /deletion_pending/);

  const retentionIndex = await pool.query(
    `SELECT indexdef
     FROM pg_catalog.pg_indexes
     WHERE schemaname = $1 AND indexname = 'accounts_retention_due_idx'`,
    [schemaName],
  );
  assert.equal(retentionIndex.rows.length, 1);
  assert.match(retentionIndex.rows[0].indexdef, /deletion_retained/);

  const usernameIndex = await pool.query(
    `SELECT indexdef
     FROM pg_catalog.pg_indexes
     WHERE schemaname = $1 AND indexname = 'accounts_username_unique'`,
    [schemaName],
  );
  assert.equal(usernameIndex.rows.length, 1);
  assert.match(usernameIndex.rows[0].indexdef, /deletion_retained/);
});
