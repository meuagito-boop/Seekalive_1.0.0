import assert from "node:assert/strict";
import { test } from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { databaseSchema } from "../src/schema/registry.ts";
import { databaseSchemaFilter } from "../src/schema/config.ts";

test("current Drizzle tables are registered under their owning logical schema", () => {
  const actual = Object.values(databaseSchema)
    .map((table) => {
      const config = getTableConfig(table);
      return `${config.schema}.${config.name}`;
    })
    .sort();

  assert.deepEqual(actual, [
    "accounts.account_emails",
    "accounts.account_interests",
    "accounts.account_username_reservations",
    "accounts.accounts",
    "feed.posts",
    "profiles.account_blocks",
    "profiles.account_follow_requests",
    "profiles.account_follows",
    "profiles.business_profiles",
    "security.auth_challenges",
    "security.password_credentials",
    "security.sessions",
    "security.trusted_devices",
  ]);
});

test("Trust and Safety is reserved as a separate logical domain without claiming tables", () => {
  assert.ok(databaseSchemaFilter.includes("trust_safety"));
  assert.equal(
    Object.values(databaseSchema).some(
      (table) => getTableConfig(table).schema === "trust_safety",
    ),
    false,
  );
});

test("active schema filter lists product domains, without an active Shop schema", () => {
  assert.deepEqual([...databaseSchemaFilter].sort(), [
    "accounts",
    "feed",
    "location",
    "media",
    "messages",
    "notifications",
    "profiles",
    "public",
    "search",
    "security",
    "seek",
    "trust_safety",
  ]);
});

test("Shop is excluded from the active logical schema model", () => {
  assert.equal(databaseSchemaFilter.includes("shop"), false);
  assert.equal(
    Object.values(databaseSchema).some(
      (table) => getTableConfig(table).schema === "shop",
    ),
    false,
  );
});
