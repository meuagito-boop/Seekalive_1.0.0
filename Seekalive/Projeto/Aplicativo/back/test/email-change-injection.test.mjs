import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { hashAccountEmailChangeCode } from "../src/security/session.ts";
import { EmailAddressConflictError } from "../src/modules/auth/application/emailChange/errors.ts";
import { createConfirmCurrentEmailChange } from "../src/modules/auth/application/emailChange/confirmCurrentEmailChange.ts";
import { createConfirmNewEmailChange } from "../src/modules/auth/application/emailChange/confirmNewEmailChange.ts";
import { createStartEmailChange } from "../src/modules/auth/application/emailChange/startEmailChange.ts";

const applicationDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/modules/auth/application/emailChange",
);
const accountId = "account-1";
const owner = {
  id: accountId,
  status: "active",
  securityLockedAt: null,
  email: "current@example.com",
  emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  displayName: "Account Owner",
  passwordHash: "current-password-hash",
};
const successfulPasswordCheck = {
  kind: "verified",
  email: owner.email,
  passwordHash: owner.passwordHash,
};

function createRepository(overrides = {}) {
  const transaction = {
    async lockOwner() {
      return owner;
    },
    async isEmailInUse() {
      return false;
    },
    async findRecentChallenges() {
      return [];
    },
    async consumeActiveEmailChangeChallenges() {},
    async insertChallenge(input) {
      overrides.insertedChallenges?.push(input);
    },
    async lockActiveChallenge() {
      return overrides.challenge ?? null;
    },
    async recordInvalidCode(input) {
      overrides.invalidCode?.(input);
    },
    async consumeCurrentEmailChallenge() {},
    async consumeNewEmailChallenge() {
      return true;
    },
    async updateVerifiedEmail({ email }) {
      return email;
    },
    async incrementAccountVersion() {},
    async consumeAllActiveSecurityChallenges() {},
  };
  return {
    async withTransaction(operation) {
      return operation(transaction);
    },
  };
}

const security = {
  async verifyCurrentPassword() {
    return successfulPasswordCheck;
  },
  async invalidateChallenge() {},
};

function createDelivery(overrides = {}) {
  return {
    isConfigured: true,
    async sendAccountEmailChangeCurrentCode(input) {
      overrides.currentCode?.(input);
    },
    async sendAccountEmailChangeNewCode(input) {
      overrides.newCode?.(input);
    },
    async sendAccountEmailChangeSecurityNotice(input) {
      overrides.securityNotice?.(input);
    },
  };
}

test("email-change application modules do not import persistence packages", async () => {
  const files = await readdir(applicationDirectory);
  for (const file of files.filter((name) => name.endsWith(".ts"))) {
    const source = await readFile(
      path.join(applicationDirectory, file),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /(?:from\s*|import\s*\()\s*["'](?:@workspace\/db|drizzle-orm)(?:\/[^"']*)?["']/,
      `${file} must not import database packages.`,
    );
  }
});

test("starting an email change persists a current-address challenge and sends it", async () => {
  const insertedChallenges = [];
  let sentCode;
  const start = createStartEmailChange(
    createRepository({ insertedChallenges }),
    security,
  );

  const result = await start(
    accountId,
    "current-password",
    "new@example.com",
    createDelivery({ currentCode: (input) => (sentCode = input.code) }),
  );

  assert.equal(result.kind, "created");
  assert.equal(insertedChallenges.length, 1);
  assert.equal(insertedChallenges[0].purpose, "account_email_change_current");
  assert.equal(insertedChallenges[0].pendingEmail, "new@example.com");
  assert.equal(
    insertedChallenges[0].tokenHash,
    hashAccountEmailChangeCode(
      accountId,
      insertedChallenges[0].id,
      "account_email_change_current",
      sentCode,
    ),
  );
  assert.equal(result.newEmailMasked.includes("new@example.com"), false);
});

test("confirming the current address creates the new-address challenge", async () => {
  const code = "123456";
  const challenge = {
    id: "current-challenge",
    tokenHash: hashAccountEmailChangeCode(
      accountId,
      "current-challenge",
      "account_email_change_current",
      code,
    ),
    pendingEmail: "new@example.com",
    attempts: 0,
  };
  const insertedChallenges = [];
  let deliveredCode;
  const confirm = createConfirmCurrentEmailChange(
    createRepository({ challenge, insertedChallenges }),
    security,
  );

  const result = await confirm(
    accountId,
    challenge.id,
    code,
    createDelivery({ newCode: (input) => (deliveredCode = input.code) }),
  );

  assert.equal(result.kind, "created");
  assert.equal(insertedChallenges.length, 1);
  assert.equal(insertedChallenges[0].purpose, "account_email_change_new");
  assert.equal(
    insertedChallenges[0].tokenHash,
    hashAccountEmailChangeCode(
      accountId,
      insertedChallenges[0].id,
      "account_email_change_new",
      deliveredCode,
    ),
  );
});

test("confirming the new address updates the verified email and notifies the old one", async () => {
  const code = "654321";
  const challenge = {
    id: "new-challenge",
    tokenHash: hashAccountEmailChangeCode(
      accountId,
      "new-challenge",
      "account_email_change_new",
      code,
    ),
    pendingEmail: "new@example.com",
    attempts: 0,
  };
  let notice;
  const confirm = createConfirmNewEmailChange(createRepository({ challenge }));

  const result = await confirm(
    accountId,
    challenge.id,
    code,
    createDelivery({ securityNotice: (input) => (notice = input) }),
  );

  assert.deepEqual(result, {
    kind: "updated",
    email: "new@example.com",
    securityNoticeSent: true,
  });
  assert.equal(notice.email, owner.email);
  assert.equal(notice.newEmailMasked.includes("new@example.com"), false);
});

test("email-address uniqueness races become an explicit unavailable result", async () => {
  const code = "654321";
  const challenge = {
    id: "racing-new-challenge",
    tokenHash: hashAccountEmailChangeCode(
      accountId,
      "racing-new-challenge",
      "account_email_change_new",
      code,
    ),
    pendingEmail: "raced@example.com",
    attempts: 0,
  };
  const repository = {
    async withTransaction(operation) {
      const transaction = {
        async lockOwner() {
          return owner;
        },
        async lockActiveChallenge() {
          return challenge;
        },
        async isEmailInUse() {
          return false;
        },
        async consumeNewEmailChallenge() {
          return true;
        },
        async updateVerifiedEmail() {
          throw new EmailAddressConflictError();
        },
      };
      return operation(transaction);
    },
  };
  const confirm = createConfirmNewEmailChange(repository);

  const result = await confirm(accountId, challenge.id, code, createDelivery());

  assert.deepEqual(result, { kind: "email_unavailable" });
});

test("the final incorrect current-address code clears the pending email", async () => {
  let attempt;
  const challenge = {
    id: "attempt-limited",
    tokenHash: hashAccountEmailChangeCode(
      accountId,
      "attempt-limited",
      "account_email_change_current",
      "000000",
    ),
    pendingEmail: "new@example.com",
    attempts: 4,
  };
  const confirm = createConfirmCurrentEmailChange(
    createRepository({
      challenge,
      invalidCode(input) {
        attempt = input;
      },
    }),
    security,
  );

  const result = await confirm(
    accountId,
    challenge.id,
    "999999",
    createDelivery(),
  );

  assert.equal(result.kind, "invalid");
  assert.equal(attempt.clearPendingEmail, true);
});
