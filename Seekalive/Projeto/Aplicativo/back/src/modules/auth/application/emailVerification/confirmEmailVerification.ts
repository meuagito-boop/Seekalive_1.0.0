import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, lt } from "drizzle-orm";
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
  hashToken,
  hashVerificationCode,
} from "../../../../security/session";
import { createSessionMaterial } from "../sessionMaterial";

const MAX_VERIFICATION_ATTEMPTS = 5;

export type EmailVerificationResult =
  | { kind: "invalid" }
  | { kind: "password_update_required" }
  | {
      kind: "authenticated";
      account: {
        id: string;
        username: string;
        displayName: string;
        accountType: string;
        status: string;
        onboardingCompletedAt: Date | null;
        createdAt: Date;
        verifiedAt: Date | null;
        passwordPolicyVersion: number;
      };
      session: { id: string; createdAt: Date; expiresAt: Date };
      material: ReturnType<typeof createSessionMaterial>;
      deviceRawToken: string;
    };

export async function confirmEmailVerification(
  email: string,
  code: string,
): Promise<EmailVerificationResult> {
  const [account] = await db
    .select({
      id: accounts.id,
      username: accounts.username,
      displayName: accounts.displayName,
      accountType: accounts.accountType,
      status: accounts.status,
      onboardingCompletedAt: accounts.onboardingCompletedAt,
      createdAt: accounts.createdAt,
      verifiedAt: accountEmails.verifiedAt,
      passwordPolicyVersion: passwordCredentials.passwordPolicyVersion,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
    .where(eq(accountEmails.emailNormalized, email))
    .limit(1);
  if (!account || account.status !== "pending_verification" || account.verifiedAt) {
    return { kind: "invalid" };
  }

  const now = new Date();
  const material = createSessionMaterial();
  const deviceRawToken = randomBytes(32).toString("base64url");
  try {
    const result = await db.transaction(async (tx) => {
      const [challenge] = await tx
        .select({
          id: authChallenges.id,
          attempts: authChallenges.attempts,
          tokenHash: authChallenges.tokenHash,
        })
        .from(authChallenges)
        .where(and(
          eq(authChallenges.accountId, account.id),
          eq(authChallenges.purpose, "verify_email"),
          isNull(authChallenges.consumedAt),
          gt(authChallenges.expiresAt, now),
          lt(authChallenges.attempts, MAX_VERIFICATION_ATTEMPTS),
        ))
        .orderBy(desc(authChallenges.createdAt))
        .for("update")
        .limit(1);
      if (!challenge) return { kind: "invalid" as const };

      const expectedHash = hashVerificationCode(account.id, code);
      if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
        await tx
          .update(authChallenges)
          .set({ attempts: challenge.attempts + 1 })
          .where(and(
            eq(authChallenges.id, challenge.id),
            isNull(authChallenges.consumedAt),
            gt(authChallenges.expiresAt, now),
            lt(authChallenges.attempts, MAX_VERIFICATION_ATTEMPTS),
          ));
        return { kind: "invalid" as const };
      }

      const [consumedChallenge] = await tx
        .update(authChallenges)
        .set({ consumedAt: now })
        .where(and(
          eq(authChallenges.id, challenge.id),
          isNull(authChallenges.consumedAt),
          gt(authChallenges.expiresAt, now),
          lt(authChallenges.attempts, MAX_VERIFICATION_ATTEMPTS),
        ))
        .returning({ id: authChallenges.id });
      if (!consumedChallenge) return { kind: "invalid" as const };

      const [verifiedEmail] = await tx
        .update(accountEmails)
        .set({ verifiedAt: now, updatedAt: now })
        .where(and(eq(accountEmails.accountId, account.id), isNull(accountEmails.verifiedAt)))
        .returning({ accountId: accountEmails.accountId });
      if (!verifiedEmail) throw new Error("VERIFICATION_ALREADY_CONSUMED");

      const [activatedAccount] = await tx
        .update(accounts)
        .set({ status: "active", updatedAt: now })
        .where(and(eq(accounts.id, account.id), eq(accounts.status, "pending_verification")))
        .returning({ id: accounts.id });
      if (!activatedAccount) throw new Error("VERIFICATION_ALREADY_CONSUMED");

      if (account.passwordPolicyVersion < PASSWORD_POLICY_VERSION) {
        return { kind: "password_update_required" as const };
      }

      const [device] = await tx
        .insert(trustedDevices)
        .values({
          accountId: account.id,
          tokenHash: hashToken(deviceRawToken),
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
      return { kind: "authenticated" as const, session };
    });
    if (result.kind === "invalid") return result;
    if (result.kind === "password_update_required") return result;
    return {
      kind: "authenticated",
      account,
      session: result.session,
      material,
      deviceRawToken,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "VERIFICATION_ALREADY_CONSUMED") {
      return { kind: "invalid" };
    }
    throw error;
  }
}
