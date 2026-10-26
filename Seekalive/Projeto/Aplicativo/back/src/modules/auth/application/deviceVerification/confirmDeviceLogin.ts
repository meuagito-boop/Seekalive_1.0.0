import { and, eq, gt, isNull, lt } from "drizzle-orm";
import {
  accountEmails,
  accounts,
  authChallenges,
  db,
  passwordCredentials,
  sessions,
  trustedDevices,
} from "@workspace/db";
import { PASSWORD_POLICY_VERSION } from "@workspace/api-zod";
import {
  constantTimeEquals,
  hashDeviceLoginCode,
  hashToken,
} from "../../../../security/session";
import {
  DEVICE_FINAL_RESEND_COOLDOWN_MS,
  DEVICE_RESEND_COOLDOWN_MS,
  MAX_DEVICE_LOGIN_ATTEMPTS,
} from "../challenges/deviceLogin";
import { createSessionMaterial } from "../sessionMaterial";

export type DeviceLoginConfirmationResult =
  | { kind: "unavailable" }
  | { kind: "locked" }
  | { kind: "invalid" }
  | { kind: "password_update_required" }
  | { kind: "wrong_code"; resendAvailableAt: Date; attemptsRemaining: number }
  | {
      kind: "authenticated";
      account: {
        id: string;
        username: string;
        displayName: string;
        accountType: string;
        status: string;
        securityLockedAt: Date | null;
        onboardingCompletedAt: Date | null;
        createdAt: Date;
        verifiedAt: Date | null;
        passwordPolicyVersion: number;
      };
      session: { id: string; createdAt: Date; expiresAt: Date };
      material: ReturnType<typeof createSessionMaterial>;
    };

export async function confirmDeviceLogin(
  challengeId: string,
  code: string,
  rawDeviceToken: string,
): Promise<DeviceLoginConfirmationResult> {
  const [preview] = await db
    .select({ accountId: authChallenges.accountId })
    .from(authChallenges)
    .where(and(
      eq(authChallenges.id, challengeId),
      eq(authChallenges.purpose, "device_login"),
    ))
    .limit(1);
  if (!preview) return { kind: "invalid" };

  const now = new Date();
  const material = createSessionMaterial();
  return db.transaction(async (tx) => {
    const [account] = await tx
      .select({
        id: accounts.id,
        username: accounts.username,
        displayName: accounts.displayName,
        accountType: accounts.accountType,
        status: accounts.status,
        securityLockedAt: accounts.securityLockedAt,
        onboardingCompletedAt: accounts.onboardingCompletedAt,
        createdAt: accounts.createdAt,
        verifiedAt: accountEmails.verifiedAt,
        passwordPolicyVersion: passwordCredentials.passwordPolicyVersion,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
      .where(eq(accounts.id, preview.accountId))
      .for("update")
      .limit(1);
    if (!account || account.status !== "active" || !account.verifiedAt) return { kind: "unavailable" as const };
    if (account.securityLockedAt) return { kind: "locked" as const };

    const [challenge] = await tx
      .select({
        id: authChallenges.id,
        tokenHash: authChallenges.tokenHash,
        deviceTokenHash: authChallenges.deviceTokenHash,
        attempts: authChallenges.attempts,
      })
      .from(authChallenges)
      .where(and(
        eq(authChallenges.id, challengeId),
        eq(authChallenges.accountId, account.id),
        eq(authChallenges.purpose, "device_login"),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now),
        lt(authChallenges.attempts, MAX_DEVICE_LOGIN_ATTEMPTS),
      ))
      .for("update")
      .limit(1);
    if (
      !challenge
      || !challenge.deviceTokenHash
      || !constantTimeEquals(hashToken(rawDeviceToken), challenge.deviceTokenHash)
    ) return { kind: "invalid" as const };

    const expectedHash = hashDeviceLoginCode(account.id, challenge.id, code);
    if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
      const attempts = challenge.attempts + 1;
      if (attempts >= MAX_DEVICE_LOGIN_ATTEMPTS) {
        await tx
          .update(authChallenges)
          .set({ attempts, consumedAt: now })
          .where(eq(authChallenges.id, challenge.id));
        await tx
          .update(accounts)
          .set({ securityLockedAt: now, updatedAt: now })
          .where(and(eq(accounts.id, account.id), isNull(accounts.securityLockedAt)));
        await tx
          .update(sessions)
          .set({ revokedAt: now })
          .where(and(eq(sessions.accountId, account.id), isNull(sessions.revokedAt)));
        await tx
          .update(trustedDevices)
          .set({ revokedAt: now })
          .where(and(eq(trustedDevices.accountId, account.id), isNull(trustedDevices.revokedAt)));
        await tx
          .update(authChallenges)
          .set({ consumedAt: now })
          .where(and(
            eq(authChallenges.accountId, account.id),
            eq(authChallenges.purpose, "device_login"),
            isNull(authChallenges.consumedAt),
          ));
        return { kind: "locked" as const };
      }

      const resendDelay = attempts >= 2
        ? DEVICE_FINAL_RESEND_COOLDOWN_MS
        : DEVICE_RESEND_COOLDOWN_MS;
      const resendAvailableAt = new Date(now.getTime() + resendDelay);
      await tx
        .update(authChallenges)
        .set({ attempts, resendAvailableAt })
        .where(eq(authChallenges.id, challenge.id));
      return {
        kind: "wrong_code" as const,
        resendAvailableAt,
        attemptsRemaining: MAX_DEVICE_LOGIN_ATTEMPTS - attempts,
      };
    }

    if (account.passwordPolicyVersion < PASSWORD_POLICY_VERSION) {
      return { kind: "password_update_required" as const };
    }

    const [consumedChallenge] = await tx
      .update(authChallenges)
      .set({ consumedAt: now })
      .where(and(eq(authChallenges.id, challenge.id), isNull(authChallenges.consumedAt)))
      .returning({ id: authChallenges.id });
    if (!consumedChallenge) return { kind: "invalid" as const };

    const [device] = await tx
      .insert(trustedDevices)
      .values({
        accountId: account.id,
        tokenHash: challenge.deviceTokenHash,
        createdAt: now,
        lastSeenAt: now,
      })
      .returning({ id: trustedDevices.id });
    if (!device) throw new Error("Trusted device insert returned no row.");

    const [session] = await tx
      .insert(sessions)
      .values({
        accountId: account.id,
        deviceId: device.id,
        tokenHash: material.tokenHash,
        csrfTokenHash: material.csrfTokenHash,
        passwordPolicyVersion: PASSWORD_POLICY_VERSION,
        createdAt: material.createdAt,
        expiresAt: material.expiresAt,
      })
      .returning({ id: sessions.id, createdAt: sessions.createdAt, expiresAt: sessions.expiresAt });
    if (!session) throw new Error("Session insert returned no row.");
    return { kind: "authenticated" as const, account, session, material };
  });
}
