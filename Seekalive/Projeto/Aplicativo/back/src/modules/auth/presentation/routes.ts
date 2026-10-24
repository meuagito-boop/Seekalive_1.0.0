import { randomBytes, randomInt } from "node:crypto";
import argon2 from "argon2";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  accountEmails,
  accounts,
  authChallenges,
  commercialProfiles,
  db,
  passwordCredentials,
  sessions,
} from "@workspace/db";
import {
  loginRequestSchema,
  registerRequestSchema,
  verificationConfirmSchema,
  verificationRequestSchema,
} from "@workspace/api-zod";
import { logger } from "../../../common/logger";
import {
  clearSessionCookie,
  constantTimeEquals,
  createAuthRateLimit,
  csrfHash,
  hashToken,
  hashVerificationCode,
  issuePreAuthCsrf,
  loadActiveSession,
  PRE_AUTH_COOKIE,
  requireCsrf,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
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
const genericRegistrationMessage = "Se os dados forem válidos, enviaremos um código de verificação para o e-mail informado.";
const genericVerificationMessage = "Se houver uma conta pendente para esse e-mail, enviaremos um novo código.";
const fallbackPasswordHashPromise = argon2.hash("seekalive-invalid-user-placeholder", {
  type: argon2.argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
});

router.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});

function sendError(response: Response, status: number, code: string, message: string): void {
  response.status(status).json({
    error: { code, message, requestId: response.locals.requestId ?? "unknown" },
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
  if (registration.acceptedTermsVersion !== CURRENT_TERMS_VERSION) {
    sendError(response, 400, "TERMS_VERSION_INVALID", "Atualize a página para aceitar a versão atual dos termos.");
    return;
  }
  if (!authEmailDelivery.isConfigured) {
    sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "O envio de verificação por e-mail ainda não está configurado. Nenhuma conta foi criada.");
    return;
  }

  const username = registration.username.toLowerCase();
  const email = registration.email.toLowerCase();
  const [usernameMatch] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.username, username)).limit(1);
  if (usernameMatch) {
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
        await deliverVerificationCode(authEmailDelivery, emailMatch, email);
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
  const passwordHash = await argon2.hash(registration.password, {
    type: argon2.argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
  });

  try {
    const account = await db.transaction(async (tx) => {
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
      await tx.insert(passwordCredentials).values({ accountId: created.id, passwordHash });

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

    try {
      await deliverVerificationCode(authEmailDelivery, account, email);
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
      onboardingCompletedAt: accounts.onboardingCompletedAt,
      createdAt: accounts.createdAt,
      emailVerifiedAt: accountEmails.verifiedAt,
      passwordHash: passwordCredentials.passwordHash,
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

  const material = createSessionMaterial();
  const [session] = await db
    .insert(sessions)
    .values({
      accountId: row.id,
      tokenHash: material.tokenHash,
      csrfTokenHash: material.csrfTokenHash,
      createdAt: material.createdAt,
      expiresAt: material.expiresAt,
    })
    .returning({ id: sessions.id, createdAt: sessions.createdAt, expiresAt: sessions.expiresAt });
  if (!session) throw new Error("Session insert returned no row.");

  setSessionCookie(response, material.rawToken);
  response.clearCookie(PRE_AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  response.json(authResult(row, session, material.csrfToken));
});

router.post("/verification", createAuthRateLimit("verify-resend", 3, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const parsed = verificationRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }
  if (!authEmailDelivery.isConfigured) {
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
      await deliverVerificationCode(authEmailDelivery, row, email);
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
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
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
  let result: { id: string; createdAt: Date; expiresAt: Date };
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

      const [session] = await tx
      .insert(sessions)
      .values({
        accountId: account.id,
        tokenHash: material.tokenHash,
        csrfTokenHash: material.csrfTokenHash,
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

  setSessionCookie(response, material.rawToken);
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
