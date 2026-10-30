import type { Request } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { PASSWORD_POLICY_VERSION } from "@workspace/api-zod";
import { accountEmails, accounts, db, passwordCredentials, sessions, trustedDevices } from "@workspace/db";
import { getProfileDisplayName } from "../modules/profiles/composition/profileDisplayName";
import { SESSION_COOKIE } from "./sessionConfig";
import { hashToken } from "./tokenHashing";

export async function loadActiveSession(request: Request) {
  const rawToken = request.cookies?.[SESSION_COOKIE];
  if (!rawToken) return null;

  const [row] = await db
    .select({
      sessionId: sessions.id,
      accountId: accounts.id,
      username: accounts.username,
      accountType: accounts.accountType,
      accountStatus: accounts.status,
      securityLockedAt: accounts.securityLockedAt,
      onboardingCompletedAt: accounts.onboardingCompletedAt,
      emailVerifiedAt: accountEmails.verifiedAt,
      sessionPasswordPolicyVersion: sessions.passwordPolicyVersion,
      credentialPasswordPolicyVersion: passwordCredentials.passwordPolicyVersion,
      deviceId: trustedDevices.id,
      csrfTokenHash: sessions.csrfTokenHash,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(accounts, eq(sessions.accountId, accounts.id))
    .innerJoin(trustedDevices, and(
      eq(sessions.deviceId, trustedDevices.id),
      eq(trustedDevices.accountId, accounts.id),
      isNull(trustedDevices.revokedAt),
    ))
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
    .where(and(
      eq(sessions.tokenHash, hashToken(rawToken)),
      isNull(sessions.revokedAt),
      gt(sessions.expiresAt, new Date()),
    ))
    .limit(1);

  if (
    !row
    || row.accountStatus !== "active"
    || row.securityLockedAt !== null
    || !row.emailVerifiedAt
    || row.credentialPasswordPolicyVersion !== PASSWORD_POLICY_VERSION
    || row.sessionPasswordPolicyVersion !== PASSWORD_POLICY_VERSION
  ) return null;
  return {
    ...row,
    displayName: await getProfileDisplayName(row.accountId),
  };
}
