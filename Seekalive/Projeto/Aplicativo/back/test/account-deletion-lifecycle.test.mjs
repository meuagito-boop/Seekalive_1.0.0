import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
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
const sessionSecret = "seekalive-account-deletion-lifecycle-isolated-secret";

configureIsolatedDatabaseEnvironment({ schemaName, sessionSecret });

const database = await import("@workspace/db");
const {
  accountEmails,
  accountUsernameReservations,
  accounts,
  authChallenges,
  db,
  passwordCredentials,
  pool,
  sessions,
  trustedDevices,
} = database;
const deletionPolicy =
  await import("../src/modules/accounts/domain/accountDeletionPolicy.ts");
const deletionRepository =
  await import("../src/modules/auth/infrastructure/accountDeletionRepository.ts");
const deletionFinalizer =
  await import("../src/modules/auth/infrastructure/accountDeletionFinalizerRepository.ts");
const deletionUseCases =
  await import("../src/modules/auth/application/accountDeletion/confirmAccountDeletion.ts");
const requestDeletionUseCase =
  await import("../src/modules/auth/application/accountDeletion/requestAccountDeletionCode.ts");
const requestRestorationUseCase =
  await import("../src/modules/auth/application/accountDeletion/requestAccountRestorationCode.ts");
const restorationUseCase =
  await import("../src/modules/auth/application/accountDeletion/confirmAccountRestoration.ts");
const hashing = await import("../src/security/tokenHashing.ts");

let isolatedDatabaseFixture;
const sentCodes = [];

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
  } else {
    await pool.end();
  }
});

async function createAccount(label) {
  const accountId = randomUUID();
  const [account] = await db
    .insert(accounts)
    .values({
      id: accountId,
      username: `del_${randomUUID().replaceAll("-", "").slice(0, 12)}`,
      age: 30,
      acceptedTermsVersion: "test",
      displayName: `Lifecycle ${label}`,
      accountType: "personal",
      status: "active",
    })
    .returning({ id: accounts.id, username: accounts.username });

  const now = new Date();
  await db.insert(accountEmails).values({
    accountId,
    emailNormalized: `deletion-${label}-${randomUUID()}@example.test`,
    verifiedAt: now,
  });
  await db.insert(passwordCredentials).values({
    accountId,
    passwordHash: "test-password-hash",
    passwordPolicyVersion: 1,
  });

  const [device] = await db
    .insert(trustedDevices)
    .values({
      accountId,
      tokenHash: randomBytes(32).toString("hex"),
    })
    .returning({ id: trustedDevices.id });
  await db.insert(sessions).values({
    accountId,
    deviceId: device.id,
    tokenHash: randomBytes(32).toString("hex"),
    csrfTokenHash: randomBytes(32).toString("hex"),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
  });

  return account;
}

function requestDeletionCode() {
  return requestDeletionUseCase.createRequestAccountDeletionCode({
    writeChallenge: deletionRepository.writeAccountDeletionChallenge,
    invalidateChallenge: deletionRepository.invalidateAccountDeletionChallenge,
    getEmailDelivery: () => ({
      isConfigured: true,
      async sendAccountDeletionCode(message) {
        sentCodes.push(message);
      },
    }),
  });
}

function requestRestorationCode() {
  return requestRestorationUseCase.createRequestAccountRestorationCode({
    writeChallenge: deletionRepository.writeAccountDeletionChallenge,
    invalidateChallenge: deletionRepository.invalidateAccountDeletionChallenge,
    getEmailDelivery: () => ({
      isConfigured: true,
      async sendAccountDeletionCode(message) {
        sentCodes.push(message);
      },
    }),
  });
}

test("account deletion request, restoration, and final purge follow the approved lifecycle", async () => {
  assert.equal(
    await (
      await import("../src/modules/auth/infrastructure/accountDeletionSchemaStatus.ts")
    ).isAccountDeletionSchemaReady(),
    true,
  );

  const account = await createAccount("restore");
  const requestCode = requestDeletionCode();
  const codeSent = await requestCode(account.id);
  assert.equal(codeSent.kind, "code_sent");
  assert.equal(sentCodes.at(-1).purpose, "request_deletion");
  assert.match(sentCodes.at(-1).email, /@example\.test$/);

  const scheduled = await deletionUseCases.createConfirmAccountDeletion(
    deletionRepository.confirmAccountDeletionCode,
  )({
    accountId: account.id,
    challengeId: codeSent.challengeId,
    code: sentCodes.at(-1).code,
  });
  assert.equal(scheduled.kind, "scheduled");
  assert.equal(
    scheduled.deletionScheduledFor.getTime() -
      (
        await db
          .select({ requestedAt: accounts.deletionRequestedAt })
          .from(accounts)
          .where(eq(accounts.id, account.id))
      )[0].requestedAt.getTime(),
    7 * 24 * 60 * 60 * 1000,
  );

  const [pendingAccount] = await db
    .select({
      status: accounts.status,
      deletionRequestedAt: accounts.deletionRequestedAt,
      deletionScheduledFor: accounts.deletionScheduledFor,
    })
    .from(accounts)
    .where(eq(accounts.id, account.id));
  assert.equal(pendingAccount.status, "deletion_pending");
  assert.ok(pendingAccount.deletionRequestedAt);
  assert.equal(
    pendingAccount.deletionScheduledFor.getTime(),
    scheduled.deletionScheduledFor.getTime(),
  );

  const [revokedSession] = await db
    .select({ revokedAt: sessions.revokedAt })
    .from(sessions)
    .where(eq(sessions.accountId, account.id));
  assert.ok(revokedSession.revokedAt);

  const restoreCodeRequest = requestRestorationCode();
  const restoreCodeSent = await restoreCodeRequest(account.id);
  assert.equal(restoreCodeSent.kind, "code_sent");
  assert.equal(sentCodes.at(-1).purpose, "restore_account");

  const restored = await restorationUseCase.createConfirmAccountRestoration(
    deletionRepository.confirmAccountDeletionCode,
  )({
    accountId: account.id,
    challengeId: restoreCodeSent.challengeId,
    code: sentCodes.at(-1).code,
  });
  assert.deepEqual(restored, { kind: "restored" });

  const [restoredAccount] = await db
    .select({
      status: accounts.status,
      deletionRequestedAt: accounts.deletionRequestedAt,
      deletionScheduledFor: accounts.deletionScheduledFor,
    })
    .from(accounts)
    .where(eq(accounts.id, account.id));
  assert.deepEqual(restoredAccount, {
    status: "active",
    deletionRequestedAt: null,
    deletionScheduledFor: null,
  });
  const [stillRevokedSession] = await db
    .select({ revokedAt: sessions.revokedAt })
    .from(sessions)
    .where(eq(sessions.accountId, account.id));
  assert.ok(stillRevokedSession.revokedAt);

  const deletionRequestedAt = new Date(Date.now() - 24 * 24 * 60 * 60 * 1000);
  await db
    .update(accounts)
    .set({
      status: "deletion_pending",
      deletionRequestedAt,
      deletionScheduledFor:
        deletionPolicy.calculateAccountDeletionDeadline(deletionRequestedAt),
    })
    .where(eq(accounts.id, account.id));

  assert.equal(await deletionFinalizer.finalizeDueAccountDeletions(), 1);
  assert.equal(
    await deletionFinalizer.finalizeDueAccountDeletions(),
    0,
    "Running the finalizer again must not delete or process the same account twice.",
  );
  assert.equal(
    (
      await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.id, account.id))
    ).length,
    0,
  );
  const [reservation] = await db
    .select({
      accountId: accountUsernameReservations.accountId,
      reservedUntil: accountUsernameReservations.reservedUntil,
    })
    .from(accountUsernameReservations)
    .where(eq(accountUsernameReservations.username, account.username));
  assert.equal(reservation.accountId, null);
  assert.equal(
    reservation.reservedUntil.getTime(),
    deletionRequestedAt.getTime() + 30 * 24 * 60 * 60 * 1000,
  );
  assert.equal(
    (
      await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(eq(sessions.accountId, account.id))
    ).length,
    0,
  );
  assert.equal(
    (
      await db
        .select({ id: authChallenges.id })
        .from(authChallenges)
        .where(eq(authChallenges.accountId, account.id))
    ).length,
    0,
  );
});

test("a wrong account-deletion code is limited to three attempts", async () => {
  const account = await createAccount("attempts");
  const result = await requestDeletionCode()(account.id);
  assert.equal(result.kind, "code_sent");
  const wrongCodeHash = hashing.hashAccountDeletionCode(
    account.id,
    result.challengeId,
    "account_deletion_request",
    "000000",
  );
  const now = new Date();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const confirmation = await deletionRepository.confirmAccountDeletionCode({
      accountId: account.id,
      challengeId: result.challengeId,
      purpose: "account_deletion_request",
      tokenHash: wrongCodeHash,
      now,
      maximumAttempts: 3,
    });
    assert.equal(confirmation.kind, "invalid_code");
  }

  const [challenge] = await db
    .select({
      attempts: authChallenges.attempts,
      consumedAt: authChallenges.consumedAt,
    })
    .from(authChallenges)
    .where(eq(authChallenges.id, result.challengeId));
  assert.equal(challenge.attempts, 3);
  assert.ok(challenge.consumedAt);
});
