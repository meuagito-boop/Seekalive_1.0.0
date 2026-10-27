import argon2 from "argon2";
import {
  PASSWORD_POLICY_VERSION,
  passwordPolicySchema,
} from "@workspace/api-zod";
import { hashToken } from "../../../../security/session";
import { fallbackPasswordHashPromise } from "../passwordHashing";
import { createSessionMaterial } from "../sessionMaterial";
import type { LoginAccount, LoginRepository } from "./ports";

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
      session: {
        id: string;
        createdAt: Date;
        expiresAt: Date;
      };
      deviceToken: string | null;
    };

function normalizeIdentifier(rawIdentifier: string): {
  identifier: string;
  kind: "email" | "username";
} {
  const identifier = rawIdentifier.trim().replace(/^@/, "").toLowerCase();
  return {
    identifier,
    kind: identifier.includes("@") ? "email" : "username",
  };
}

function parseDeviceToken(rawDeviceToken: unknown): string | null {
  return typeof rawDeviceToken === "string" &&
    /^[A-Za-z0-9_-]{43}$/.test(rawDeviceToken)
    ? rawDeviceToken
    : null;
}

export function createAuthenticateLogin(repository: LoginRepository) {
  return async function authenticateLogin(
    rawIdentifier: string,
    password: string,
    rawDeviceToken: unknown,
  ): Promise<LoginAuthenticationResult> {
    const identifier = normalizeIdentifier(rawIdentifier);
    const account = await repository.findLoginAccount(identifier);
    const fallbackHash = await fallbackPasswordHashPromise;
    const passwordIsValid = await argon2
      .verify(account?.passwordHash ?? fallbackHash, password)
      .catch(() => false);

    if (!account || !passwordIsValid) return { kind: "invalid_credentials" };
    if (
      account.accountStatus === "pending_verification" ||
      !account.emailVerifiedAt
    ) {
      return { kind: "email_not_verified" };
    }
    if (account.accountStatus !== "active")
      return { kind: "account_unavailable" };
    if (account.securityLockedAt) return { kind: "account_locked" };

    const passwordMatchesCurrentPolicy =
      passwordPolicySchema.safeParse(password).success;
    const usableDeviceToken = parseDeviceToken(rawDeviceToken);
    const candidateDeviceHash = usableDeviceToken
      ? hashToken(usableDeviceToken)
      : null;
    const result = await repository.withTransaction(async (transaction) => {
      const currentAccount = await transaction.lockAccountForAuthentication(
        account.id,
      );
      if (!currentAccount || currentAccount.status !== "active") {
        return { kind: "account_unavailable" as const };
      }
      if (!currentAccount.verifiedAt)
        return { kind: "email_not_verified" as const };
      if (currentAccount.securityLockedAt)
        return { kind: "account_locked" as const };

      const credential = await transaction.lockPasswordCredential(account.id);
      if (!credential || credential.passwordHash !== account.passwordHash) {
        return { kind: "credentials_changed" as const };
      }
      if (credential.passwordPolicyVersion > PASSWORD_POLICY_VERSION) {
        return { kind: "unsupported_policy" as const };
      }
      if (
        credential.passwordPolicyVersion < PASSWORD_POLICY_VERSION &&
        !passwordMatchesCurrentPolicy
      ) {
        return { kind: "password_update_required" as const };
      }
      if (credential.passwordPolicyVersion < PASSWORD_POLICY_VERSION) {
        await transaction.updatePasswordPolicyVersion(
          account.id,
          PASSWORD_POLICY_VERSION,
        );
      }

      const device = candidateDeviceHash
        ? await transaction.lockTrustedDevice(account.id, candidateDeviceHash)
        : null;
      if (!device) return { kind: "unknown_device" as const };

      const material = createSessionMaterial();
      await transaction.updateTrustedDeviceLastSeen(
        device.id,
        material.createdAt,
      );
      const session = await transaction.createSession({
        accountId: account.id,
        deviceId: device.id,
        material,
        passwordPolicyVersion: PASSWORD_POLICY_VERSION,
      });
      if (!session) throw new Error("Session insert returned no row.");

      return { kind: "authenticated" as const, material, session };
    });

    if (result.kind === "unknown_device") {
      return { kind: "unknown_device", account };
    }
    if (result.kind !== "authenticated") return result;

    return {
      kind: "authenticated",
      account,
      material: result.material,
      session: result.session,
      deviceToken: usableDeviceToken,
    };
  };
}
