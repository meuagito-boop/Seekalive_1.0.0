import argon2 from "argon2";
import { and, eq, isNull } from "drizzle-orm";
import type { Request, Response } from "express";
import {
  accountEmails,
  accounts,
  authChallenges,
  db,
  passwordCredentials,
} from "@workspace/db";
import { loadActiveSession } from "../../../security/session";
import { sendError } from "./responses";

export const ACCOUNT_CHANGE_TTL_MS = 10 * 60 * 1000;
export const ACCOUNT_CHANGE_SEND_COOLDOWN_MS = 60 * 1000;
export const ACCOUNT_CHANGE_SEND_WINDOW_MS = 60 * 60 * 1000;
export const MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR = 5;
export const MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS = 5;
export const invalidChallengeMessage =
  "Código inválido ou expirado. Inicie a alteração novamente.";

export type RecentChallenge = {
  createdAt: Date;
  resendAvailableAt: Date | null;
};

export function cooldownSeconds(recent: RecentChallenge[], now: Date): number | null {
  const latest = recent[0];
  if (latest?.resendAvailableAt && latest.resendAvailableAt > now) {
    return Math.max(
      1,
      Math.ceil((latest.resendAvailableAt.getTime() - now.getTime()) / 1000),
    );
  }
  if (recent.length >= MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR) {
    const oldestAllowed = recent[MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR - 1];
    if (oldestAllowed) {
      return Math.max(
        1,
        Math.ceil(
          (oldestAllowed.createdAt.getTime()
            + ACCOUNT_CHANGE_SEND_WINDOW_MS
            - now.getTime()) / 1000,
        ),
      );
    }
  }
  return null;
}

export function sendThrottleError(response: Response, retryAfterSeconds: number): void {
  response.setHeader("Retry-After", String(retryAfterSeconds));
  sendError(
    response,
    429,
    "ACCOUNT_CHANGE_CODE_RATE_LIMITED",
    `Aguarde ${retryAfterSeconds} segundos antes de solicitar outro código.`,
    { retryAfterSeconds },
  );
}

export function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; cause?: { code?: unknown } };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}

export async function authenticatedAccountId(
  request: Request,
  response: Response,
): Promise<string | null> {
  const session = await loadActiveSession(request);
  if (!session) {
    sendError(
      response,
      401,
      "AUTHENTICATION_REQUIRED",
      "Entre novamente para alterar os dados de segurança.",
    );
    return null;
  }
  return session.accountId;
}

export async function verifyCurrentPassword(
  accountId: string,
  currentPassword: string,
): Promise<
  | { kind: "verified"; email: string; displayName: string; passwordHash: string }
  | { kind: "invalid_credentials" }
  | { kind: "account_unavailable" }
> {
  const [row] = await db
    .select({
      status: accounts.status,
      securityLockedAt: accounts.securityLockedAt,
      email: accountEmails.emailNormalized,
      emailVerifiedAt: accountEmails.verifiedAt,
      displayName: accounts.displayName,
      passwordHash: passwordCredentials.passwordHash,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (!row) return { kind: "invalid_credentials" };
  const valid = await argon2.verify(row.passwordHash, currentPassword).catch(() => false);
  if (!valid) return { kind: "invalid_credentials" };
  if (row.status !== "active" || !row.emailVerifiedAt || row.securityLockedAt) {
    return { kind: "account_unavailable" };
  }
  return {
    kind: "verified",
    email: row.email,
    displayName: row.displayName,
    passwordHash: row.passwordHash,
  };
}

export async function invalidateChallenge(
  challengeId: string,
  accountId: string,
  purpose: string,
): Promise<void> {
  await db
    .update(authChallenges)
    .set({
      consumedAt: new Date(),
      pendingEmail: null,
      pendingPasswordHash: null,
      basePasswordHash: null,
    })
    .where(and(
      eq(authChallenges.id, challengeId),
      eq(authChallenges.accountId, accountId),
      eq(authChallenges.purpose, purpose),
      isNull(authChallenges.consumedAt),
    ));
}
