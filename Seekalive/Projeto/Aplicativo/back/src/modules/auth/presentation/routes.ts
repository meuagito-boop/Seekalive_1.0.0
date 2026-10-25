import { randomBytes, randomInt, randomUUID } from "node:crypto";
import argon2 from "argon2";
import { and, desc, eq, gt, inArray, isNotNull, isNull, lt, lte, ne, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  accountEmails,
  accountUsernameReservations,
  accounts,
  authChallenges,
  commercialProfiles,
  db,
  passwordCredentials,
  sessions,
  trustedDevices,
} from "@workspace/db";
import { lockUsernameClaims } from "../../accounts/application/usernamePolicy";
import {
  challengeConfirmSchema,
  challengeResendSchema,
  loginRequestSchema,
  PASSWORD_POLICY_VERSION,
  passwordPolicySchema,
  passwordPolicyUpdateSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  registerRequestSchema,
  sessionIdParamSchema,
  SUPPORT_EMAIL,
  trustedDeviceIdParamSchema,
  verificationConfirmSchema,
  verificationRequestSchema,
} from "@workspace/api-zod";
import { logger } from "../../../common/logger";
import {
  createAuthRateLimit,
} from "../../../security/request-origin";
import {
  clearDeviceCookie,
  clearSessionCookie,
  constantTimeEquals,
  csrfHash,
  DEVICE_COOKIE,
  hashDeviceLoginCode,
  hashPasswordResetCode,
  hashPasswordUpdateCode,
  hashToken,
  hashVerificationCode,
  issuePreAuthCsrf,
  loadActiveSession,
  PRE_AUTH_COOKIE,
  requireCsrf,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  setDeviceCookie,
  setSessionCookie,
} from "../../../security/session";
import {
  authEmailDelivery,
  EmailDeliveryUnavailableError,
  type AuthEmailDelivery,
} from "../infrastructure/emailDelivery";

const router: IRouter = Router();
const CURRENT_TERMS_VERSION = "v1";
const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;
const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;
const MAX_PASSWORD_RESET_ATTEMPTS = 5;
const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;
const DEVICE_LOGIN_TTL_MS = 10 * 60 * 1000;
const MAX_DEVICE_LOGIN_ATTEMPTS = 3;
const PASSWORD_UPDATE_TTL_MS = 10 * 60 * 1000;
const MAX_PASSWORD_UPDATE_ATTEMPTS = 5;
const DEVICE_RESEND_COOLDOWN_MS = 30 * 1000;
const DEVICE_FINAL_RESEND_COOLDOWN_MS = 90 * 1000;
const genericRegistrationMessage = "Se os dados forem válidos, enviaremos um código de verificação para o e-mail informado.";
const genericVerificationMessage = "Se houver uma conta pendente para esse e-mail, enviaremos um novo código.";
const genericPasswordResetMessage = "Se houver uma conta ativa e verificada para esse e-mail, enviaremos um código para redefinir a senha.";
const invalidPasswordResetMessage = "Código inválido ou expirado. Solicite um novo código.";
const ARGON2ID_OPTIONS = {
  // argon2.argon2id is runtime value 2; the package type widens it to number.
  type: argon2.argon2id as 2,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
};
let testEmailDelivery: AuthEmailDelivery | undefined;

export function setAuthEmailDeliveryForTests(delivery: AuthEmailDelivery): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Test email delivery can only be configured in NODE_ENV=test.");
  }
  testEmailDelivery = delivery;
}

function getAuthEmailDelivery(): AuthEmailDelivery {
  return testEmailDelivery ?? authEmailDelivery;
}

const fallbackPasswordHashPromise = argon2.hash("seekalive-invalid-user-placeholder", {
  ...ARGON2ID_OPTIONS,
});

router.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});

function sendError(
  response: Response,
  status: number,
  code: string,
  message: string,
  additional: Record<string, unknown> = {},
): void {
  response.status(status).json({
    error: { code, message, ...additional, requestId: response.locals.requestId ?? "unknown" },
  });
}

function sendValidationError(response: Response, issues: { path: PropertyKey[]; message: string }[]): void {
  response.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message: "Confira os dados informados.",
      details: issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      requestId: response.locals.requestId ?? "unknown",
    },
  });
}

function createSessionMaterial() {
  const rawToken = randomBytes(32).toString("base64url");
  const csrfToken = randomBytes(32).toString("base64url");
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_SECONDS * 1000);
  return { rawToken, tokenHash: hashToken(rawToken), csrfToken, csrfTokenHash: csrfHash(csrfToken), createdAt, expiresAt };
}

function authResult(account: {
  id: string;
  username: string;
  displayName: string;
  accountType: string;
  createdAt: Date;
  onboardingCompletedAt: Date | null;
}, session: { id: string; createdAt: Date; expiresAt: Date }, csrfToken: string) {
  return {
    account: {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      accountType: account.accountType,
      joinedAt: account.createdAt.toISOString(),
      onboardingCompleted: account.onboardingCompletedAt !== null,
    },
    session: {
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    },
    csrfToken,
    emailVerified: true as const,
  };
}

function challengeHash(accountId: string, code: string): string {
  return hashVerificationCode(accountId, code);
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "e-mail cadastrado";
  const visible = localPart.length > 2 ? `${localPart.slice(0, 2)}***` : `${localPart[0] ?? "*"}***`;
  return `${visible}@${domain}`;
}

function supportLockMessage(): string {
  return "Acesso bloqueado após três códigos incorretos. Solicite o desbloqueio ao suporte.";
}

async function createVerificationChallenge(accountId: string): Promise<string> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(authChallenges)
      .set({ consumedAt: now })
      .where(and(eq(authChallenges.accountId, accountId), eq(authChallenges.purpose, "verify_email"), isNull(authChallenges.consumedAt)));
    await tx.insert(authChallenges).values({
      accountId,
      purpose: "verify_email",
      tokenHash: challengeHash(accountId, code),
      expiresAt: new Date(now.getTime() + VERIFICATION_TTL_MS),
    });
  });
  return code;
}

async function createPasswordResetChallenge(accountId: string) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const tokenHash = hashPasswordResetCode(accountId, code);
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const cooldownSince = new Date(now.getTime() - PASSWORD_RESET_COOLDOWN_MS);

  const created = await db.transaction(async (tx) => {
    const [lockedAccount] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(and(
        eq(accounts.id, accountId),
        eq(accounts.status, "active"),
        isNotNull(accountEmails.verifiedAt),
      ))
      .for("update");
    if (!lockedAccount) return false;

    const [requestCount] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(authChallenges)
      .where(and(
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, "reset_password"),
        gt(authChallenges.createdAt, oneHourAgo),
      ));
    if ((requestCount?.count ?? 0) >= 5) return false;

    const [recentRequest] = await tx
      .select({ id: authChallenges.id })
      .from(authChallenges)
      .where(and(
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, "reset_password"),
        gt(authChallenges.createdAt, cooldownSince),
      ))
      .limit(1);
    if (recentRequest) return false;

    await tx
      .delete(authChallenges)
      .where(and(
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, "reset_password"),
        lt(authChallenges.expiresAt, oneHourAgo),
      ));
    await tx
      .update(authChallenges)
      .set({ consumedAt: now })
      .where(and(
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, "reset_password"),
        isNull(authChallenges.consumedAt),
      ));
    await tx.insert(authChallenges).values({
      accountId,
      purpose: "reset_password",
      tokenHash,
      expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
    });
    return true;
  });

  return created ? { code, tokenHash } : null;
}

async function createDeviceLoginChallenge(accountId: string, deviceTokenHash: string) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const challengeId = randomUUID();
  const now = new Date();
  const [account] = await db.transaction(async (tx) => {
    const [lockedAccount] = await tx
      .select({
        id: accounts.id,
        displayName: accounts.displayName,
        email: accountEmails.emailNormalized,
        status: accounts.status,
        verifiedAt: accountEmails.verifiedAt,
        securityLockedAt: accounts.securityLockedAt,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(eq(accounts.id, accountId))
      .for("update")
      .limit(1);
    if (
      !lockedAccount
      || lockedAccount.status !== "active"
      || !lockedAccount.verifiedAt
      || lockedAccount.securityLockedAt
    ) return [];

    await tx
      .update(authChallenges)
      .set({ consumedAt: now })
      .where(and(
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, "device_login"),
        eq(authChallenges.deviceTokenHash, deviceTokenHash),
        isNull(authChallenges.consumedAt),
      ));
    await tx.insert(authChallenges).values({
      id: challengeId,
      accountId,
      purpose: "device_login",
      tokenHash: hashDeviceLoginCode(accountId, challengeId, code),
      deviceTokenHash,
      attempts: 0,
      createdAt: now,
      expiresAt: new Date(now.getTime() + DEVICE_LOGIN_TTL_MS),
      resendAvailableAt: new Date(now.getTime() + DEVICE_RESEND_COOLDOWN_MS),
    });
    return [lockedAccount];
  });

  if (!account) return null;
  return {
    challengeId,
    code,
    email: account.email,
    emailMasked: maskEmail(account.email),
    displayName: account.displayName,
    createdAt: now,
    expiresAt: new Date(now.getTime() + DEVICE_LOGIN_TTL_MS),
    resendAvailableAt: new Date(now.getTime() + DEVICE_RESEND_COOLDOWN_MS),
  };
}

async function createPasswordUpdateChallenge(
  accountId: string,
  pendingPasswordHash: string,
  basePasswordHash: string,
) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const challengeId = randomUUID();
  const now = new Date();
  const [account] = await db.transaction(async (tx) => {
    const [lockedAccount] = await tx
      .select({
        id: accounts.id,
        displayName: accounts.displayName,
        email: accountEmails.emailNormalized,
        status: accounts.status,
        verifiedAt: accountEmails.verifiedAt,
        securityLockedAt: accounts.securityLockedAt,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(eq(accounts.id, accountId))
      .for("update")
      .limit(1);
    if (
      !lockedAccount
      || lockedAccount.status !== "active"
      || !lockedAccount.verifiedAt
      || lockedAccount.securityLockedAt
    ) return [];

    await tx
      .update(authChallenges)
      .set({ consumedAt: now })
      .where(and(
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, "password_update"),
        isNull(authChallenges.consumedAt),
      ));
    await tx.insert(authChallenges).values({
      id: challengeId,
      accountId,
      purpose: "password_update",
      tokenHash: hashPasswordUpdateCode(accountId, challengeId, code),
      pendingPasswordHash,
      basePasswordHash,
      attempts: 0,
      createdAt: now,
      expiresAt: new Date(now.getTime() + PASSWORD_UPDATE_TTL_MS),
    });
    return [lockedAccount];
  });

  if (!account) return null;
  return {
    challengeId,
    code,
    email: account.email,
    emailMasked: maskEmail(account.email),
    displayName: account.displayName,
    expiresAt: new Date(now.getTime() + PASSWORD_UPDATE_TTL_MS),
  };
}

async function deliverVerificationCode(
  delivery: AuthEmailDelivery,
  account: { id: string; displayName: string },
  email: string,
): Promise<void> {
  if (!delivery.isConfigured) throw new EmailDeliveryUnavailableError();
  const code = await createVerificationChallenge(account.id);
  await delivery.sendVerificationCode({ email, displayName: account.displayName, code });
}

router.get("/csrf", async (request, response) => {
  const session = await loadActiveSession(request);
  if (session) {
    const csrfToken = randomBytes(32).toString("base64url");
    await db.update(sessions).set({ csrfTokenHash: csrfHash(csrfToken) }).where(eq(sessions.id, session.sessionId));
    response.json({ csrfToken });
    return;
  }

  response.cookie(PRE_AUTH_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  const csrfToken = issuePreAuthCsrf(response);
  response.json({ csrfToken });
});

router.post("/register", createAuthRateLimit("register", 5, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const parsed = registerRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }
  const registration = parsed.data;
  const delivery = getAuthEmailDelivery();
  if (registration.acceptedTermsVersion !== CURRENT_TERMS_VERSION) {
    sendError(response, 400, "TERMS_VERSION_INVALID", "Atualize a página para aceitar a versão atual dos termos.");
    return;
  }
  if (!delivery.isConfigured) {
    sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "O envio de verificação por e-mail ainda não está configurado. Nenhuma conta foi criada.");
    return;
  }

  const username = registration.username.toLowerCase();
  const email = registration.email.toLowerCase();
  const [usernameMatch] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.username, username)).limit(1);
  const [usernameReservation] = await db
    .select({ username: accountUsernameReservations.username })
    .from(accountUsernameReservations)
    .where(and(
      eq(accountUsernameReservations.username, username),
      gt(accountUsernameReservations.reservedUntil, new Date()),
    ))
    .limit(1);
  if (usernameMatch || usernameReservation) {
    sendError(response, 409, "USERNAME_UNAVAILABLE", "Esse nome de usuário não está disponível.");
    return;
  }

  const [emailMatch] = await db
    .select({ id: accounts.id, displayName: accounts.displayName, status: accounts.status })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(eq(accountEmails.emailNormalized, email))
    .limit(1);
  if (emailMatch) {
    if (emailMatch.status === "pending_verification") {
      try {
        await deliverVerificationCode(delivery, emailMatch, email);
      } catch (error) {
        logger.warn({ code: "EMAIL_DELIVERY_FAILED" }, "Verification email could not be delivered");
        sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código. Tente novamente mais tarde.");
        return;
      }
    }
    response.status(202).json({ status: "verification_required", message: genericRegistrationMessage });
    return;
  }

  const displayName = registration.accountType === "personal"
    ? `${registration.firstName} ${registration.lastName}`.trim()
    : registration.businessName.trim();
  const passwordHash = await argon2.hash(registration.password, ARGON2ID_OPTIONS);

  try {
    const account = await db.transaction(async (tx) => {
      await lockUsernameClaims(tx, [username]);
      const now = new Date();
      await tx
        .delete(accountUsernameReservations)
        .where(and(
          eq(accountUsernameReservations.username, username),
          lte(accountUsernameReservations.reservedUntil, now),
        ));
      const [existingUsername] = await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.username, username))
        .limit(1);
      const [activeReservation] = await tx
        .select({ username: accountUsernameReservations.username })
        .from(accountUsernameReservations)
        .where(and(
          eq(accountUsernameReservations.username, username),
          gt(accountUsernameReservations.reservedUntil, now),
        ))
        .limit(1);
      if (existingUsername || activeReservation) return null;

      const [created] = await tx
        .insert(accounts)
        .values({
          username,
          firstName: registration.accountType === "personal" ? registration.firstName.trim() : null,
          lastName: registration.accountType === "personal" ? registration.lastName.trim() : null,
          age: registration.age,
          acceptedTermsVersion: CURRENT_TERMS_VERSION,
          displayName,
          accountType: registration.accountType,
          status: "pending_verification",
        })
        .returning({ id: accounts.id, username: accounts.username, displayName: accounts.displayName });
      if (!created) throw new Error("Account insert returned no row.");

      await tx.insert(accountEmails).values({ accountId: created.id, emailNormalized: email });
      await tx.insert(passwordCredentials).values({
        accountId: created.id,
        passwordHash,
        passwordPolicyVersion: PASSWORD_POLICY_VERSION,
      });

      if (registration.accountType === "commercial") {
        await tx.insert(commercialProfiles).values({
          accountId: created.id,
          categoryKey: registration.categoryKey,
          discoveryKind: registration.discoveryKind,
          address: registration.address,
          postalCode: registration.postalCode,
          cityName: registration.city,
          stateName: registration.state,
          countryName: registration.country,
        });
      }
      return created;
    });

    if (!account) {
      sendError(response, 409, "USERNAME_UNAVAILABLE", "Esse nome de usuário não está disponível.");
      return;
    }

    try {
      await deliverVerificationCode(delivery, account, email);
    } catch (error) {
      logger.warn({ code: "EMAIL_DELIVERY_FAILED" }, "Verification email could not be delivered");
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "A conta ficou pendente, mas o e-mail não pôde ser enviado. Tente reenviar mais tarde.");
      return;
    }
    response.status(202).json({ status: "verification_required", message: genericRegistrationMessage });
  } catch (error) {
    const pgError = error as { code?: string; constraint?: string };
    if (pgError.code === "23505" && pgError.constraint === "accounts_username_unique") {
      sendError(response, 409, "USERNAME_UNAVAILABLE", "Esse nome de usuário não está disponível.");
      return;
    }
    if (pgError.code === "23505" && pgError.constraint === "account_emails_email_unique") {
      response.status(202).json({ status: "verification_required", message: genericRegistrationMessage });
      return;
    }
    throw error;
  }
});

router.post("/login", createAuthRateLimit("login", 10, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const parsed = loginRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }
  const identifier = parsed.data.identifier.trim().replace(/^@/, "").toLowerCase();
  const isEmail = identifier.includes("@");
  const condition = isEmail ? eq(accountEmails.emailNormalized, identifier) : eq(accounts.username, identifier);
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

  const fallbackHash = await fallbackPasswordHashPromise;
  const passwordIsValid = await argon2.verify(row?.passwordHash ?? fallbackHash, parsed.data.password).catch(() => false);
  if (!row || !passwordIsValid) {
    sendError(response, 401, "INVALID_CREDENTIALS", "Usuário/e-mail ou senha inválidos.");
    return;
  }
  if (row.accountStatus === "pending_verification" || !row.emailVerifiedAt) {
    sendError(response, 403, "EMAIL_NOT_VERIFIED", "Confirme o e-mail antes de entrar. Nenhuma sessão foi criada.");
    return;
  }
  if (row.accountStatus !== "active") {
    sendError(response, 403, "ACCOUNT_UNAVAILABLE", "Esta conta não pode acessar o aplicativo.");
    return;
  }
  if (row.securityLockedAt) {
    sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), { supportEmail: SUPPORT_EMAIL });
    return;
  }
  const passwordMatchesCurrentPolicy = passwordPolicySchema.safeParse(parsed.data.password).success;
  const rawDeviceToken = request.cookies?.[DEVICE_COOKIE];
  const usableDeviceToken = typeof rawDeviceToken === "string" && /^[A-Za-z0-9_-]{43}$/.test(rawDeviceToken)
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
    if (!credential || credential.passwordHash !== row.passwordHash) return { kind: "credentials_changed" as const };
    if (credential.passwordPolicyVersion > PASSWORD_POLICY_VERSION) return { kind: "unsupported_policy" as const };
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
  if (loginResult.kind === "credentials_changed") {
    sendError(response, 409, "CREDENTIALS_CHANGED", "As credenciais foram alteradas. Entre novamente.");
    return;
  }
  if (loginResult.kind === "unsupported_policy") {
    sendError(response, 503, "PASSWORD_POLICY_UNSUPPORTED", "Atualize o aplicativo para continuar.");
    return;
  }
  if (loginResult.kind === "password_update_required") {
    sendError(response, 403, "PASSWORD_UPDATE_REQUIRED", "Atualize sua senha para atender aos requisitos atuais.");
    return;
  }
  if (loginResult.kind === "account_unavailable") {
    sendError(response, 403, "ACCOUNT_UNAVAILABLE", "Esta conta não pode acessar o aplicativo.");
    return;
  }
  if (loginResult.kind === "email_not_verified") {
    sendError(response, 403, "EMAIL_NOT_VERIFIED", "Confirme o e-mail antes de entrar. Nenhuma sessão foi criada.");
    return;
  }
  if (loginResult.kind === "account_locked") {
    sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), { supportEmail: SUPPORT_EMAIL });
    return;
  }
  if (loginResult.kind === "unknown_device") {
    const delivery = getAuthEmailDelivery();
    if (!delivery.isConfigured) {
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código para reconhecer esta instalação.");
      return;
    }
    const rawDeviceToken = randomBytes(32).toString("base64url");
    const pendingDeviceHash = hashToken(rawDeviceToken);
    const challenge = await createDeviceLoginChallenge(row.id, pendingDeviceHash);
    if (!challenge) {
      sendError(response, 403, "ACCOUNT_UNAVAILABLE", "Esta conta não pode acessar o aplicativo.");
      return;
    }
    try {
      await delivery.sendDeviceLoginCode({
        email: challenge.email,
        displayName: challenge.displayName,
        code: challenge.code,
      });
    } catch {
      logger.warn({ code: "DEVICE_LOGIN_EMAIL_FAILED" }, "Device verification email could not be delivered");
      await db
        .update(authChallenges)
        .set({ consumedAt: new Date() })
        .where(and(eq(authChallenges.id, challenge.challengeId), isNull(authChallenges.consumedAt)));
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código para reconhecer esta instalação. Tente novamente.");
      return;
    }

    setDeviceCookie(response, rawDeviceToken);
    response.status(202).json({
      status: "device_verification_required",
      challengeId: challenge.challengeId,
      emailMasked: challenge.emailMasked,
      expiresAt: challenge.expiresAt.toISOString(),
      resendAvailableAt: challenge.resendAvailableAt.toISOString(),
      message: "Como esta instalação ainda não foi reconhecida, enviamos um código para confirmar que é você.",
    });
    return;
  }

  setSessionCookie(response, loginResult.material.rawToken);
  if (!usableDeviceToken) throw new Error("Authenticated login has no valid trusted device token.");
  setDeviceCookie(response, usableDeviceToken);
  response.clearCookie(PRE_AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  response.json(authResult(row, loginResult.session, loginResult.material.csrfToken));
});

router.post("/device-verification/confirm", createAuthRateLimit("device-login-confirm", 10, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const parsed = challengeConfirmSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }
  const rawDeviceToken = request.cookies?.[DEVICE_COOKIE];
  if (typeof rawDeviceToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(rawDeviceToken)) {
    sendError(response, 400, "DEVICE_VERIFICATION_EXPIRED", "A confirmação expirou. Entre novamente para receber um novo código.");
    return;
  }

  const [preview] = await db
    .select({ accountId: authChallenges.accountId })
    .from(authChallenges)
    .where(and(
      eq(authChallenges.id, parsed.data.challengeId),
      eq(authChallenges.purpose, "device_login"),
    ))
    .limit(1);
  if (!preview) {
    sendError(response, 400, "DEVICE_VERIFICATION_EXPIRED", "A confirmação expirou. Entre novamente para receber um novo código.");
    return;
  }

  const now = new Date();
  const material = createSessionMaterial();
  const result = await db.transaction(async (tx) => {
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
        eq(authChallenges.id, parsed.data.challengeId),
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

    const expectedHash = hashDeviceLoginCode(account.id, challenge.id, parsed.data.code);
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

      const resendDelay = attempts >= 2 ? DEVICE_FINAL_RESEND_COOLDOWN_MS : DEVICE_RESEND_COOLDOWN_MS;
      const resendAvailableAt = new Date(now.getTime() + resendDelay);
      await tx
        .update(authChallenges)
        .set({ attempts, resendAvailableAt })
        .where(eq(authChallenges.id, challenge.id));
      return { kind: "wrong_code" as const, resendAvailableAt, attemptsRemaining: MAX_DEVICE_LOGIN_ATTEMPTS - attempts };
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
    return { kind: "authenticated" as const, account, session };
  });

  if (result.kind === "locked") {
    clearSessionCookie(response);
    clearDeviceCookie(response);
    sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), { supportEmail: SUPPORT_EMAIL });
    return;
  }
  if (result.kind === "unavailable") {
    sendError(response, 403, "ACCOUNT_UNAVAILABLE", "Esta conta não pode acessar o aplicativo.");
    return;
  }
  if (result.kind === "password_update_required") {
    sendError(response, 403, "PASSWORD_UPDATE_REQUIRED", "Atualize sua senha para atender aos requisitos atuais.");
    return;
  }
  if (result.kind === "wrong_code") {
    sendError(response, 400, "INVALID_DEVICE_CODE", "O código está incorreto.", {
      resendAvailableAt: result.resendAvailableAt.toISOString(),
      attemptsRemaining: result.attemptsRemaining,
    });
    return;
  }
  if (result.kind === "invalid") {
    sendError(response, 400, "DEVICE_VERIFICATION_EXPIRED", "O código expirou ou não pertence a esta instalação. Entre novamente.");
    return;
  }

  setDeviceCookie(response, rawDeviceToken);
  setSessionCookie(response, material.rawToken);
  response.clearCookie(PRE_AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  response.json(authResult(result.account, result.session, material.csrfToken));
});

router.post("/device-verification/resend", createAuthRateLimit("device-login-resend", 5, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const parsed = challengeResendSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }
  const rawDeviceToken = request.cookies?.[DEVICE_COOKIE];
  if (typeof rawDeviceToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(rawDeviceToken)) {
    sendError(response, 400, "DEVICE_VERIFICATION_EXPIRED", "A confirmação expirou. Entre novamente para receber um novo código.");
    return;
  }
  const [preview] = await db
    .select({ accountId: authChallenges.accountId })
    .from(authChallenges)
    .where(and(
      eq(authChallenges.id, parsed.data.challengeId),
      eq(authChallenges.purpose, "device_login"),
    ))
    .limit(1);
  if (!preview) {
    sendError(response, 400, "DEVICE_VERIFICATION_EXPIRED", "A confirmação expirou. Entre novamente para receber um novo código.");
    return;
  }

  const now = new Date();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const update = await db.transaction(async (tx) => {
    const [account] = await tx
      .select({
        id: accounts.id,
        displayName: accounts.displayName,
        email: accountEmails.emailNormalized,
        status: accounts.status,
        verifiedAt: accountEmails.verifiedAt,
        securityLockedAt: accounts.securityLockedAt,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(eq(accounts.id, preview.accountId))
      .for("update")
      .limit(1);
    if (!account || account.status !== "active" || !account.verifiedAt) return { kind: "unavailable" as const };
    if (account.securityLockedAt) return { kind: "locked" as const };

    const [challenge] = await tx
      .select({
        id: authChallenges.id,
        attempts: authChallenges.attempts,
        deviceTokenHash: authChallenges.deviceTokenHash,
        expiresAt: authChallenges.expiresAt,
        resendAvailableAt: authChallenges.resendAvailableAt,
      })
      .from(authChallenges)
      .where(and(
        eq(authChallenges.id, parsed.data.challengeId),
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
    if (challenge.resendAvailableAt && challenge.resendAvailableAt > now) {
      return {
        kind: "cooldown" as const,
        retryAfterSeconds: Math.ceil((challenge.resendAvailableAt.getTime() - now.getTime()) / 1000),
      };
    }

    const resendDelay = challenge.attempts >= 2 ? DEVICE_FINAL_RESEND_COOLDOWN_MS : DEVICE_RESEND_COOLDOWN_MS;
    const resendAvailableAt = new Date(now.getTime() + resendDelay);
    const expiresAt = new Date(now.getTime() + DEVICE_LOGIN_TTL_MS);
    await tx
      .update(authChallenges)
      .set({
        tokenHash: hashDeviceLoginCode(account.id, challenge.id, code),
        expiresAt,
        resendAvailableAt,
      })
      .where(eq(authChallenges.id, challenge.id));
    return { kind: "sent" as const, email: account.email, displayName: account.displayName, expiresAt, resendAvailableAt };
  });

  if (update.kind === "locked") {
    sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), { supportEmail: SUPPORT_EMAIL });
    return;
  }
  if (update.kind === "unavailable" || update.kind === "invalid") {
    sendError(response, 400, "DEVICE_VERIFICATION_EXPIRED", "A confirmação expirou. Entre novamente para receber um novo código.");
    return;
  }
  if (update.kind === "cooldown") {
    sendError(response, 429, "CODE_RESEND_COOLDOWN", "Aguarde antes de pedir outro código.", {
      retryAfterSeconds: update.retryAfterSeconds,
    });
    return;
  }

  const delivery = getAuthEmailDelivery();
  try {
    if (!delivery.isConfigured) throw new EmailDeliveryUnavailableError();
    await delivery.sendDeviceLoginCode({ email: update.email, displayName: update.displayName, code });
  } catch {
    logger.warn({ code: "DEVICE_LOGIN_RESEND_FAILED" }, "Device verification email could not be delivered");
    await db
      .update(authChallenges)
      .set({ consumedAt: new Date() })
      .where(and(eq(authChallenges.id, parsed.data.challengeId), isNull(authChallenges.consumedAt)));
    sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o novo código. Entre novamente para tentar.");
    return;
  }

  response.json({
    status: "verification_code_resent",
    expiresAt: update.expiresAt.toISOString(),
    resendAvailableAt: update.resendAvailableAt.toISOString(),
  });
});

router.post("/password/update", createAuthRateLimit("password-update", 5, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const parsed = passwordPolicyUpdateSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }

  const identifier = parsed.data.identifier.trim().replace(/^@/, "").toLowerCase();
  const condition = identifier.includes("@")
    ? eq(accountEmails.emailNormalized, identifier)
    : eq(accounts.username, identifier);
  const [row] = await db
    .select({
      id: accounts.id,
      status: accounts.status,
      securityLockedAt: accounts.securityLockedAt,
      emailVerifiedAt: accountEmails.verifiedAt,
      email: accountEmails.emailNormalized,
      displayName: accounts.displayName,
      passwordHash: passwordCredentials.passwordHash,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
    .where(condition)
    .limit(1);

  const fallbackHash = await fallbackPasswordHashPromise;
  const currentPasswordIsValid = await argon2
    .verify(row?.passwordHash ?? fallbackHash, parsed.data.currentPassword)
    .catch(() => false);
  if (!row || !currentPasswordIsValid) {
    sendError(response, 401, "INVALID_CREDENTIALS", "Usuário/e-mail ou senha inválidos.");
    return;
  }
  if (row.status === "pending_verification" || !row.emailVerifiedAt) {
    sendError(response, 403, "EMAIL_NOT_VERIFIED", "Confirme o e-mail antes de atualizar a senha.");
    return;
  }
  if (row.status !== "active") {
    sendError(response, 403, "ACCOUNT_UNAVAILABLE", "Esta conta não pode acessar o aplicativo.");
    return;
  }
  if (row.securityLockedAt) {
    sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), { supportEmail: SUPPORT_EMAIL });
    return;
  }
  if (await argon2.verify(row.passwordHash, parsed.data.newPassword).catch(() => false)) {
    sendError(response, 400, "PASSWORD_REUSE", "Escolha uma senha diferente da senha atual.");
    return;
  }

  const newPasswordHash = await argon2.hash(parsed.data.newPassword, ARGON2ID_OPTIONS);
  const now = new Date();
  const delivery = getAuthEmailDelivery();
  if (!delivery.isConfigured) {
    sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código para confirmar a alteração da senha.");
    return;
  }

  const challenge = await createPasswordUpdateChallenge(row.id, newPasswordHash, row.passwordHash);
  if (!challenge) {
    sendError(response, 409, "CREDENTIALS_CHANGED", "As credenciais mudaram. Confira sua senha atual e tente novamente.");
    return;
  }
  try {
    await delivery.sendPasswordUpdateCode({
      email: challenge.email,
      displayName: challenge.displayName,
      code: challenge.code,
    });
  } catch {
    logger.warn({ code: "PASSWORD_UPDATE_EMAIL_FAILED" }, "Password update confirmation email could not be delivered");
    await db
      .update(authChallenges)
      .set({ consumedAt: new Date() })
      .where(and(eq(authChallenges.id, challenge.challengeId), isNull(authChallenges.consumedAt)));
    sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código. Tente novamente mais tarde.");
    return;
  }

  response.status(202).json({
    status: "password_update_verification_required",
    challengeId: challenge.challengeId,
    emailMasked: challenge.emailMasked,
    expiresAt: challenge.expiresAt.toISOString(),
    message: `Enviamos um código para ${challenge.emailMasked}.`,
  });
});

router.post("/password/update/confirm", createAuthRateLimit("password-update-confirm", 10, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const parsed = challengeConfirmSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }

  const [preview] = await db
    .select({ accountId: authChallenges.accountId })
    .from(authChallenges)
    .where(and(
      eq(authChallenges.id, parsed.data.challengeId),
      eq(authChallenges.purpose, "password_update"),
    ))
    .limit(1);
  if (!preview) {
    sendError(response, 400, "INVALID_PASSWORD_UPDATE", "Código inválido ou expirado. Inicie a alteração da senha novamente.");
    return;
  }

  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const [account] = await tx
      .select({
        id: accounts.id,
        status: accounts.status,
        securityLockedAt: accounts.securityLockedAt,
        verifiedAt: accountEmails.verifiedAt,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(eq(accounts.id, preview.accountId))
      .for("update")
      .limit(1);
    if (!account || account.status !== "active" || !account.verifiedAt) return { kind: "unavailable" as const };
    if (account.securityLockedAt) return { kind: "locked" as const };

    const [challenge] = await tx
      .select({
        id: authChallenges.id,
        tokenHash: authChallenges.tokenHash,
        attempts: authChallenges.attempts,
        pendingPasswordHash: authChallenges.pendingPasswordHash,
        basePasswordHash: authChallenges.basePasswordHash,
      })
      .from(authChallenges)
      .where(and(
        eq(authChallenges.id, parsed.data.challengeId),
        eq(authChallenges.accountId, account.id),
        eq(authChallenges.purpose, "password_update"),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now),
        lt(authChallenges.attempts, MAX_PASSWORD_UPDATE_ATTEMPTS),
      ))
      .for("update")
      .limit(1);
    if (!challenge || !challenge.pendingPasswordHash || !challenge.basePasswordHash) {
      return { kind: "invalid" as const };
    }

    const expectedHash = hashPasswordUpdateCode(account.id, challenge.id, parsed.data.code);
    if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
      await tx
        .update(authChallenges)
        .set({ attempts: sql`${authChallenges.attempts} + 1` })
        .where(and(
          eq(authChallenges.id, challenge.id),
          isNull(authChallenges.consumedAt),
          lt(authChallenges.attempts, MAX_PASSWORD_UPDATE_ATTEMPTS),
        ));
      return { kind: "invalid" as const };
    }

    const [consumed] = await tx
      .update(authChallenges)
      .set({ consumedAt: now })
      .where(and(
        eq(authChallenges.id, challenge.id),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now),
        lt(authChallenges.attempts, MAX_PASSWORD_UPDATE_ATTEMPTS),
      ))
      .returning({ id: authChallenges.id });
    if (!consumed) return { kind: "invalid" as const };

    const [credential] = await tx
      .update(passwordCredentials)
      .set({
        passwordHash: challenge.pendingPasswordHash,
        passwordPolicyVersion: PASSWORD_POLICY_VERSION,
        passwordChangedAt: now,
      })
      .where(and(
        eq(passwordCredentials.accountId, account.id),
        eq(passwordCredentials.passwordHash, challenge.basePasswordHash),
      ))
      .returning({ accountId: passwordCredentials.accountId });
    if (!credential) return { kind: "credentials_changed" as const };

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
        inArray(authChallenges.purpose, ["device_login", "password_update", "reset_password"]),
        isNull(authChallenges.consumedAt),
      ));
    return { kind: "updated" as const };
  });

  if (result.kind === "locked") {
    sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), { supportEmail: SUPPORT_EMAIL });
    return;
  }
  if (result.kind === "credentials_changed") {
    sendError(response, 409, "CREDENTIALS_CHANGED", "As credenciais mudaram. Inicie novamente a alteração da senha.");
    return;
  }
  if (result.kind !== "updated") {
    sendError(response, 400, "INVALID_PASSWORD_UPDATE", "Código inválido ou expirado. Inicie a alteração da senha novamente.");
    return;
  }

  clearSessionCookie(response);
  clearDeviceCookie(response);
  response.json({ status: "password_updated" });
});

router.post("/password/reset/request", createAuthRateLimit("password-reset-request", 5, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const startedAt = Date.now();
  const parsed = passwordResetRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }

  const email = parsed.data.email;
  const delivery = getAuthEmailDelivery();
  let pendingDelivery: { accountId: string; code: string; tokenHash: string } | null = null;

  if (delivery.isConfigured) {
    const [account] = await db
      .select({
        id: accounts.id,
        status: accounts.status,
        securityLockedAt: accounts.securityLockedAt,
        verifiedAt: accountEmails.verifiedAt,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(eq(accountEmails.emailNormalized, email))
      .limit(1);

    if (account?.status === "active" && account.verifiedAt && !account.securityLockedAt) {
      const challenge = await createPasswordResetChallenge(account.id);
      if (challenge) pendingDelivery = { accountId: account.id, ...challenge };
    }
  }

  // Keep the status and body identical for unknown, unverified, rate-limited,
  // and eligible addresses. The email is sent after the response to avoid
  // turning provider latency into an account-existence signal.
  const responseDelay = Math.max(0, 200 - (Date.now() - startedAt));
  if (responseDelay > 0) await new Promise((resolve) => setTimeout(resolve, responseDelay));
  response.status(202).json({
    status: "reset_requested",
    message: genericPasswordResetMessage,
  });

  if (pendingDelivery) {
    void delivery.sendPasswordResetCode({ email, code: pendingDelivery.code }).catch(async () => {
      logger.warn({ code: "PASSWORD_RESET_EMAIL_FAILED" }, "Password reset email could not be delivered");
      try {
        await db
          .update(authChallenges)
          .set({ consumedAt: new Date() })
          .where(and(
            eq(authChallenges.accountId, pendingDelivery.accountId),
            eq(authChallenges.purpose, "reset_password"),
            eq(authChallenges.tokenHash, pendingDelivery.tokenHash),
            isNull(authChallenges.consumedAt),
          ));
      } catch {
        logger.error({ code: "PASSWORD_RESET_CHALLENGE_INVALIDATION_FAILED" }, "Failed email challenge could not be invalidated");
      }
    });
  }
});

router.post("/password/reset/confirm", createAuthRateLimit("password-reset-confirm", 10, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const parsed = passwordResetConfirmSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }

  const email = parsed.data.email;
  const now = new Date();
  const [account] = await db
    .select({
      id: accounts.id,
      status: accounts.status,
      securityLockedAt: accounts.securityLockedAt,
      verifiedAt: accountEmails.verifiedAt,
      passwordHash: passwordCredentials.passwordHash,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
    .where(eq(accountEmails.emailNormalized, email))
    .limit(1);

  if (!account || account.status !== "active" || !account.verifiedAt) {
    sendError(response, 400, "INVALID_PASSWORD_RESET", invalidPasswordResetMessage);
    return;
  }
  if (account.securityLockedAt) {
    sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), { supportEmail: SUPPORT_EMAIL });
    return;
  }

  const [challenge] = await db
    .select({
      id: authChallenges.id,
      tokenHash: authChallenges.tokenHash,
      attempts: authChallenges.attempts,
    })
    .from(authChallenges)
    .where(and(
      eq(authChallenges.accountId, account.id),
      eq(authChallenges.purpose, "reset_password"),
      isNull(authChallenges.consumedAt),
      gt(authChallenges.expiresAt, now),
      lt(authChallenges.attempts, MAX_PASSWORD_RESET_ATTEMPTS),
    ))
    .orderBy(desc(authChallenges.createdAt))
    .limit(1);

  if (!challenge) {
    sendError(response, 400, "INVALID_PASSWORD_RESET", invalidPasswordResetMessage);
    return;
  }

  const expectedHash = hashPasswordResetCode(account.id, parsed.data.code);
  if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
    await db
      .update(authChallenges)
      .set({ attempts: sql`${authChallenges.attempts} + 1` })
      .where(and(
        eq(authChallenges.id, challenge.id),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now),
        lt(authChallenges.attempts, MAX_PASSWORD_RESET_ATTEMPTS),
      ));
    sendError(response, 400, "INVALID_PASSWORD_RESET", invalidPasswordResetMessage);
    return;
  }

  if (await argon2.verify(account.passwordHash, parsed.data.newPassword).catch(() => false)) {
    sendError(response, 400, "PASSWORD_REUSE", "Escolha uma senha diferente da senha atual.");
    return;
  }

  const newPasswordHash = await argon2.hash(parsed.data.newPassword, ARGON2ID_OPTIONS);
  let passwordWasReset: boolean;
  try {
    passwordWasReset = await db.transaction(async (tx) => {
      const [currentAccount] = await tx
        .select({ id: accounts.id, securityLockedAt: accounts.securityLockedAt })
        .from(accounts)
        .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
        .where(and(
          eq(accounts.id, account.id),
          eq(accounts.status, "active"),
          isNull(accounts.securityLockedAt),
          isNotNull(accountEmails.verifiedAt),
        ))
        .for("update");
      if (!currentAccount) return false;

      const [consumedChallenge] = await tx
        .update(authChallenges)
        .set({ consumedAt: now })
        .where(and(
          eq(authChallenges.id, challenge.id),
          eq(authChallenges.accountId, account.id),
          eq(authChallenges.purpose, "reset_password"),
          eq(authChallenges.tokenHash, challenge.tokenHash),
          isNull(authChallenges.consumedAt),
          gt(authChallenges.expiresAt, now),
          lt(authChallenges.attempts, MAX_PASSWORD_RESET_ATTEMPTS),
        ))
        .returning({ id: authChallenges.id });
      if (!consumedChallenge) return false;

      const [updatedCredential] = await tx
        .update(passwordCredentials)
        .set({
          passwordHash: newPasswordHash,
          passwordPolicyVersion: PASSWORD_POLICY_VERSION,
          passwordChangedAt: now,
        })
        .where(and(
          eq(passwordCredentials.accountId, account.id),
          eq(passwordCredentials.passwordHash, account.passwordHash),
        ))
        .returning({ accountId: passwordCredentials.accountId });
      if (!updatedCredential) throw new Error("PASSWORD_RESET_CREDENTIAL_CHANGED");

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
          inArray(authChallenges.purpose, ["reset_password", "password_update", "device_login"]),
          isNull(authChallenges.consumedAt),
          sql`${authChallenges.id} <> ${challenge.id}`,
        ));
      return true;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PASSWORD_RESET_CREDENTIAL_CHANGED") {
      sendError(response, 409, "CREDENTIALS_CHANGED", "As credenciais foram alteradas. Solicite um novo código.");
      return;
    }
    throw error;
  }

  if (!passwordWasReset) {
    sendError(response, 400, "INVALID_PASSWORD_RESET", invalidPasswordResetMessage);
    return;
  }
  clearSessionCookie(response);
  clearDeviceCookie(response);
  response.json({ status: "password_reset" });
});

router.post("/verification", createAuthRateLimit("verify-resend", 3, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const parsed = verificationRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }
  const delivery = getAuthEmailDelivery();
  if (!delivery.isConfigured) {
    sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "O envio de verificação por e-mail ainda não está configurado.");
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const [row] = await db
    .select({ id: accounts.id, displayName: accounts.displayName, status: accounts.status, verifiedAt: accountEmails.verifiedAt })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(eq(accountEmails.emailNormalized, email))
    .limit(1);
  if (row?.status === "pending_verification" && !row.verifiedAt) {
    try {
      await deliverVerificationCode(delivery, row, email);
    } catch {
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código. Tente novamente mais tarde.");
      return;
    }
  }
  response.status(202).json({ status: "verification_required", message: genericVerificationMessage });
});

router.post("/verification/confirm", createAuthRateLimit("verify-confirm", 10, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const parsed = verificationConfirmSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }
  const email = parsed.data.email.toLowerCase();
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
    sendError(response, 400, "INVALID_VERIFICATION_CODE", "Código inválido ou expirado.");
    return;
  }

  const now = new Date();
  const [challenge] = await db
    .select({ id: authChallenges.id, attempts: authChallenges.attempts, tokenHash: authChallenges.tokenHash })
    .from(authChallenges)
    .where(
      and(
        eq(authChallenges.accountId, account.id),
        eq(authChallenges.purpose, "verify_email"),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now),
      ),
    )
    .orderBy(desc(authChallenges.createdAt))
    .limit(1);
  if (!challenge || challenge.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    sendError(response, 400, "INVALID_VERIFICATION_CODE", "Código inválido ou expirado.");
    return;
  }
  const expectedHash = challengeHash(account.id, parsed.data.code);
  if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
    const nextAttemptCount = sql`${authChallenges.attempts} + 1`;
    await db.update(authChallenges).set({ attempts: nextAttemptCount }).where(eq(authChallenges.id, challenge.id));
    sendError(response, 400, "INVALID_VERIFICATION_CODE", "Código inválido ou expirado.");
    return;
  }

  const material = createSessionMaterial();
  const deviceRawToken = randomBytes(32).toString("base64url");
  let result: { id: string; createdAt: Date; expiresAt: Date } | null;
  try {
    result = await db.transaction(async (tx) => {
      const [consumedChallenge] = await tx
        .update(authChallenges)
        .set({ consumedAt: now })
        .where(and(eq(authChallenges.id, challenge.id), isNull(authChallenges.consumedAt)))
        .returning({ id: authChallenges.id });
      if (!consumedChallenge) throw new Error("VERIFICATION_ALREADY_CONSUMED");

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

      if (account.passwordPolicyVersion < PASSWORD_POLICY_VERSION) return null;

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
      return session;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "VERIFICATION_ALREADY_CONSUMED") {
      sendError(response, 400, "INVALID_VERIFICATION_CODE", "Código inválido ou expirado.");
      return;
    }
    throw error;
  }

  if (!result) {
    response.clearCookie(PRE_AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    response.json({
      emailVerified: true,
      passwordUpdateRequired: true,
      message: "E-mail confirmado. Atualize sua senha para entrar.",
    });
    return;
  }

  setSessionCookie(response, material.rawToken);
  setDeviceCookie(response, deviceRawToken);
  response.clearCookie(PRE_AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  response.json(authResult(account, result, material.csrfToken));
});

router.get("/session", async (request, response) => {
  const activeSession = await loadActiveSession(request);
  if (!activeSession) {
    response.json({ authenticated: false, account: null, session: null });
    return;
  }
  response.json({
    authenticated: true,
    account: {
      id: activeSession.accountId,
      username: activeSession.username,
      displayName: activeSession.displayName,
      accountType: activeSession.accountType,
      joinedAt: activeSession.createdAt.toISOString(),
      onboardingCompleted: activeSession.onboardingCompletedAt !== null,
    },
    session: {
      id: activeSession.sessionId,
      createdAt: activeSession.createdAt.toISOString(),
      expiresAt: activeSession.expiresAt.toISOString(),
    },
  });
});

router.get("/devices", createAuthRateLimit("devices-list", 60, 15 * 60 * 1000), async (request, response) => {
  const activeSession = await loadActiveSession(request);
  if (!activeSession) {
    sendError(response, 401, "AUTH_REQUIRED", "Entre novamente para gerenciar as instalações confiáveis.");
    return;
  }

  const rows = await db
    .select({
      id: trustedDevices.id,
      createdAt: trustedDevices.createdAt,
      lastSeenAt: trustedDevices.lastSeenAt,
    })
    .from(trustedDevices)
    .where(and(
      eq(trustedDevices.accountId, activeSession.accountId),
      isNull(trustedDevices.revokedAt),
    ))
    .orderBy(desc(trustedDevices.lastSeenAt), desc(trustedDevices.id))
    .limit(101);

  response.json({
    items: rows.slice(0, 100).map((device) => ({
      id: device.id,
      firstSeenAt: device.createdAt.toISOString(),
      lastSeenAt: device.lastSeenAt.toISOString(),
      isCurrent: device.id === activeSession.deviceId,
    })),
    hasMore: rows.length > 100,
  });
});

router.delete("/devices/others", createAuthRateLimit("devices-revoke-others", 10, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const activeSession = await loadActiveSession(request);
  if (!activeSession) {
    sendError(response, 401, "AUTH_REQUIRED", "Entre novamente para gerenciar as instalações confiáveis.");
    return;
  }

  const now = new Date();
  const revokedDeviceIds = await db.transaction(async (tx) => {
    const revoked = await tx
      .update(trustedDevices)
      .set({ revokedAt: now })
      .where(and(
        eq(trustedDevices.accountId, activeSession.accountId),
        ne(trustedDevices.id, activeSession.deviceId),
        isNull(trustedDevices.revokedAt),
      ))
      .returning({ id: trustedDevices.id });
    if (revoked.length > 0) {
      await tx
        .update(sessions)
        .set({ revokedAt: now })
        .where(and(
          eq(sessions.accountId, activeSession.accountId),
          inArray(sessions.deviceId, revoked.map((device) => device.id)),
          isNull(sessions.revokedAt),
        ));
    }
    return revoked.map((device) => device.id);
  });
  response.json({ status: "other_devices_revoked", revokedCount: revokedDeviceIds.length });
});

router.delete("/devices/:deviceId", createAuthRateLimit("device-revoke", 20, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const params = trustedDeviceIdParamSchema.safeParse(request.params);
  if (!params.success) {
    sendValidationError(response, params.error.issues);
    return;
  }
  const activeSession = await loadActiveSession(request);
  if (!activeSession) {
    sendError(response, 401, "AUTH_REQUIRED", "Entre novamente para gerenciar as instalações confiáveis.");
    return;
  }

  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const [revoked] = await tx
      .update(trustedDevices)
      .set({ revokedAt: now })
      .where(and(
        eq(trustedDevices.id, params.data.deviceId),
        eq(trustedDevices.accountId, activeSession.accountId),
        isNull(trustedDevices.revokedAt),
      ))
      .returning({ id: trustedDevices.id });
    if (!revoked) return null;

    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(
        eq(sessions.accountId, activeSession.accountId),
        eq(sessions.deviceId, revoked.id),
        isNull(sessions.revokedAt),
      ));
    return { isCurrent: revoked.id === activeSession.deviceId };
  });
  if (!result) {
    sendError(response, 404, "DEVICE_NOT_FOUND", "A instalação não foi encontrada ou já foi removida.");
    return;
  }
  if (result.isCurrent) {
    clearSessionCookie(response);
    clearDeviceCookie(response);
    response.clearCookie(PRE_AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  }
  response.status(204).end();
});

router.get("/sessions", createAuthRateLimit("sessions-list", 60, 15 * 60 * 1000), async (request, response) => {
  const activeSession = await loadActiveSession(request);
  if (!activeSession) {
    sendError(response, 401, "AUTH_REQUIRED", "Entre novamente para gerenciar suas sessões.");
    return;
  }

  const rawCursor = request.query.cursor;
  let offset = 0;
  if (rawCursor !== undefined) {
    if (typeof rawCursor !== "string" || rawCursor.length > 16) {
      sendError(response, 400, "VALIDATION_ERROR", "O cursor da página é inválido.");
      return;
    }
    const decoded = Buffer.from(rawCursor, "base64url").toString("utf8");
    if (
      !/^(0|[1-9][0-9]{0,6})$/.test(decoded)
      || Buffer.from(decoded).toString("base64url") !== rawCursor
      || Number(decoded) > 1_000_000
    ) {
      sendError(response, 400, "VALIDATION_ERROR", "O cursor da página é inválido.");
      return;
    }
    offset = Number(decoded);
  }

  const pageSize = 20;
  const rows = await db
    .select({
      id: sessions.id,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(and(
      eq(sessions.accountId, activeSession.accountId),
      isNull(sessions.revokedAt),
      gt(sessions.expiresAt, new Date()),
    ))
    .orderBy(desc(sessions.createdAt), desc(sessions.id))
    .limit(pageSize + 1)
    .offset(offset);

  const hasMore = rows.length > pageSize;
  response.json({
    items: rows.slice(0, pageSize).map((session) => ({
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      isCurrent: session.id === activeSession.sessionId,
    })),
    nextCursor: hasMore ? Buffer.from(String(offset + pageSize)).toString("base64url") : null,
  });
});

router.delete("/sessions/others", createAuthRateLimit("sessions-revoke-others", 10, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const activeSession = await loadActiveSession(request);
  if (!activeSession) {
    sendError(response, 401, "AUTH_REQUIRED", "Entre novamente para gerenciar suas sessões.");
    return;
  }

  const revoked = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(sessions.accountId, activeSession.accountId),
      ne(sessions.id, activeSession.sessionId),
      isNull(sessions.revokedAt),
      gt(sessions.expiresAt, new Date()),
    ))
    .returning({ id: sessions.id });
  response.json({ status: "other_sessions_revoked", revokedCount: revoked.length });
});

router.delete("/sessions/:sessionId", createAuthRateLimit("session-revoke", 20, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const params = sessionIdParamSchema.safeParse(request.params);
  if (!params.success) {
    sendValidationError(response, params.error.issues);
    return;
  }

  const activeSession = await loadActiveSession(request);
  if (!activeSession) {
    sendError(response, 401, "AUTH_REQUIRED", "Entre novamente para gerenciar suas sessões.");
    return;
  }
  if (params.data.sessionId === activeSession.sessionId) {
    sendError(response, 409, "CURRENT_SESSION_USE_LOGOUT", "Use a opção de sair para encerrar esta sessão.");
    return;
  }

  const [revoked] = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(sessions.id, params.data.sessionId),
      eq(sessions.accountId, activeSession.accountId),
      isNull(sessions.revokedAt),
      gt(sessions.expiresAt, new Date()),
    ))
    .returning({ id: sessions.id });
  if (!revoked) {
    sendError(response, 404, "SESSION_NOT_FOUND", "A sessão não foi encontrada ou já foi encerrada.");
    return;
  }
  response.status(204).end();
});

router.post("/logout", requireCsrf, async (request: Request, response: Response) => {
  const rawToken = request.cookies?.[SESSION_COOKIE];
  if (rawToken) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.tokenHash, hashToken(rawToken)), isNull(sessions.revokedAt)));
  }
  clearSessionCookie(response);
  response.clearCookie(PRE_AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  response.status(204).end();
});

export default router;
