import { and, count, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { accountEmails, accountFollows, accountFollowRequests, accountBlocks, accounts, db } from "@workspace/db";
import { accountPatchSchema, privacyWriteSchema } from "@workspace/api-zod";
import { createAuthRateLimit, loadActiveSession, requireCsrf } from "../lib/auth/security";

const router: IRouter = Router();
const emptyPage = { items: [], nextCursor: null };

type PublicAccountRow = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  locationLabel: string | null;
  websiteUrl: string | null;
  accountType: string;
  isPrivate: boolean;
  isVerified: boolean;
  createdAt: Date;
  version: number;
};

type RelationshipView = {
  following: "none" | "pending" | "accepted";
  inCircle: boolean;
  blockedByMe: boolean;
  blockedByThem: boolean;
  mutedByMe: boolean;
};

function sendError(response: Response, status: number, code: string, message: string): void {
  response.status(status).json({ error: { code, message } });
}

async function activeAccountId(request: Request, response: Response): Promise<string | null> {
  const session = await loadActiveSession(request);
  if (!session) {
    sendError(response, 401, "UNAUTHENTICATED", "Entre com uma conta verificada para continuar.");
    return null;
  }
  return session.accountId;
}

export async function findActiveAccountById(id: string): Promise<PublicAccountRow | null> {
  const [row] = await db
    .select({
      id: accounts.id,
      username: accounts.username,
      displayName: accounts.displayName,
      bio: accounts.bio,
      locationLabel: accounts.locationLabel,
      websiteUrl: accounts.websiteUrl,
      accountType: accounts.accountType,
      isPrivate: accounts.isPrivate,
      isVerified: accounts.isVerified,
      createdAt: accounts.createdAt,
      version: accounts.version,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      eq(accounts.id, id),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ))
    .limit(1);
  return row ?? null;
}

async function findActiveAccountByUsername(username: string): Promise<PublicAccountRow | null> {
  const [row] = await db
    .select({
      id: accounts.id,
      username: accounts.username,
      displayName: accounts.displayName,
      bio: accounts.bio,
      locationLabel: accounts.locationLabel,
      websiteUrl: accounts.websiteUrl,
      accountType: accounts.accountType,
      isPrivate: accounts.isPrivate,
      isVerified: accounts.isVerified,
      createdAt: accounts.createdAt,
      version: accounts.version,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      eq(accounts.username, username),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ))
    .limit(1);
  return row ?? null;
}

async function relationshipFor(viewerId: string | null, targetId: string): Promise<RelationshipView> {
  if (!viewerId || viewerId === targetId) {
    return { following: "none", inCircle: false, blockedByMe: false, blockedByThem: false, mutedByMe: false };
  }

  const [acceptedFollow, pendingRequest, reciprocalFollow, blockedByMe, blockedByThem] = await Promise.all([
    db.select({ followerId: accountFollows.followerId })
      .from(accountFollows)
      .where(and(eq(accountFollows.followerId, viewerId), eq(accountFollows.followedId, targetId)))
      .limit(1),
    db.select({ requesterId: accountFollowRequests.requesterId })
      .from(accountFollowRequests)
      .where(and(eq(accountFollowRequests.requesterId, viewerId), eq(accountFollowRequests.targetId, targetId)))
      .limit(1),
    db.select({ followerId: accountFollows.followerId })
      .from(accountFollows)
      .where(and(eq(accountFollows.followerId, targetId), eq(accountFollows.followedId, viewerId)))
      .limit(1),
    db.select({ blockerId: accountBlocks.blockerId })
      .from(accountBlocks)
      .where(and(eq(accountBlocks.blockerId, viewerId), eq(accountBlocks.blockedId, targetId)))
      .limit(1),
    db.select({ blockerId: accountBlocks.blockerId })
      .from(accountBlocks)
      .where(and(eq(accountBlocks.blockerId, targetId), eq(accountBlocks.blockedId, viewerId)))
      .limit(1),
  ]);
  const following = acceptedFollow.length ? "accepted" : pendingRequest.length ? "pending" : "none";
  return {
    following,
    inCircle: following === "accepted" && reciprocalFollow.length > 0,
    blockedByMe: blockedByMe.length > 0,
    blockedByThem: blockedByThem.length > 0,
    mutedByMe: false,
  };
}

async function accountStats(accountId: string) {
  const [followers, following, circles] = await Promise.all([
    db.select({ total: count() }).from(accountFollows).where(eq(accountFollows.followedId, accountId)),
    db.select({ total: count() }).from(accountFollows).where(eq(accountFollows.followerId, accountId)),
    db.select({ total: sql<number>`count(*)::int` })
      .from(accountFollows)
      .where(and(
        eq(accountFollows.followerId, accountId),
        sql`exists (
          select 1 from account_follows reciprocal
          where reciprocal.follower_id = ${accountFollows.followedId}
            and reciprocal.followed_id = ${accountId}
        )`,
      )),
  ]);
  return {
    posts: 0,
    followers: followers[0]?.total ?? 0,
    following: following[0]?.total ?? 0,
    circles: circles[0]?.total ?? 0,
  };
}

function buildAccountView(
  row: PublicAccountRow,
  viewerId: string | null,
  relationship: RelationshipView,
  stats: { posts: number; followers: number; following: number; circles: number },
) {
  const privateDetailsVisible = !row.isPrivate
    || viewerId === row.id
    || relationship.following === "accepted";
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    bio: privateDetailsVisible ? row.bio : "",
    avatarUrl: null,
    coverUrl: null,
    location: privateDetailsVisible ? row.locationLabel : null,
    website: privateDetailsVisible ? row.websiteUrl : null,
    accountType: row.accountType,
    isPrivate: row.isPrivate,
    isVerified: row.isVerified,
    joinedAt: row.createdAt.toISOString(),
    relationship,
    stats,
    version: row.version,
  };
}

export async function accountView(row: PublicAccountRow, viewerId: string | null) {
  const [relationship, stats] = await Promise.all([
    relationshipFor(viewerId, row.id),
    accountStats(row.id),
  ]);
  return buildAccountView(row, viewerId, relationship, stats);
}

export async function accountViewsByIds(ids: string[], viewerId: string | null) {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return [];

  const rows = await db
    .select({
      id: accounts.id,
      username: accounts.username,
      displayName: accounts.displayName,
      bio: accounts.bio,
      locationLabel: accounts.locationLabel,
      websiteUrl: accounts.websiteUrl,
      accountType: accounts.accountType,
      isPrivate: accounts.isPrivate,
      isVerified: accounts.isVerified,
      createdAt: accounts.createdAt,
      version: accounts.version,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      inArray(accounts.id, uniqueIds),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ));
  if (rows.length === 0) return [];

  const idsToQuery = rows.map((row) => row.id);
  const [followerCounts, followingCounts, circleCounts] = await Promise.all([
    db.select({ id: accountFollows.followedId, total: count() })
      .from(accountFollows)
      .where(inArray(accountFollows.followedId, idsToQuery))
      .groupBy(accountFollows.followedId),
    db.select({ id: accountFollows.followerId, total: count() })
      .from(accountFollows)
      .where(inArray(accountFollows.followerId, idsToQuery))
      .groupBy(accountFollows.followerId),
    db.select({ id: accountFollows.followerId, total: count() })
      .from(accountFollows)
      .where(and(
        inArray(accountFollows.followerId, idsToQuery),
        sql`exists (
          select 1 from account_follows reciprocal
          where reciprocal.follower_id = ${accountFollows.followedId}
            and reciprocal.followed_id = ${accountFollows.followerId}
        )`,
      ))
      .groupBy(accountFollows.followerId),
  ]);

  const followingSet = new Set<string>();
  const pendingSet = new Set<string>();
  const reciprocalSet = new Set<string>();
  const blockedByMeSet = new Set<string>();
  const blockedByThemSet = new Set<string>();
  if (viewerId) {
    const [outgoing, pending, incoming, blockedByMe, blockedByThem] = await Promise.all([
      db.select({ id: accountFollows.followedId }).from(accountFollows)
        .where(and(eq(accountFollows.followerId, viewerId), inArray(accountFollows.followedId, idsToQuery))),
      db.select({ id: accountFollowRequests.targetId }).from(accountFollowRequests)
        .where(and(eq(accountFollowRequests.requesterId, viewerId), inArray(accountFollowRequests.targetId, idsToQuery))),
      db.select({ id: accountFollows.followerId }).from(accountFollows)
        .where(and(inArray(accountFollows.followerId, idsToQuery), eq(accountFollows.followedId, viewerId))),
      db.select({ id: accountBlocks.blockedId }).from(accountBlocks)
        .where(and(eq(accountBlocks.blockerId, viewerId), inArray(accountBlocks.blockedId, idsToQuery))),
      db.select({ id: accountBlocks.blockerId }).from(accountBlocks)
        .where(and(inArray(accountBlocks.blockerId, idsToQuery), eq(accountBlocks.blockedId, viewerId))),
    ]);
    for (const row of outgoing) followingSet.add(row.id);
    for (const row of pending) pendingSet.add(row.id);
    for (const row of incoming) reciprocalSet.add(row.id);
    for (const row of blockedByMe) blockedByMeSet.add(row.id);
    for (const row of blockedByThem) blockedByThemSet.add(row.id);
  }
  const followers = new Map(followerCounts.map((row) => [row.id, row.total]));
  const following = new Map(followingCounts.map((row) => [row.id, row.total]));
  const circles = new Map(circleCounts.map((row) => [row.id, row.total]));
  const byId = new Map<string, ReturnType<typeof buildAccountView>>();
  for (const row of rows) {
    if (blockedByMeSet.has(row.id) || blockedByThemSet.has(row.id)) continue;
    const isFollowing = followingSet.has(row.id);
    const relationship: RelationshipView = {
      following: isFollowing ? "accepted" : pendingSet.has(row.id) ? "pending" : "none",
      inCircle: isFollowing && reciprocalSet.has(row.id),
      blockedByMe: blockedByMeSet.has(row.id),
      blockedByThem: blockedByThemSet.has(row.id),
      mutedByMe: false,
    };
    byId.set(row.id, buildAccountView(row, viewerId, relationship, {
      posts: 0,
      followers: followers.get(row.id) ?? 0,
      following: following.get(row.id) ?? 0,
      circles: circles.get(row.id) ?? 0,
    }));
  }
  return ids.map((id) => byId.get(id)).filter((account) => account !== undefined);
}

export async function isBlockedBetween(firstId: string, secondId: string): Promise<boolean> {
  const rows = await db
    .select({ blockerId: accountBlocks.blockerId })
    .from(accountBlocks)
    .where(and(
      sql`(${accountBlocks.blockerId} = ${firstId} and ${accountBlocks.blockedId} = ${secondId})
        or (${accountBlocks.blockerId} = ${secondId} and ${accountBlocks.blockedId} = ${firstId})`,
    ))
    .limit(1);
  return rows.length > 0;
}

async function respondWithProfile(request: Request, response: Response, row: PublicAccountRow): Promise<void> {
  const session = await loadActiveSession(request);
  const viewerId = session?.accountId ?? null;
  if (viewerId && await isBlockedBetween(viewerId, row.id)) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Este perfil não está disponível.");
    return;
  }
  const relationship = await relationshipFor(viewerId, row.id);
  const canViewPublicContent = !row.isPrivate || viewerId === row.id || relationship.following === "accepted";
  const account = await accountView(row, viewerId);
  response.json({
    account,
    visibility: {
      canViewPublicContent,
      canViewCircleContent: relationship.inCircle || viewerId === row.id,
    },
    posts: emptyPage,
    articles: emptyPage,
    media: emptyPage,
  });
}

router.get("/accounts/availability", createAuthRateLimit("account-availability", 30, 60_000), async (request, response) => {
  const username = typeof request.query.username === "string"
    ? request.query.username.trim().replace(/^@/, "").toLowerCase()
    : "";
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    sendError(response, 400, "VALIDATION_ERROR", "Informe um nome de usuário válido.");
    return;
  }
  const [match] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.username, username)).limit(1);
  response.json({ available: !match, normalizedUsername: username });
});

router.get("/accounts/me", async (request, response) => {
  const accountId = await activeAccountId(request, response);
  if (!accountId) return;
  const row = await findActiveAccountById(accountId);
  if (!row) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Conta não encontrada.");
    return;
  }
  response.json(await accountView(row, accountId));
});

router.patch("/accounts/me", requireCsrf, async (request, response) => {
  const accountId = await activeAccountId(request, response);
  if (!accountId) return;
  const parsed = accountPatchSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Confira os campos do perfil.",
        details: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      },
    });
    return;
  }
  const patch = parsed.data;
  try {
    const [updated] = await db
      .update(accounts)
      .set({
        ...(patch.username === undefined ? {} : { username: patch.username }),
        ...(patch.displayName === undefined ? {} : { displayName: patch.displayName }),
        ...(patch.bio === undefined ? {} : { bio: patch.bio }),
        ...(patch.location === undefined ? {} : { locationLabel: patch.location }),
        ...(patch.website === undefined ? {} : { websiteUrl: patch.website }),
        updatedAt: new Date(),
        version: sql`${accounts.version} + 1`,
      })
      .where(and(eq(accounts.id, accountId), eq(accounts.version, patch.version), eq(accounts.status, "active")))
      .returning({ id: accounts.id });
    if (!updated) {
      sendError(response, 409, "VERSION_CONFLICT", "O perfil mudou em outra solicitação. Atualize e tente novamente.");
      return;
    }
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      sendError(response, 409, "USERNAME_UNAVAILABLE", "Esse nome de usuário não está disponível.");
      return;
    }
    throw error;
  }
  const row = await findActiveAccountById(accountId);
  if (!row) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Conta não encontrada.");
    return;
  }
  response.json(await accountView(row, accountId));
});

router.get("/accounts/me/privacy", async (request, response) => {
  const accountId = await activeAccountId(request, response);
  if (!accountId) return;
  const [row] = await db
    .select({
      isPrivate: accounts.isPrivate,
      messagesPolicy: accounts.messagesPolicy,
      readReceipts: accounts.readReceipts,
      version: accounts.version,
    })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.status, "active")))
    .limit(1);
  if (!row) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Conta não encontrada.");
    return;
  }
  response.json({
    profileVisibility: row.isPrivate ? "private" : "public",
    messages: row.messagesPolicy,
    readReceipts: row.readReceipts,
    version: row.version,
  });
});

router.put("/accounts/me/privacy", requireCsrf, async (request, response) => {
  const accountId = await activeAccountId(request, response);
  if (!accountId) return;
  const parsed = privacyWriteSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Confira as opções de privacidade.",
        details: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      },
    });
    return;
  }
  const [updated] = await db
    .update(accounts)
    .set({
      isPrivate: parsed.data.profileVisibility === "private",
      messagesPolicy: parsed.data.messages,
      readReceipts: parsed.data.readReceipts,
      updatedAt: new Date(),
      version: sql`${accounts.version} + 1`,
    })
    .where(and(eq(accounts.id, accountId), eq(accounts.version, parsed.data.version), eq(accounts.status, "active")))
    .returning({ version: accounts.version });
  if (!updated) {
    sendError(response, 409, "VERSION_CONFLICT", "As configurações mudaram. Atualize a página e tente novamente.");
    return;
  }
  response.json({
    profileVisibility: parsed.data.profileVisibility,
    messages: parsed.data.messages,
    readReceipts: parsed.data.readReceipts,
    version: updated.version,
  });
});

router.get("/profiles/:username", async (request, response) => {
  const username = typeof request.params.username === "string" ? request.params.username.toLowerCase() : "";
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Este perfil não está disponível.");
    return;
  }
  const row = await findActiveAccountByUsername(username);
  if (!row) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Este perfil não está disponível.");
    return;
  }
  await respondWithProfile(request, response, row);
});

router.get("/accounts/:accountId", async (request, response) => {
  const accountId = typeof request.params.accountId === "string" ? request.params.accountId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(accountId)) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Este perfil não está disponível.");
    return;
  }
  const row = await findActiveAccountById(accountId);
  if (!row) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Este perfil não está disponível.");
    return;
  }
  const session = await loadActiveSession(request);
  const viewerId = session?.accountId ?? null;
  if (viewerId && await isBlockedBetween(viewerId, accountId)) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Este perfil não está disponível.");
    return;
  }
  response.json(await accountView(row, viewerId));
});

export default router;
