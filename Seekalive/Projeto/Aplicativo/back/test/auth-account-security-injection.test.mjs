import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import argon2 from "argon2";
import test from "node:test";

const applicationDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/modules/auth/application/accountSecurity",
);
const { createVerifyCurrentPassword } =
  await import("../src/modules/auth/application/accountSecurity/verifyCurrentPassword.ts");

test("account-security application has no direct database imports", async () => {
  const files = await readdir(applicationDirectory);
  const sourceFiles = files.filter((file) => file.endsWith(".ts"));
  assert.ok(sourceFiles.length > 0);

  for (const file of sourceFiles) {
    const source = await readFile(
      path.join(applicationDirectory, file),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /(?:from\s*|import\s*\()\s*["'](?:@workspace\/db|drizzle-orm)(?:\/[^"']*)?["']/,
      `${file} must use an injected persistence port.`,
    );
  }
});

test("current-password verification uses the injected account reader", async () => {
  const passwordHash = await argon2.hash("Valid!Password2026");
  const account = {
    status: "active",
    securityLockedAt: null,
    email: "person@example.com",
    emailVerifiedAt: new Date(),
    displayName: "Person",
    passwordHash,
  };
  const requestedAccountIds = [];
  const verifyCurrentPassword = createVerifyCurrentPassword(
    async (accountId) => {
      requestedAccountIds.push(accountId);
      return accountId === "account-1" ? account : null;
    },
  );

  assert.deepEqual(
    await verifyCurrentPassword("account-1", "Valid!Password2026"),
    {
      kind: "verified",
      email: account.email,
      displayName: account.displayName,
      passwordHash,
    },
  );
  assert.deepEqual(
    await verifyCurrentPassword("account-1", "Invalid!Password2026"),
    { kind: "invalid_credentials" },
  );
  assert.deepEqual(
    await verifyCurrentPassword("missing-account", "Valid!Password2026"),
    { kind: "invalid_credentials" },
  );
  assert.deepEqual(requestedAccountIds, [
    "account-1",
    "account-1",
    "missing-account",
  ]);
});

test("valid password does not bypass account availability checks", async () => {
  const passwordHash = await argon2.hash("Valid!Password2026");
  const verifyCurrentPassword = createVerifyCurrentPassword(async () => ({
    status: "pending",
    securityLockedAt: null,
    email: "person@example.com",
    emailVerifiedAt: new Date(),
    displayName: "Person",
    passwordHash,
  }));

  assert.deepEqual(
    await verifyCurrentPassword("account-1", "Valid!Password2026"),
    { kind: "account_unavailable" },
  );
});
