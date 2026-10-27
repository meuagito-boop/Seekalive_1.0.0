import argon2 from "argon2";

import type { CurrentPasswordReader } from "./ports";

export function createVerifyCurrentPassword(
  readCurrentPassword: CurrentPasswordReader,
) {
  return async function verifyCurrentPassword(
    accountId: string,
    currentPassword: string,
  ) {
    const row = await readCurrentPassword(accountId);
    if (!row) return { kind: "invalid_credentials" as const };

    const valid = await argon2
      .verify(row.passwordHash, currentPassword)
      .catch(() => false);
    if (!valid) return { kind: "invalid_credentials" as const };
    if (
      row.status !== "active" ||
      !row.emailVerifiedAt ||
      row.securityLockedAt
    ) {
      return { kind: "account_unavailable" as const };
    }

    return {
      kind: "verified" as const,
      email: row.email,
      displayName: row.displayName,
      passwordHash: row.passwordHash,
    };
  };
}
