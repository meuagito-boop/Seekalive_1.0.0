import { and, asc, desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  accountBlocks,
  accountEmails,
  accountFollows,
  accountFollowRequests,
  accounts,
  db,
} from "@workspace/db";
import { createAuthRateLimit } from "../../../security/request-origin";
import { loadActiveSession, requireCsrf } from "../../../security/session";
import { accountView, accountViewsByIds, findActiveAccountById, isBlockedBetween } from "../../profiles/presentation/routes";

const router: IRouter = Router();
type SocialTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type LockedRelationshipAccount = {
  id: string;
  status: string;
  isPrivate: boolean;
};

function sendError(response: Response, status: number, code: string, message: string): void {
  response.status(status).json({
    error: { code, message, requestId: response.locals.requestId ?? "unknown" },
  });
}

async function activeAccountId(request: Request, response: Response): Promise<string | null> {
  const session = await loadActiveSession(request);
  if (!session) {
    sendError(response, 401, "UNAUTHENTICATED", "Entre com uma conta verificada para continuar.");
    return null;
  }
  return session.accountId;
}

async function lockRelationshipAccounts(
  tx: SocialTransaction,
  firstId: string,
  secondId: string,
): Promise<LockedRelationshipAccount[]> {
  const locked: LockedRelationshipAccount[] = [];
  for (const id of [...new Set([firstId, secondId])].sort()) {
    const [account] = await tx
      .select({ id: accounts.id, status: accounts.status, isPrivate: accounts.isPrivate })
      .from(accounts)
      .where(eq(accounts.id, id))
      .for("update")
      .limit(1);
    if (account) locked.push(account);
  }
  return locked;
}

async function hasVerifiedActiveAccount(tx: SocialTransaction, account: LockedRelationshipAccount | undefined): Promise<boolean> {
  if (!account || account.status !== "active") return false;
  const [email] = await tx
    .select({ accountId: accountEmails.accountId })
    .from(accountEmails)
    .where(and(eq(accountEmails.accountId, account.id), isNotNull(accountEmails.verifiedAt)))
    .limit(1);
  return Boolean(email);
}

async function isBlockedInTransaction(tx: SocialTransaction, firstId: string, secondId: string): Promise<boolean> {
  const [block] = await tx
    .select({ blockerId: accountBlocks.blockerId })
    .from(accountBlocks)
    .where(or(
      and(eq(accountBlocks.blockerId, firstId), eq(accountBlocks.blockedId, secondId)),
      and(eq(accountBlocks.blockerId, secondId), eq(accountBlocks.blockedId, firstId)),
    ))
    .limit(1);
  return Boolean(block);
}

function parsePage(request: Request): { limit: number; offset: number } | null {
  const rawLimit = request.query.limit;
  const limit = rawLimit === undefined ? 20 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return null;

  const rawCursor = request.query.cursor;
  if (rawCursor === undefined) return { limit, offset: 0 };
  if (typeof rawCursor !== "string" || rawCursor.length > 32) return null;
  try {
    const decoded = Buffer.from(rawCursor, "base64url").toString("utf8");
    if (!/^(0|[1-9][0-9]{0,6})$/.test(decoded)) return null;
    return { limit, offset: Number(decoded) };
  } catch {
    return null;
  }
}

function pageResult<T>(rows: T[], limit: number, offset: number) {
  const hasMore = rows.length > limit;
  return {
    items: rows.slice(0, limit),
    nextCursor: hasMore ? Buffer.from(String(offset + limit)).toString("base64url") : null,
  };
}

async function canViewRelationshipList(viewerId: string | null, targetId: string, targetIsPrivate: boolean) {
  if (!viewerId) return !targetIsPrivate;
  if (viewerId === targetId) return true;
  if (await isBlockedBetween(viewerId, targetId)) return false;
  if (!targetIsPrivate) return true;
  const [follow] = await db
    .select({ followerId: accountFollows.followerId })
    .from(accountFollows)
    .where(and(eq(accountFollows.followerId, viewerId), eq(accountFollows.followedId, targetId)))
    .limit(1);
  return Boolean(follow);
}

async function getActivePageAccounts(ids: string[], viewerId: string | null) {
  return accountViewsByIds(ids, viewerId);
}

router.get(
  "/accounts",
  createAuthRateLimit("social-account-search", 60, 60_000),
  async (request, response) => {
    const viewerId = await activeAccountId(request, response);
    if (!viewerId) return;

    const rawQuery = typeof request.query.q === "string" ? request.query.q.trim() : "";
    const query = rawQuery.replace(/^@/, "");
    if (query.length < 2 || query.length > 80) {
      sendError(response, 400, "VALIDATION_ERROR", "Busque por pelo menos 2 caracteres.");
      return;
    }

    const page = parsePage(request);
    if (!page) {
      sendError(response, 400, "VALIDATION_ERROR", "O limite ou cursor da página é inválido.");
      return;
    }

    // Search user text literally; PostgreSQL wildcard characters are escaped.
    const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
    const rows = await db
      .select({ id: accounts.id })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(and(
        eq(accounts.status, "active"),
        isNotNull(accountEmails.verifiedAt),
        or(ilike(accounts.username, pattern), ilike(accounts.displayName, pattern)),
      ))
      .orderBy(asc(accounts.username), asc(accounts.id))
      .limit(page.limit + 1)
      .offset(page.offset);

    const pageRows = rows.slice(0, page.limit);
    const accountsById = new Map(
      (await getActivePageAccounts(pageRows.map((row) => row.id), viewerId))
        .map((account) => [account.id, account]),
    );
    const items = pageRows.flatMap((row) => {
      const account = accountsById.get(row.id);
      return account ? [account] : [];
    });
    response.json({
      items,
      nextCursor: rows.length > page.limit
        ? Buffer.from(String(page.offset + page.limit)).toString("base64url")
        : null,
    });
  },
);

async function requireVisibleTarget(
  request: Request,
  response: Response,
  accountId: string,
) {
  const target = await findActiveAccountById(accountId);
  if (!target) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Esta conta não está disponível.");
    return null;
  }
  const session = await loadActiveSession(request);
  const viewerId = session?.accountId ?? null;
  if (viewerId && await isBlockedBetween(viewerId, accountId)) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Esta conta não está disponível.");
    return null;
  }
  if (!await canViewRelationshipList(viewerId, accountId, target.isPrivate)) {
    sendError(response, 403, "PRIVATE_PROFILE", "A lista não está disponível para este perfil.");
    return null;
  }
  return { target, viewerId };
}

router.get("/accounts/:accountId/followers", async (request, response) => {
  const accountId = typeof request.params.accountId === "string" ? request.params.accountId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(accountId)) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Esta conta não está disponível.");
    return;
  }
  const target = await requireVisibleTarget(request, response, accountId);
  if (!target) return;
  const page = parsePage(request);
  if (!page) {
    sendError(response, 400, "VALIDATION_ERROR", "O limite ou cursor da página é inválido.");
    return;
  }
  const rows = await db
    .select({ id: accountFollows.followerId })
    .from(accountFollows)
    .innerJoin(accounts, eq(accounts.id, accountFollows.followerId))
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      eq(accountFollows.followedId, accountId),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ))
    .orderBy(desc(accountFollows.createdAt))
    .limit(page.limit + 1)
    .offset(page.offset);
  const items = await getActivePageAccounts(rows.map((row) => row.id), target.viewerId);
  response.json(pageResult(items, page.limit, page.offset));
});

router.get("/accounts/:accountId/following", async (request, response) => {
  const accountId = typeof request.params.accountId === "string" ? request.params.accountId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(accountId)) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Esta conta não está disponível.");
    return;
  }
  const target = await requireVisibleTarget(request, response, accountId);
  if (!target) return;
  const page = parsePage(request);
  if (!page) {
    sendError(response, 400, "VALIDATION_ERROR", "O limite ou cursor da página é inválido.");
    return;
  }
  const rows = await db
    .select({ id: accountFollows.followedId })
    .from(accountFollows)
    .innerJoin(accounts, eq(accounts.id, accountFollows.followedId))
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      eq(accountFollows.followerId, accountId),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ))
    .orderBy(desc(accountFollows.createdAt))
    .limit(page.limit + 1)
    .offset(page.offset);
  const items = await getActivePageAccounts(rows.map((row) => row.id), target.viewerId);
  response.json(pageResult(items, page.limit, page.offset));
});

router.put(
  "/accounts/:accountId/follow",
  createAuthRateLimit("social-follow", 60, 60_000),
  requireCsrf,
  async (request, response) => {
    const actorId = await activeAccountId(request, response);
    if (!actorId) return;
    const targetId = typeof request.params.accountId === "string" ? request.params.accountId : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
      sendError(response, 404, "ACCOUNT_NOT_FOUND", "Esta conta não está disponível.");
      return;
    }
    if (actorId === targetId) {
      sendError(response, 400, "INVALID_RELATIONSHIP", "Não é possível seguir a própria conta.");
      return;
    }
    const result = await db.transaction(async (tx) => {
      const lockedAccounts = await lockRelationshipAccounts(tx, actorId, targetId);
      const actor = lockedAccounts.find((account) => account.id === actorId);
      const target = lockedAccounts.find((account) => account.id === targetId);
      if (
        lockedAccounts.length !== 2
        || !await hasVerifiedActiveAccount(tx, actor)
        || !await hasVerifiedActiveAccount(tx, target)
        || await isBlockedInTransaction(tx, actorId, targetId)
      ) return null;

      const [existingFollow] = await tx
        .select({ createdAt: accountFollows.createdAt })
        .from(accountFollows)
        .where(and(eq(accountFollows.followerId, actorId), eq(accountFollows.followedId, targetId)))
        .limit(1);
      if (existingFollow) {
        return { status: "accepted", updatedAt: existingFollow.createdAt.toISOString() };
      }

      if (target?.isPrivate) {
        const [existingRequest] = await tx
          .select({ createdAt: accountFollowRequests.createdAt })
          .from(accountFollowRequests)
          .where(and(
            eq(accountFollowRequests.requesterId, actorId),
            eq(accountFollowRequests.targetId, targetId),
          ))
          .limit(1);
        if (existingRequest) {
          return { status: "pending", updatedAt: existingRequest.createdAt.toISOString() };
        }
        const [created] = await tx
          .insert(accountFollowRequests)
          .values({ requesterId: actorId, targetId })
          .onConflictDoNothing()
          .returning({ createdAt: accountFollowRequests.createdAt });
        return { status: "pending", updatedAt: (created?.createdAt ?? new Date()).toISOString() };
      }

      const [created] = await tx
        .insert(accountFollows)
        .values({ followerId: actorId, followedId: targetId })
        .onConflictDoNothing()
        .returning({ createdAt: accountFollows.createdAt });
      await tx.delete(accountFollowRequests).where(and(
        eq(accountFollowRequests.requesterId, actorId),
        eq(accountFollowRequests.targetId, targetId),
      ));
      return { status: "accepted", updatedAt: (created?.createdAt ?? new Date()).toISOString() };
    });
    if (!result) {
      sendError(response, 404, "ACCOUNT_NOT_FOUND", "Esta conta não está disponível.");
      return;
    }
    response.json(result);
  },
);

router.delete("/accounts/:accountId/follow", requireCsrf, async (request, response) => {
  const actorId = await activeAccountId(request, response);
  if (!actorId) return;
  const targetId = typeof request.params.accountId === "string" ? request.params.accountId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Esta conta não está disponível.");
    return;
  }
  await db.transaction(async (tx) => {
    if ((await lockRelationshipAccounts(tx, actorId, targetId)).length !== 2) return;
    await tx.delete(accountFollows).where(and(
      eq(accountFollows.followerId, actorId),
      eq(accountFollows.followedId, targetId),
    ));
    await tx.delete(accountFollowRequests).where(and(
      eq(accountFollowRequests.requesterId, actorId),
      eq(accountFollowRequests.targetId, targetId),
    ));
  });
  response.status(204).end();
});

router.get("/follow-requests", async (request, response) => {
  const actorId = await activeAccountId(request, response);
  if (!actorId) return;
  const page = parsePage(request);
  if (!page) {
    sendError(response, 400, "VALIDATION_ERROR", "O limite ou cursor da página é inválido.");
    return;
  }
  const rows = await db
    .select({ id: accountFollowRequests.requesterId, createdAt: accountFollowRequests.createdAt })
    .from(accountFollowRequests)
    .innerJoin(accounts, eq(accounts.id, accountFollowRequests.requesterId))
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      eq(accountFollowRequests.targetId, actorId),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ))
    .orderBy(desc(accountFollowRequests.createdAt))
    .limit(page.limit + 1)
    .offset(page.offset);
  const pageRows = rows.slice(0, page.limit);
  const accountsById = new Map((await accountViewsByIds(pageRows.map((row) => row.id), actorId)).map((account) => [account.id, account]));
  const items = pageRows.flatMap((row) => {
    const account = accountsById.get(row.id);
    return account ? [{ account, createdAt: row.createdAt.toISOString() }] : [];
  });
  response.json(pageResult(items, page.limit, page.offset));
});

router.post("/follow-requests/:accountId/accept", requireCsrf, async (request, response) => {
  const actorId = await activeAccountId(request, response);
  if (!actorId) return;
  const requesterId = typeof request.params.accountId === "string" ? request.params.accountId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requesterId)) {
    sendError(response, 404, "FOLLOW_REQUEST_NOT_FOUND", "Solicitação não encontrada.");
    return;
  }
  if (requesterId === actorId) {
    sendError(response, 404, "FOLLOW_REQUEST_NOT_FOUND", "Solicitação não encontrada.");
    return;
  }
  const accepted = await db.transaction(async (tx) => {
    const lockedAccounts = await lockRelationshipAccounts(tx, actorId, requesterId);
    const actor = lockedAccounts.find((account) => account.id === actorId);
    const requester = lockedAccounts.find((account) => account.id === requesterId);
    if (
      lockedAccounts.length !== 2
      || !await hasVerifiedActiveAccount(tx, actor)
      || !await hasVerifiedActiveAccount(tx, requester)
      || await isBlockedInTransaction(tx, actorId, requesterId)
    ) return false;
    const [pending] = await tx
      .select({ createdAt: accountFollowRequests.createdAt })
      .from(accountFollowRequests)
      .where(and(
        eq(accountFollowRequests.requesterId, requesterId),
        eq(accountFollowRequests.targetId, actorId),
      ))
      .limit(1);
    if (!pending) return false;
    await tx.insert(accountFollows)
      .values({ followerId: requesterId, followedId: actorId })
      .onConflictDoNothing();
    await tx.delete(accountFollowRequests).where(and(
      eq(accountFollowRequests.requesterId, requesterId),
      eq(accountFollowRequests.targetId, actorId),
    ));
    return true;
  });
  if (!accepted) {
    sendError(response, 404, "FOLLOW_REQUEST_NOT_FOUND", "Solicitação não encontrada.");
    return;
  }
  response.json({ status: "accepted", updatedAt: new Date().toISOString() });
});

router.post("/follow-requests/:accountId/decline", requireCsrf, async (request, response) => {
  const actorId = await activeAccountId(request, response);
  if (!actorId) return;
  const requesterId = typeof request.params.accountId === "string" ? request.params.accountId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requesterId)) {
    sendError(response, 404, "FOLLOW_REQUEST_NOT_FOUND", "Solicitação não encontrada.");
    return;
  }
  await db.transaction(async (tx) => {
    if ((await lockRelationshipAccounts(tx, actorId, requesterId)).length !== 2) return;
    await tx.delete(accountFollowRequests).where(and(
      eq(accountFollowRequests.requesterId, requesterId),
      eq(accountFollowRequests.targetId, actorId),
    ));
  });
  response.status(204).end();
});

router.get("/circles", async (request, response) => {
  const actorId = await activeAccountId(request, response);
  if (!actorId) return;
  const page = parsePage(request);
  if (!page) {
    sendError(response, 400, "VALIDATION_ERROR", "O limite ou cursor da página é inválido.");
    return;
  }
  const rows = await db
    .select({ id: accountFollows.followedId })
    .from(accountFollows)
    .innerJoin(accounts, eq(accounts.id, accountFollows.followedId))
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      eq(accountFollows.followerId, actorId),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
      sql`exists (
        select 1 from ${accountFollows} reciprocal
        where reciprocal.follower_id = ${accountFollows.followedId}
          and reciprocal.followed_id = ${actorId}
      )`,
    ))
    .orderBy(desc(accountFollows.createdAt))
    .limit(page.limit + 1)
    .offset(page.offset);
  const items = (await getActivePageAccounts(rows.map((row) => row.id), actorId))
    .map((account) => ({ account, isMutual: true }));
  response.json(pageResult(items, page.limit, page.offset));
});

router.get("/blocks", async (request, response) => {
  const actorId = await activeAccountId(request, response);
  if (!actorId) return;
  const rows = await db
    .select({ id: accountBlocks.blockedId })
    .from(accountBlocks)
    .where(eq(accountBlocks.blockerId, actorId))
    .orderBy(desc(accountBlocks.createdAt));
  const items = [];
  for (const row of rows) {
    const account = await findActiveAccountById(row.id);
    if (account) items.push(await accountView(account, actorId));
  }
  response.json({ items, nextCursor: null });
});

router.put(
  "/blocks/:accountId",
  createAuthRateLimit("social-block", 30, 60_000),
  requireCsrf,
  async (request, response) => {
    const actorId = await activeAccountId(request, response);
    if (!actorId) return;
    const targetId = typeof request.params.accountId === "string" ? request.params.accountId : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
      sendError(response, 404, "ACCOUNT_NOT_FOUND", "Esta conta não está disponível.");
      return;
    }
    if (actorId === targetId) {
      sendError(response, 404, "ACCOUNT_NOT_FOUND", "Esta conta não está disponível.");
      return;
    }
    const blocked = await db.transaction(async (tx) => {
      const lockedAccounts = await lockRelationshipAccounts(tx, actorId, targetId);
      const actor = lockedAccounts.find((account) => account.id === actorId);
      const target = lockedAccounts.find((account) => account.id === targetId);
      if (
        lockedAccounts.length !== 2
        || !await hasVerifiedActiveAccount(tx, actor)
        || !await hasVerifiedActiveAccount(tx, target)
      ) return false;
      await tx.insert(accountBlocks).values({ blockerId: actorId, blockedId: targetId }).onConflictDoNothing();
      await tx.delete(accountFollows).where(sql`(
        (${accountFollows.followerId} = ${actorId} and ${accountFollows.followedId} = ${targetId})
        or (${accountFollows.followerId} = ${targetId} and ${accountFollows.followedId} = ${actorId})
      )`);
      await tx.delete(accountFollowRequests).where(sql`(
        (${accountFollowRequests.requesterId} = ${actorId} and ${accountFollowRequests.targetId} = ${targetId})
        or (${accountFollowRequests.requesterId} = ${targetId} and ${accountFollowRequests.targetId} = ${actorId})
      )`);
      return true;
    });
    if (!blocked) {
      sendError(response, 404, "ACCOUNT_NOT_FOUND", "Esta conta não está disponível.");
      return;
    }
    response.status(204).end();
  },
);

router.delete("/blocks/:accountId", requireCsrf, async (request, response) => {
  const actorId = await activeAccountId(request, response);
  if (!actorId) return;
  const targetId = typeof request.params.accountId === "string" ? request.params.accountId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Esta conta não está disponível.");
    return;
  }
  await db.transaction(async (tx) => {
    if ((await lockRelationshipAccounts(tx, actorId, targetId)).length !== 2) return;
    await tx.delete(accountBlocks).where(and(
      eq(accountBlocks.blockerId, actorId),
      eq(accountBlocks.blockedId, targetId),
    ));
  });
  response.status(204).end();
});

export default router;
