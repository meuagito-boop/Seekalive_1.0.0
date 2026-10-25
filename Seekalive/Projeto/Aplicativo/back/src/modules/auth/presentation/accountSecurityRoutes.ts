import { randomInt, randomUUID } from "node:crypto";
import argon2 from "argon2";
import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
} from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  accountEmailChangeRequestSchema,
  accountPasswordChangeRequestSchema,
  challengeConfirmSchema,
  PASSWORD_POLICY_VERSION,
} from "@workspace/api-zod";
import {
  accountEmails,
  accounts,
  authChallenges,
  db,
  passwordCredentials,
  sessions,
  trustedDevices,
} from "@workspace/db";
import { logger } from "../../../common/logger";
import { createAuthRateLimit } from "../../../security/request-origin";
import {
  clearDeviceCookie,
  clearSessionCookie,
  constantTimeEquals,
  hashAccountEmailChangeCode,
  hashAccountPasswordChangeCode,
  loadActiveSession,
  requireCsrf,
} from "../../../security/session";
import { getAuthEmailDelivery } from "../infrastructure/emailDelivery";

const router: IRouter = Router();
const ACCOUNT_CHANGE_TTL_MS = 10 * 60 * 1000;
const ACCOUNT_CHANGE_SEND_COOLDOWN_MS = 60 * 1000;
const ACCOUNT_CHANGE_SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR = 5;
const MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS = 5;
const invalidChallengeMessage =
  "Código inválido ou expirado. Inicie a alteração novamente.";
const ARGON2ID_OPTIONS = {
  type: argon2.argon2id as 2,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
};
type RecentChallenge = {
  createdAt: Date;
  resendAvailableAt: Date | null;
};

function sendError(
  response: Response,
  status: number,
  code: string,
  message: string,
  additional: Record<string, unknown> = {},
): void {
  response.status(status).json({
    error: {
      code,
      message,
      ...additional,
      requestId: response.locals.requestId ?? "unknown",
    },
  });
}

function sendValidationError(
  response: Response,
  issues: { path: PropertyKey[]; message: string }[],
): void {
  response.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message: "Confira os dados informados.",
      details: issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
      requestId: response.locals.requestId ?? "unknown",
    },
  });
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  const first = localPart?.slice(0, 1) ?? "";
  return `${first}${"*".repeat(Math.max(2, (localPart?.length ?? 1) - 1))}@${domain ?? ""}`;
}

function cooldownSeconds(recent: RecentChallenge[], now: Date): number | null {
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
          (oldestAllowed.createdAt.getTime() +
            ACCOUNT_CHANGE_SEND_WINDOW_MS -
            now.getTime()) /
            1000,
        ),
      );
    }
  }
  return null;
}

function sendThrottleError(
  response: Response,
  retryAfterSeconds: number,
): void {
  response.setHeader("Retry-After", String(retryAfterSeconds));
  sendError(
    response,
    429,
    "ACCOUNT_CHANGE_CODE_RATE_LIMITED",
    `Aguarde ${retryAfterSeconds} segundos antes de solicitar outro código.`,
    { retryAfterSeconds },
  );
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; cause?: { code?: unknown } };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}

async function authenticatedAccountId(
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

async function verifyCurrentPassword(
  accountId: string,
  currentPassword: string,
): Promise<
  | {
      kind: "verified";
      email: string;
      displayName: string;
      passwordHash: string;
    }
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
    .innerJoin(
      passwordCredentials,
      eq(passwordCredentials.accountId, accounts.id),
    )
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (!row) return { kind: "invalid_credentials" };
  const valid = await argon2
    .verify(row.passwordHash, currentPassword)
    .catch(() => false);
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

async function invalidateChallenge(
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
    .where(
      and(
        eq(authChallenges.id, challengeId),
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, purpose),
        isNull(authChallenges.consumedAt),
      ),
    );
}

router.post(
  "/email/change/request",
  createAuthRateLimit("account-email-change-request", 5, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const accountId = await authenticatedAccountId(request, response);
    if (!accountId) return;
    const parsed = accountEmailChangeRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const { currentPassword, newEmail } = parsed.data;
    const current = await verifyCurrentPassword(accountId, currentPassword);
    if (current.kind === "invalid_credentials") {
      sendError(
        response,
        401,
        "INVALID_CURRENT_PASSWORD",
        "A senha atual está incorreta.",
      );
      return;
    }
    if (current.kind === "account_unavailable") {
      sendError(
        response,
        423,
        "ACCOUNT_UNAVAILABLE",
        "Esta conta não pode alterar seus dados de segurança.",
      );
      return;
    }
    if (newEmail === current.email) {
      sendError(
        response,
        400,
        "EMAIL_UNCHANGED",
        "Informe um endereço diferente do e-mail atual.",
      );
      return;
    }

    const delivery = getAuthEmailDelivery();
    if (!delivery.isConfigured) {
      sendError(
        response,
        503,
        "EMAIL_DELIVERY_UNAVAILABLE",
        "O envio de códigos por e-mail não está disponível.",
      );
      return;
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const challengeId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ACCOUNT_CHANGE_TTL_MS);
    const result = await db.transaction(async (tx) => {
      const [owner] = await tx
        .select({
          id: accounts.id,
          status: accounts.status,
          securityLockedAt: accounts.securityLockedAt,
          email: accountEmails.emailNormalized,
          emailVerifiedAt: accountEmails.verifiedAt,
          displayName: accounts.displayName,
          passwordHash: passwordCredentials.passwordHash,
        })
        .from(accounts)
        .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
        .innerJoin(
          passwordCredentials,
          eq(passwordCredentials.accountId, accounts.id),
        )
        .where(eq(accounts.id, accountId))
        .for("update")
        .limit(1);
      if (
        !owner ||
        owner.status !== "active" ||
        !owner.emailVerifiedAt ||
        owner.securityLockedAt
      ) {
        return { kind: "account_unavailable" as const };
      }
      if (
        owner.email !== current.email ||
        owner.passwordHash !== current.passwordHash
      ) {
        return { kind: "credentials_changed" as const };
      }
      const [usedAddress] = await tx
        .select({ accountId: accountEmails.accountId })
        .from(accountEmails)
        .where(eq(accountEmails.emailNormalized, newEmail))
        .limit(1);
      if (usedAddress) return { kind: "email_unavailable" as const };

      const recent = await tx
        .select({
          createdAt: authChallenges.createdAt,
          resendAvailableAt: authChallenges.resendAvailableAt,
        })
        .from(authChallenges)
        .where(
          and(
            eq(authChallenges.accountId, accountId),
            inArray(authChallenges.purpose, [
              "account_email_change_current",
              "account_email_change_new",
            ]),
            gt(
              authChallenges.createdAt,
              new Date(now.getTime() - ACCOUNT_CHANGE_SEND_WINDOW_MS),
            ),
          ),
        )
        .orderBy(desc(authChallenges.createdAt))
        .limit(MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR);
      const waitSeconds = cooldownSeconds(recent, now);
      if (waitSeconds !== null)
        return { kind: "rate_limited" as const, waitSeconds };

      await tx
        .update(authChallenges)
        .set({ consumedAt: now, pendingEmail: null })
        .where(
          and(
            eq(authChallenges.accountId, accountId),
            inArray(authChallenges.purpose, [
              "account_email_change_current",
              "account_email_change_new",
            ]),
            isNull(authChallenges.consumedAt),
          ),
        );
      await tx.insert(authChallenges).values({
        id: challengeId,
        accountId,
        purpose: "account_email_change_current",
        tokenHash: hashAccountEmailChangeCode(
          accountId,
          challengeId,
          "account_email_change_current",
          code,
        ),
        pendingEmail: newEmail,
        attempts: 0,
        createdAt: now,
        expiresAt,
        resendAvailableAt: new Date(
          now.getTime() + ACCOUNT_CHANGE_SEND_COOLDOWN_MS,
        ),
      });
      return {
        kind: "created" as const,
        currentEmail: owner.email,
        displayName: owner.displayName,
      };
    });

    if (result.kind === "account_unavailable") {
      sendError(
        response,
        423,
        "ACCOUNT_UNAVAILABLE",
        "Esta conta não pode alterar seus dados de segurança.",
      );
      return;
    }
    if (result.kind === "credentials_changed") {
      sendError(
        response,
        409,
        "CREDENTIALS_CHANGED",
        "A senha ou o e-mail mudou. Atualize a tela e tente novamente.",
      );
      return;
    }
    if (result.kind === "email_unavailable") {
      sendError(
        response,
        409,
        "EMAIL_UNAVAILABLE",
        "Esse endereço não está disponível para esta conta.",
      );
      return;
    }
    if (result.kind === "rate_limited") {
      sendThrottleError(response, result.waitSeconds);
      return;
    }

    try {
      await delivery.sendAccountEmailChangeCurrentCode({
        email: result.currentEmail,
        displayName: result.displayName,
        code,
      });
    } catch {
      logger.warn(
        { code: "ACCOUNT_EMAIL_CHANGE_CURRENT_CODE_FAILED" },
        "Account email-change code could not be delivered",
      );
      await invalidateChallenge(
        challengeId,
        accountId,
        "account_email_change_current",
      );
      sendError(
        response,
        503,
        "EMAIL_DELIVERY_UNAVAILABLE",
        "Não foi possível enviar o código. Tente novamente mais tarde.",
      );
      return;
    }

    response.status(202).json({
      status: "current_email_verification_required",
      challengeId,
      currentEmailMasked: maskEmail(result.currentEmail),
      newEmailMasked: maskEmail(newEmail),
      expiresAt: expiresAt.toISOString(),
      message: `Enviamos um código para ${maskEmail(result.currentEmail)}.`,
    });
  },
);

router.post(
  "/email/change/confirm-current",
  createAuthRateLimit(
    "account-email-change-current-confirm",
    10,
    15 * 60 * 1000,
  ),
  requireCsrf,
  async (request, response) => {
    const accountId = await authenticatedAccountId(request, response);
    if (!accountId) return;
    const parsed = challengeConfirmSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const nextChallengeId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ACCOUNT_CHANGE_TTL_MS);
    const result = await db.transaction(async (tx) => {
      const [owner] = await tx
        .select({
          status: accounts.status,
          securityLockedAt: accounts.securityLockedAt,
          emailVerifiedAt: accountEmails.verifiedAt,
          displayName: accounts.displayName,
        })
        .from(accounts)
        .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
        .where(eq(accounts.id, accountId))
        .for("update")
        .limit(1);
      if (
        !owner ||
        owner.status !== "active" ||
        !owner.emailVerifiedAt ||
        owner.securityLockedAt
      ) {
        return { kind: "account_unavailable" as const };
      }
      const [challenge] = await tx
        .select({
          id: authChallenges.id,
          tokenHash: authChallenges.tokenHash,
          pendingEmail: authChallenges.pendingEmail,
          attempts: authChallenges.attempts,
        })
        .from(authChallenges)
        .where(
          and(
            eq(authChallenges.id, parsed.data.challengeId),
            eq(authChallenges.accountId, accountId),
            eq(authChallenges.purpose, "account_email_change_current"),
            isNull(authChallenges.consumedAt),
            gt(authChallenges.expiresAt, now),
            lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
          ),
        )
        .for("update")
        .limit(1);
      if (!challenge?.pendingEmail) return { kind: "invalid" as const };

      const expectedHash = hashAccountEmailChangeCode(
        accountId,
        challenge.id,
        "account_email_change_current",
        parsed.data.code,
      );
      if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
        await tx
          .update(authChallenges)
          .set({
            attempts: sql`${authChallenges.attempts} + 1`,
            pendingEmail:
              challenge.attempts + 1 >= MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS
                ? null
                : challenge.pendingEmail,
          })
          .where(
            and(
              eq(authChallenges.id, challenge.id),
              isNull(authChallenges.consumedAt),
              gt(authChallenges.expiresAt, now),
              lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
            ),
          );
        return { kind: "invalid" as const };
      }

      const [usedAddress] = await tx
        .select({ accountId: accountEmails.accountId })
        .from(accountEmails)
        .where(eq(accountEmails.emailNormalized, challenge.pendingEmail))
        .limit(1);
      await tx
        .update(authChallenges)
        .set({ consumedAt: now, pendingEmail: null })
        .where(
          and(
            eq(authChallenges.id, challenge.id),
            isNull(authChallenges.consumedAt),
          ),
        );
      if (usedAddress) return { kind: "email_unavailable" as const };

      await tx.insert(authChallenges).values({
        id: nextChallengeId,
        accountId,
        purpose: "account_email_change_new",
        tokenHash: hashAccountEmailChangeCode(
          accountId,
          nextChallengeId,
          "account_email_change_new",
          code,
        ),
        pendingEmail: challenge.pendingEmail,
        attempts: 0,
        createdAt: now,
        expiresAt,
        resendAvailableAt: new Date(
          now.getTime() + ACCOUNT_CHANGE_SEND_COOLDOWN_MS,
        ),
      });
      return {
        kind: "created" as const,
        pendingEmail: challenge.pendingEmail,
        displayName: owner.displayName,
      };
    });

    if (result.kind === "account_unavailable") {
      sendError(
        response,
        423,
        "ACCOUNT_UNAVAILABLE",
        "Esta conta não pode alterar seus dados de segurança.",
      );
      return;
    }
    if (result.kind === "email_unavailable") {
      sendError(
        response,
        409,
        "EMAIL_UNAVAILABLE",
        "Esse endereço deixou de estar disponível. Inicie a troca novamente.",
      );
      return;
    }
    if (result.kind !== "created") {
      sendError(response, 400, "INVALID_EMAIL_CHANGE", invalidChallengeMessage);
      return;
    }

    const delivery = getAuthEmailDelivery();
    try {
      await delivery.sendAccountEmailChangeNewCode({
        email: result.pendingEmail,
        displayName: result.displayName,
        code,
      });
    } catch {
      logger.warn(
        { code: "ACCOUNT_EMAIL_CHANGE_NEW_CODE_FAILED" },
        "New-address confirmation code could not be delivered",
      );
      await invalidateChallenge(
        nextChallengeId,
        accountId,
        "account_email_change_new",
      );
      sendError(
        response,
        503,
        "EMAIL_DELIVERY_UNAVAILABLE",
        "Não foi possível enviar o código ao novo endereço. Inicie a troca novamente.",
      );
      return;
    }

    response.status(202).json({
      status: "new_email_verification_required",
      challengeId: nextChallengeId,
      newEmailMasked: maskEmail(result.pendingEmail),
      expiresAt: expiresAt.toISOString(),
      message: `Enviamos um código para ${maskEmail(result.pendingEmail)}.`,
    });
  },
);

router.post(
  "/email/change/confirm-new",
  createAuthRateLimit("account-email-change-new-confirm", 10, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const accountId = await authenticatedAccountId(request, response);
    if (!accountId) return;
    const parsed = challengeConfirmSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const now = new Date();
    let result:
      | { kind: "account_unavailable" }
      | { kind: "invalid" }
      | { kind: "email_unavailable" }
      | { kind: "email_unchanged" }
      | {
          kind: "updated";
          oldEmail: string;
          email: string;
          displayName: string;
        };
    try {
      result = await db.transaction(async (tx) => {
        const [owner] = await tx
          .select({
            status: accounts.status,
            securityLockedAt: accounts.securityLockedAt,
            displayName: accounts.displayName,
            currentEmail: accountEmails.emailNormalized,
            emailVerifiedAt: accountEmails.verifiedAt,
          })
          .from(accounts)
          .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
          .where(eq(accounts.id, accountId))
          .for("update")
          .limit(1);
        if (
          !owner ||
          owner.status !== "active" ||
          !owner.emailVerifiedAt ||
          owner.securityLockedAt
        ) {
          return { kind: "account_unavailable" as const };
        }
        const [challenge] = await tx
          .select({
            id: authChallenges.id,
            tokenHash: authChallenges.tokenHash,
            pendingEmail: authChallenges.pendingEmail,
            attempts: authChallenges.attempts,
          })
          .from(authChallenges)
          .where(
            and(
              eq(authChallenges.id, parsed.data.challengeId),
              eq(authChallenges.accountId, accountId),
              eq(authChallenges.purpose, "account_email_change_new"),
              isNull(authChallenges.consumedAt),
              gt(authChallenges.expiresAt, now),
              lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
            ),
          )
          .for("update")
          .limit(1);
        if (!challenge?.pendingEmail) return { kind: "invalid" as const };

        const expectedHash = hashAccountEmailChangeCode(
          accountId,
          challenge.id,
          "account_email_change_new",
          parsed.data.code,
        );
        if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
          await tx
            .update(authChallenges)
            .set({
              attempts: sql`${authChallenges.attempts} + 1`,
              pendingEmail:
                challenge.attempts + 1 >= MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS
                  ? null
                  : challenge.pendingEmail,
            })
            .where(
              and(
                eq(authChallenges.id, challenge.id),
                isNull(authChallenges.consumedAt),
                gt(authChallenges.expiresAt, now),
                lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
              ),
            );
          return { kind: "invalid" as const };
        }

        if (challenge.pendingEmail === owner.currentEmail) {
          await tx
            .update(authChallenges)
            .set({ consumedAt: now, pendingEmail: null })
            .where(
              and(
                eq(authChallenges.id, challenge.id),
                isNull(authChallenges.consumedAt),
              ),
            );
          return { kind: "email_unchanged" as const };
        }
        const [usedAddress] = await tx
          .select({ accountId: accountEmails.accountId })
          .from(accountEmails)
          .where(eq(accountEmails.emailNormalized, challenge.pendingEmail))
          .limit(1);
        if (usedAddress) {
          await tx
            .update(authChallenges)
            .set({ consumedAt: now, pendingEmail: null })
            .where(
              and(
                eq(authChallenges.id, challenge.id),
                isNull(authChallenges.consumedAt),
              ),
            );
          return { kind: "email_unavailable" as const };
        }

        const [consumed] = await tx
          .update(authChallenges)
          .set({ consumedAt: now, pendingEmail: null })
          .where(
            and(
              eq(authChallenges.id, challenge.id),
              isNull(authChallenges.consumedAt),
              gt(authChallenges.expiresAt, now),
              lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
            ),
          )
          .returning({ id: authChallenges.id });
        if (!consumed) return { kind: "invalid" as const };

        const [updatedEmail] = await tx
          .update(accountEmails)
          .set({
            emailNormalized: challenge.pendingEmail,
            verifiedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(accountEmails.accountId, accountId),
              isNotNull(accountEmails.verifiedAt),
            ),
          )
          .returning({ email: accountEmails.emailNormalized });
        if (!updatedEmail) return { kind: "account_unavailable" as const };

        await tx
          .update(accounts)
          .set({ updatedAt: now, version: sql`${accounts.version} + 1` })
          .where(
            and(eq(accounts.id, accountId), eq(accounts.status, "active")),
          );
        await tx
          .update(authChallenges)
          .set({
            consumedAt: now,
            pendingEmail: null,
            pendingPasswordHash: null,
            basePasswordHash: null,
          })
          .where(
            and(
              eq(authChallenges.accountId, accountId),
              inArray(authChallenges.purpose, [
                "account_email_change_current",
                "account_email_change_new",
                "account_password_change",
                "password_update",
                "reset_password",
                "device_login",
              ]),
              isNull(authChallenges.consumedAt),
            ),
          );
        return {
          kind: "updated" as const,
          oldEmail: owner.currentEmail,
          email: updatedEmail.email,
          displayName: owner.displayName,
        };
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        sendError(
          response,
          409,
          "EMAIL_UNAVAILABLE",
          "Esse endereço deixou de estar disponível. Inicie a troca novamente.",
        );
        return;
      }
      throw error;
    }

    if (result.kind === "account_unavailable") {
      sendError(
        response,
        423,
        "ACCOUNT_UNAVAILABLE",
        "Esta conta não pode alterar seus dados de segurança.",
      );
      return;
    }
    if (result.kind === "email_unavailable") {
      sendError(
        response,
        409,
        "EMAIL_UNAVAILABLE",
        "Esse endereço deixou de estar disponível. Inicie a troca novamente.",
      );
      return;
    }
    if (result.kind === "email_unchanged") {
      sendError(
        response,
        409,
        "EMAIL_UNCHANGED",
        "O e-mail atual não foi alterado.",
      );
      return;
    }
    if (result.kind !== "updated") {
      sendError(response, 400, "INVALID_EMAIL_CHANGE", invalidChallengeMessage);
      return;
    }

    let securityNoticeSent = true;
    try {
      await getAuthEmailDelivery().sendAccountEmailChangeSecurityNotice({
        email: result.oldEmail,
        displayName: result.displayName,
        newEmailMasked: maskEmail(result.email),
      });
    } catch {
      securityNoticeSent = false;
      logger.warn(
        { code: "ACCOUNT_EMAIL_CHANGE_SECURITY_NOTICE_FAILED" },
        "Old-address security notice could not be delivered",
      );
    }
    response.json({
      status: "email_changed",
      email: result.email,
      securityNoticeSent,
    });
  },
);

router.post(
  "/password/change/request",
  createAuthRateLimit("account-password-change-request", 5, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const accountId = await authenticatedAccountId(request, response);
    if (!accountId) return;
    const parsed = accountPasswordChangeRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }
    const current = await verifyCurrentPassword(
      accountId,
      parsed.data.currentPassword,
    );
    if (current.kind === "invalid_credentials") {
      sendError(
        response,
        401,
        "INVALID_CURRENT_PASSWORD",
        "A senha atual está incorreta.",
      );
      return;
    }
    if (current.kind === "account_unavailable") {
      sendError(
        response,
        423,
        "ACCOUNT_UNAVAILABLE",
        "Esta conta não pode alterar seus dados de segurança.",
      );
      return;
    }
    if (
      await argon2
        .verify(current.passwordHash, parsed.data.newPassword)
        .catch(() => false)
    ) {
      sendError(
        response,
        400,
        "PASSWORD_REUSE",
        "Escolha uma senha diferente da senha atual.",
      );
      return;
    }

    const delivery = getAuthEmailDelivery();
    if (!delivery.isConfigured) {
      sendError(
        response,
        503,
        "EMAIL_DELIVERY_UNAVAILABLE",
        "O envio de códigos por e-mail não está disponível.",
      );
      return;
    }

    const pendingPasswordHash = await argon2.hash(
      parsed.data.newPassword,
      ARGON2ID_OPTIONS,
    );
    const challengeId = randomUUID();
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ACCOUNT_CHANGE_TTL_MS);
    const result = await db.transaction(async (tx) => {
      const [owner] = await tx
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
        .innerJoin(
          passwordCredentials,
          eq(passwordCredentials.accountId, accounts.id),
        )
        .where(eq(accounts.id, accountId))
        .for("update")
        .limit(1);
      if (
        !owner ||
        owner.status !== "active" ||
        !owner.emailVerifiedAt ||
        owner.securityLockedAt
      ) {
        return { kind: "account_unavailable" as const };
      }
      if (owner.passwordHash !== current.passwordHash)
        return { kind: "credentials_changed" as const };

      const recent = await tx
        .select({
          createdAt: authChallenges.createdAt,
          resendAvailableAt: authChallenges.resendAvailableAt,
        })
        .from(authChallenges)
        .where(
          and(
            eq(authChallenges.accountId, accountId),
            eq(authChallenges.purpose, "account_password_change"),
            gt(
              authChallenges.createdAt,
              new Date(now.getTime() - ACCOUNT_CHANGE_SEND_WINDOW_MS),
            ),
          ),
        )
        .orderBy(desc(authChallenges.createdAt))
        .limit(MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR);
      const waitSeconds = cooldownSeconds(recent, now);
      if (waitSeconds !== null)
        return { kind: "rate_limited" as const, waitSeconds };

      await tx
        .update(authChallenges)
        .set({
          consumedAt: now,
          pendingPasswordHash: null,
          basePasswordHash: null,
        })
        .where(
          and(
            eq(authChallenges.accountId, accountId),
            eq(authChallenges.purpose, "account_password_change"),
            isNull(authChallenges.consumedAt),
          ),
        );
      await tx.insert(authChallenges).values({
        id: challengeId,
        accountId,
        purpose: "account_password_change",
        tokenHash: hashAccountPasswordChangeCode(accountId, challengeId, code),
        pendingPasswordHash,
        basePasswordHash: current.passwordHash,
        attempts: 0,
        createdAt: now,
        expiresAt,
        resendAvailableAt: new Date(
          now.getTime() + ACCOUNT_CHANGE_SEND_COOLDOWN_MS,
        ),
      });
      return {
        kind: "created" as const,
        email: owner.email,
        displayName: owner.displayName,
      };
    });

    if (result.kind === "account_unavailable") {
      sendError(
        response,
        423,
        "ACCOUNT_UNAVAILABLE",
        "Esta conta não pode alterar seus dados de segurança.",
      );
      return;
    }
    if (result.kind === "credentials_changed") {
      sendError(
        response,
        409,
        "CREDENTIALS_CHANGED",
        "A senha mudou. Atualize a tela e tente novamente.",
      );
      return;
    }
    if (result.kind === "rate_limited") {
      sendThrottleError(response, result.waitSeconds);
      return;
    }

    try {
      await delivery.sendAccountPasswordChangeCode({
        email: result.email,
        displayName: result.displayName,
        code,
      });
    } catch {
      logger.warn(
        { code: "ACCOUNT_PASSWORD_CHANGE_CODE_FAILED" },
        "Account password-change code could not be delivered",
      );
      await invalidateChallenge(
        challengeId,
        accountId,
        "account_password_change",
      );
      sendError(
        response,
        503,
        "EMAIL_DELIVERY_UNAVAILABLE",
        "Não foi possível enviar o código. Tente novamente mais tarde.",
      );
      return;
    }
    response.status(202).json({
      status: "password_change_verification_required",
      challengeId,
      emailMasked: maskEmail(result.email),
      expiresAt: expiresAt.toISOString(),
      message: `Enviamos um código para ${maskEmail(result.email)}.`,
    });
  },
);

router.post(
  "/password/change/confirm",
  createAuthRateLimit("account-password-change-confirm", 10, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const accountId = await authenticatedAccountId(request, response);
    if (!accountId) return;
    const parsed = challengeConfirmSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const now = new Date();
    const result = await db.transaction(async (tx) => {
      const [owner] = await tx
        .select({
          status: accounts.status,
          securityLockedAt: accounts.securityLockedAt,
          emailVerifiedAt: accountEmails.verifiedAt,
        })
        .from(accounts)
        .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
        .where(eq(accounts.id, accountId))
        .for("update")
        .limit(1);
      if (
        !owner ||
        owner.status !== "active" ||
        !owner.emailVerifiedAt ||
        owner.securityLockedAt
      ) {
        return { kind: "account_unavailable" as const };
      }
      const [challenge] = await tx
        .select({
          id: authChallenges.id,
          tokenHash: authChallenges.tokenHash,
          pendingPasswordHash: authChallenges.pendingPasswordHash,
          basePasswordHash: authChallenges.basePasswordHash,
          attempts: authChallenges.attempts,
        })
        .from(authChallenges)
        .where(
          and(
            eq(authChallenges.id, parsed.data.challengeId),
            eq(authChallenges.accountId, accountId),
            eq(authChallenges.purpose, "account_password_change"),
            isNull(authChallenges.consumedAt),
            gt(authChallenges.expiresAt, now),
            lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
          ),
        )
        .for("update")
        .limit(1);
      if (!challenge?.pendingPasswordHash || !challenge.basePasswordHash)
        return { kind: "invalid" as const };

      const expectedHash = hashAccountPasswordChangeCode(
        accountId,
        challenge.id,
        parsed.data.code,
      );
      if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
        await tx
          .update(authChallenges)
          .set({
            attempts: sql`${authChallenges.attempts} + 1`,
            pendingPasswordHash:
              challenge.attempts + 1 >= MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS
                ? null
                : challenge.pendingPasswordHash,
            basePasswordHash:
              challenge.attempts + 1 >= MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS
                ? null
                : challenge.basePasswordHash,
          })
          .where(
            and(
              eq(authChallenges.id, challenge.id),
              isNull(authChallenges.consumedAt),
              gt(authChallenges.expiresAt, now),
              lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
            ),
          );
        return { kind: "invalid" as const };
      }

      const [consumed] = await tx
        .update(authChallenges)
        .set({ consumedAt: now })
        .where(
          and(
            eq(authChallenges.id, challenge.id),
            isNull(authChallenges.consumedAt),
            gt(authChallenges.expiresAt, now),
            lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
          ),
        )
        .returning({ id: authChallenges.id });
      if (!consumed) return { kind: "invalid" as const };

      const [updatedCredential] = await tx
        .update(passwordCredentials)
        .set({
          passwordHash: challenge.pendingPasswordHash,
          passwordPolicyVersion: PASSWORD_POLICY_VERSION,
          passwordChangedAt: now,
        })
        .where(
          and(
            eq(passwordCredentials.accountId, accountId),
            eq(passwordCredentials.passwordHash, challenge.basePasswordHash),
          ),
        )
        .returning({ accountId: passwordCredentials.accountId });
      if (!updatedCredential) return { kind: "credentials_changed" as const };

      await tx
        .update(sessions)
        .set({ revokedAt: now })
        .where(
          and(eq(sessions.accountId, accountId), isNull(sessions.revokedAt)),
        );
      await tx
        .update(trustedDevices)
        .set({ revokedAt: now })
        .where(
          and(
            eq(trustedDevices.accountId, accountId),
            isNull(trustedDevices.revokedAt),
          ),
        );
      await tx
        .update(authChallenges)
        .set({
          consumedAt: now,
          pendingEmail: null,
          pendingPasswordHash: null,
          basePasswordHash: null,
        })
        .where(
          and(
            eq(authChallenges.accountId, accountId),
            inArray(authChallenges.purpose, [
              "account_email_change_current",
              "account_email_change_new",
              "account_password_change",
              "password_update",
              "reset_password",
              "device_login",
            ]),
            isNull(authChallenges.consumedAt),
          ),
        );
      return { kind: "updated" as const };
    });

    if (result.kind === "account_unavailable") {
      sendError(
        response,
        423,
        "ACCOUNT_UNAVAILABLE",
        "Esta conta não pode alterar seus dados de segurança.",
      );
      return;
    }
    if (result.kind === "credentials_changed") {
      sendError(
        response,
        409,
        "CREDENTIALS_CHANGED",
        "As credenciais mudaram. Inicie novamente a alteração.",
      );
      return;
    }
    if (result.kind !== "updated") {
      sendError(
        response,
        400,
        "INVALID_PASSWORD_CHANGE",
        invalidChallengeMessage,
      );
      return;
    }

    clearSessionCookie(response);
    clearDeviceCookie(response);
    response.json({ status: "password_changed" });
  },
);

export default router;
