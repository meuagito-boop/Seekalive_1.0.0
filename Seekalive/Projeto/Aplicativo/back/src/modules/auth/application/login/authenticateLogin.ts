import argon2 from "argon2";
import { and, eq, isNull } from "drizzle-orm";
import {
  accountEmails,
  accounts,
  db,
  passwordCredentials,
  sessions,
  trustedDevices,
} from "@workspace/db";
import { PASSWORD_POLICY_VERSION, passwordPolicySchema } from "@workspace/api-zod";
import { DEVICE_COOKIE, hashToken } from "../../../../security/session";
import { fallbackPasswordHashPromise } from "../passwordHashing";
import { createSessionMaterial } from "../sessionMaterial";

async function findLoginAccount(identifier: string) {
  const isEmail = identifier.includes("@");
  const condition = isEmail
    ? eq(accountEmails.emailNormalized, identifier)
    : eq(accounts.username, identifier);
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
    .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
    .where(condition)
    .limit(1);
  return row ?? null;
}

export type LoginAccount = NonNullable<Awaited<ReturnType<typeof findLoginAccount>>>;

type AuthenticationFailure =
  | "invalid_credentials"
  | "email_not_verified"
  | "account_unavailable"
  | "account_locked"
  | "credentials_changed"
  | "unsupported_policy"
  | "password_update_required";

type AuthenticationFailureResult = {
  [Kind in AuthenticationFailure]: { kind: Kind };
}[AuthenticationFailure];

export type LoginAuthenticationResult =
  | AuthenticationFailureResult
  | { kind: "unknown_device"; account: LoginAccount }
  | {
      kind: "authenticated";
      account: LoginAccount;
      material: ReturnType<typeof createSessionMaterial>;
      session: { id: string; createdAt: Date; expiresAt: Date };
      deviceToken: string | null;
    };

export async function authenticateLogin(
  rawIdentifier: string,
  password: string,
  rawDeviceToken: unknown,
): Promise<LoginAuthenticationResult> {
  const identifier = rawIdentifier.trim().replace(/^@/, "").toLowerCase();
  const row = await findLoginAccount(identifier);
  const fallbackHash = await fallbackPasswordHashPromise;
  const passwordIsValid = await argon2
    .verify(row?.passwordHash ?? fallbackHash, password)
    .catch(() => false);

  if (!row || !passwordIsValid) return { kind: "invalid_credentials" };
  if (row.accountStatus === "pending_verification" || !row.emailVerifiedAt) {
    return { kind: "email_not_verified" };
  }
  if (row.accountStatus !== "active") return { kind: "account_unavailable" };
  if (row.securityLockedAt) return { kind: "account_locked" };

  const passwordMatchesCurrentPolicy = passwordPolicySchema.safeParse(password).success;
  const usableDeviceToken = typeof rawDeviceToken === "string"
    && /^[A-Za-z0-9_-]{43}$/.test(rawDeviceToken)
    ? rawDeviceToken
    : null;
  const candidateDeviceHash = usableDeviceToken ? hashToken(usableDeviceToken) : null;
  const loginResult = await db.transaction(async (tx) => {
    const [currentAccount] = await tx
      .select({
        status: accounts.status,
        verifiedAt: accountEmails.verifiedAt,
        securityLockedAt: accounts.securityLockedAt,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(eq(accounts.id, row.id))
      .for("update")
      .limit(1);
    if (!currentAccount || currentAccount.status !== "active") return { kind: "account_unavailable" as const };
    if (!currentAccount.verifiedAt) return { kind: "email_not_verified" as const };
    if (currentAccount.securityLockedAt) return { kind: "account_locked" as const };

    const [credential] = await tx
      .select({
        passwordHash: passwordCredentials.passwordHash,
        passwordPolicyVersion: passwordCredentials.passwordPolicyVersion,
      })
      .from(passwordCredentials)
      .where(eq(passwordCredentials.accountId, row.id))
      .for("update")
      .limit(1);
    if (!credential || credential.passwordHash !== row.passwordHash) {
      return { kind: "credentials_changed" as const };
    }
    if (credential.passwordPolicyVersion > PASSWORD_POLICY_VERSION) {
      return { kind: "unsupported_policy" as const };
    }
    if (credential.passwordPolicyVersion < PASSWORD_POLICY_VERSION && !passwordMatchesCurrentPolicy) {
      return { kind: "password_update_required" as const };
    }
    if (credential.passwordPolicyVersion < PASSWORD_POLICY_VERSION) {
      await tx
        .update(passwordCredentials)
        .set({ passwordPolicyVersion: PASSWORD_POLICY_VERSION })
        .where(eq(passwordCredentials.accountId, row.id));
    }

    const [device] = candidateDeviceHash
      ? await tx
        .select({ id: trustedDevices.id })
        .from(trustedDevices)
        .where(and(
          eq(trustedDevices.accountId, row.id),
          eq(trustedDevices.tokenHash, candidateDeviceHash),
          isNull(trustedDevices.revokedAt),
        ))
        .for("update")
        .limit(1)
      : [];
    if (!device) return { kind: "unknown_device" as const };

    await tx
      .update(trustedDevices)
      .set({ lastSeenAt: new Date() })
      .where(eq(trustedDevices.id, device.id));
    const material = createSessionMaterial();
    const [session] = await tx
      .insert(sessions)
      .values({
        accountId: row.id,
        deviceId: device.id,
        tokenHash: material.tokenHash,
        csrfTokenHash: material.csrfTokenHash,
        passwordPolicyVersion: PASSWORD_POLICY_VERSION,
        createdAt: material.createdAt,
        expiresAt: material.expiresAt,
      })
      .returning({ id: sessions.id, createdAt: sessions.createdAt, expiresAt: sessions.expiresAt });
    if (!session) throw new Error("Session insert returned no row.");
    return { kind: "authenticated" as const, material, session };
  });

  if (loginResult.kind === "unknown_device") return { kind: "unknown_device", account: row };
  if (loginResult.kind !== "authenticated") return loginResult;
  return {
    kind: "authenticated",
    account: row,
    material: loginResult.material,
    session: loginResult.session,
    deviceToken: usableDeviceToken,
  };
}
