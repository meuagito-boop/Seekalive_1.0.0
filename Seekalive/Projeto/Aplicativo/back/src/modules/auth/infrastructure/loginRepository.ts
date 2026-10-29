import { and, eq, isNull } from "drizzle-orm";
import {
  accountEmails,
  accounts,
  db,
  passwordCredentials,
  sessions,
  trustedDevices,
} from "@workspace/db";
import type { LoginRepository } from "../application/login/ports";

export const loginRepository: LoginRepository = {
  async findLoginAccount(input) {
    const [row] = await db
      .select({
        id: accounts.id,
        username: accounts.username,
        displayName: accounts.displayName,
        accountType: accounts.accountType,
        accountStatus: accounts.status,
        securityLockedAt: accounts.securityLockedAt,
        onboardingCompletedAt: accounts.onboardingCompletedAt,
        createdAt: accounts.createdAt,
        email: accountEmails.emailNormalized,
        emailVerifiedAt: accountEmails.verifiedAt,
        passwordHash: passwordCredentials.passwordHash,
        passwordPolicyVersion: passwordCredentials.passwordPolicyVersion,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .innerJoin(
        passwordCredentials,
        eq(passwordCredentials.accountId, accounts.id),
      )
      .where(
        input.kind === "email"
          ? eq(accountEmails.emailNormalized, input.identifier)
          : eq(accounts.username, input.identifier),
      )
      .limit(1);
    return row ?? null;
  },

  async withTransaction(operation) {
    return db.transaction(async (tx) =>
      operation({
        async lockAccountForAuthentication(accountId) {
          const [account] = await tx
            .select({
              status: accounts.status,
              verifiedAt: accountEmails.verifiedAt,
              securityLockedAt: accounts.securityLockedAt,
            })
            .from(accounts)
            .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
            .where(eq(accounts.id, accountId))
            .for("update")
            .limit(1);
          return account ?? null;
        },

        async findDeletionSchedule(accountId) {
          const [account] = await tx
            .select({ deletionScheduledFor: accounts.deletionScheduledFor })
            .from(accounts)
            .where(eq(accounts.id, accountId))
            .limit(1);
          return account?.deletionScheduledFor ?? null;
        },

        async lockPasswordCredential(accountId) {
          const [credential] = await tx
            .select({
              passwordHash: passwordCredentials.passwordHash,
              passwordPolicyVersion: passwordCredentials.passwordPolicyVersion,
            })
            .from(passwordCredentials)
            .where(eq(passwordCredentials.accountId, accountId))
            .for("update")
            .limit(1);
          return credential ?? null;
        },

        async updatePasswordPolicyVersion(accountId, policyVersion) {
          await tx
            .update(passwordCredentials)
            .set({ passwordPolicyVersion: policyVersion })
            .where(eq(passwordCredentials.accountId, accountId));
        },

        async lockTrustedDevice(accountId, tokenHash) {
          const [device] = await tx
            .select({ id: trustedDevices.id })
            .from(trustedDevices)
            .where(
              and(
                eq(trustedDevices.accountId, accountId),
                eq(trustedDevices.tokenHash, tokenHash),
                isNull(trustedDevices.revokedAt),
              ),
            )
            .for("update")
            .limit(1);
          return device ?? null;
        },

        async updateTrustedDeviceLastSeen(deviceId, now) {
          await tx
            .update(trustedDevices)
            .set({ lastSeenAt: now })
            .where(eq(trustedDevices.id, deviceId));
        },

        async createSession(input) {
          const [session] = await tx
            .insert(sessions)
            .values({
              accountId: input.accountId,
              deviceId: input.deviceId,
              tokenHash: input.material.tokenHash,
              csrfTokenHash: input.material.csrfTokenHash,
              passwordPolicyVersion: input.passwordPolicyVersion,
              createdAt: input.material.createdAt,
              expiresAt: input.material.expiresAt,
            })
            .returning({
              id: sessions.id,
              createdAt: sessions.createdAt,
              expiresAt: sessions.expiresAt,
            });
          return session ?? null;
        },
      }),
    );
  },
};
