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
  accountFollows,
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
const usernameAvailability =
  await import("../src/modules/profiles/infrastructure/usernameAvailabilityRepository.ts");
const loginRepository =
  await import("../src/modules/auth/infrastructure/loginRepository.ts");
const socialStatistics =
  await import("../src/modules/social/infrastructure/socialStatisticsRepository.ts");
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

test("account deletion request, restoration, retention, and final purge follow policy", async () => {
  assert.equal(
    await (
      await import("../src/modules/auth/infrastructure/accountDeletionSchemaStatus.ts")
    ).isAccountDeletionSchemaReady(),
    true,
  );

  const account = await createAccount("restore");
  const activeTarget = await createAccount("retained-follow-target");
  await db.insert(accountFollows).values({
    followerId: account.id,
    followedId: activeTarget.id,
  });
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
  const deletionScheduledFor =
    deletionPolicy.calculateAccountDeletionDeadline(deletionRequestedAt);
  const retentionUntil =
    deletionPolicy.calculateAccountDeletionRetentionDeadline(
      deletionScheduledFor,
    );
  await db
    .update(accounts)
    .set({
      status: "deletion_pending",
      deletionRequestedAt,
      deletionScheduledFor,
    })
    .where(eq(accounts.id, account.id));

  assert.equal(await deletionFinalizer.finalizeDueAccountDeletions(), 1);
  assert.equal(
    await deletionFinalizer.finalizeDueAccountDeletions(),
    0,
    "Running the finalizer again must not delete or process the same account twice.",
  );
  const [retainedAccount] = await db
    .select({
      status: accounts.status,
      deletionRetentionUntil: accounts.deletionRetentionUntil,
    })
    .from(accounts)
    .where(eq(accounts.id, account.id));
  assert.equal(retainedAccount.status, "deletion_retained");
  assert.equal(
    retainedAccount.deletionRetentionUntil.getTime(),
    retentionUntil.getTime(),
  );
  assert.equal(
    (await requestRestorationCode()(account.id)).kind,
    "account_unavailable",
    "An account cannot be restored after its seven-day grace period.",
  );
  const [reservation] = await db
    .select({
      accountId: accountUsernameReservations.accountId,
      reservedUntil: accountUsernameReservations.reservedUntil,
    })
    .from(accountUsernameReservations)
    .where(eq(accountUsernameReservations.username, account.username));
  assert.equal(reservation.accountId, account.id);
  assert.equal(
    reservation.reservedUntil.getTime(),
    deletionRequestedAt.getTime() + 30 * 24 * 60 * 60 * 1000,
  );
  const retainedSessions = await db
    .select({ revokedAt: sessions.revokedAt })
    .from(sessions)
    .where(eq(sessions.accountId, account.id));
  assert.ok(retainedSessions.length > 0);
  assert.ok(
    retainedSessions.every((session) => session.revokedAt),
    "Session records remain only for retention and are already revoked.",
  );
  const retainedChallenges = await db
    .select({ consumedAt: authChallenges.consumedAt })
    .from(authChallenges)
    .where(eq(authChallenges.accountId, account.id));
  assert.ok(retainedChallenges.length > 0);
  assert.ok(
    retainedChallenges.every((challenge) => challenge.consumedAt),
    "Authentication challenges remain consumed during retention.",
  );
  assert.equal(
    (await socialStatistics.readAccountSocialStats(activeTarget.id)).followers,
    0,
    "Retained account relationships must not appear in active social counts.",
  );
  assert.deepEqual(
    (await socialStatistics.readSocialSummaryRows([activeTarget.id], null))
      .followerCounts,
    [],
  );

  assert.equal(
    await deletionFinalizer.finalizeDueAccountDeletions(retentionUntil),
    1,
  );
  assert.equal(
    await deletionFinalizer.finalizeDueAccountDeletions(retentionUntil),
    0,
    "Purging an expired retention record must be idempotent.",
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
  const [releasedReservation] = await db
    .select({
      accountId: accountUsernameReservations.accountId,
      reservedUntil: accountUsernameReservations.reservedUntil,
    })
    .from(accountUsernameReservations)
    .where(eq(accountUsernameReservations.username, account.username));
  assert.equal(releasedReservation.accountId, null);
  assert.equal(
    releasedReservation.reservedUntil.getTime(),
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

test("a retained account releases its username after the 30-day hold", async () => {
  const deletedAccount = await createAccount("username-reuse");
  const now = new Date();
  const deletionRequestedAt = new Date(
    now.getTime() - 31 * 24 * 60 * 60 * 1000,
  );
  await db
    .update(accounts)
    .set({
      status: "deletion_pending",
      deletionRequestedAt,
      deletionScheduledFor:
        deletionPolicy.calculateAccountDeletionDeadline(deletionRequestedAt),
    })
    .where(eq(accounts.id, deletedAccount.id));

  assert.equal(await deletionFinalizer.finalizeDueAccountDeletions(now), 1);
  assert.equal(
    await usernameAvailability.isUsernameClaimedOrReserved(
      deletedAccount.username,
    ),
    false,
  );

  const newAccountId = randomUUID();
  await db.insert(accounts).values({
    id: newAccountId,
    username: deletedAccount.username,
    age: 30,
    acceptedTermsVersion: "test",
    displayName: "New owner of username",
    accountType: "personal",
    status: "active",
  });
  await db.insert(accountEmails).values({
    accountId: newAccountId,
    emailNormalized: `username-reuse-${randomUUID()}@example.test`,
    verifiedAt: new Date(),
  });
  await db.insert(passwordCredentials).values({
    accountId: newAccountId,
    passwordHash: "test-password-hash",
    passwordPolicyVersion: 1,
  });

  const loginAccount = await loginRepository.loginRepository.findLoginAccount({
    kind: "username",
    identifier: deletedAccount.username,
  });
  assert.equal(loginAccount?.id, newAccountId);
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
