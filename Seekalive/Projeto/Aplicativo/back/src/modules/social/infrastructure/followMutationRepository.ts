import { and, eq } from "drizzle-orm";
import { accountFollows, accountFollowRequests, db } from "@workspace/db";
import {
  hasVerifiedActiveAccount,
  isBlockedInTransaction,
  lockRelationshipAccounts,
} from "./relationshipTransactionSupport";
import {
  canAcceptFollowRequest,
  canStartFollow,
  decideFollowTransition,
} from "../domain/relationshipPolicies";

export async function persistFollowAccount(actorId: string, targetId: string) {
  return db.transaction(async (tx) => {
    const lockedAccounts = await lockRelationshipAccounts(tx, actorId, targetId);
    const actor = lockedAccounts.find((account) => account.id === actorId);
    const target = lockedAccounts.find((account) => account.id === targetId);
    const accountsExist = lockedAccounts.length === 2;
    const actorIsEligible = accountsExist && await hasVerifiedActiveAccount(tx, actor);
    const targetIsEligible = accountsExist && await hasVerifiedActiveAccount(tx, target);
    const blocked = actorIsEligible && targetIsEligible
      ? await isBlockedInTransaction(tx, actorId, targetId)
      : false;
    if (!canStartFollow({ actorIsEligible, targetIsEligible, blocked })) return null;

    const [existingFollow] = await tx
      .select({ createdAt: accountFollows.createdAt })
      .from(accountFollows)
      .where(and(eq(accountFollows.followerId, actorId), eq(accountFollows.followedId, targetId)))
      .limit(1);
    let existingRequestAt: string | null = null;
    if (!existingFollow && target?.isPrivate) {
      const [existingRequest] = await tx
        .select({ createdAt: accountFollowRequests.createdAt })
        .from(accountFollowRequests)
        .where(and(
          eq(accountFollowRequests.requesterId, actorId),
          eq(accountFollowRequests.targetId, targetId),
        ))
        .limit(1);
      existingRequestAt = existingRequest?.createdAt.toISOString() ?? null;
    }

    const decision = decideFollowTransition({
      actorIsEligible,
      targetIsEligible,
      blocked,
      targetIsPrivate: target?.isPrivate ?? false,
      existingFollowAt: existingFollow?.createdAt.toISOString() ?? null,
      existingRequestAt,
    });
    if (decision.kind === "unavailable") return null;
    if (decision.kind === "already_following") {
      return { status: "accepted" as const, updatedAt: decision.updatedAt };
    }
    if (decision.kind === "request_pending") {
      return { status: "pending" as const, updatedAt: decision.updatedAt };
    }
    if (decision.kind === "create_request") {
      const [created] = await tx
        .insert(accountFollowRequests)
        .values({ requesterId: actorId, targetId })
        .onConflictDoNothing()
        .returning({ createdAt: accountFollowRequests.createdAt });
      return { status: "pending" as const, updatedAt: (created?.createdAt ?? new Date()).toISOString() };
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
    return { status: "accepted" as const, updatedAt: (created?.createdAt ?? new Date()).toISOString() };
  });
}

export async function persistUnfollowAccount(actorId: string, targetId: string): Promise<void> {
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
}

export async function persistFollowRequestAcceptance(
  targetId: string,
  requesterId: string,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const lockedAccounts = await lockRelationshipAccounts(tx, targetId, requesterId);
    const target = lockedAccounts.find((account) => account.id === targetId);
    const requester = lockedAccounts.find((account) => account.id === requesterId);
    const accountsExist = lockedAccounts.length === 2;
    const targetIsEligible = accountsExist && await hasVerifiedActiveAccount(tx, target);
    const requesterIsEligible = accountsExist && await hasVerifiedActiveAccount(tx, requester);
    const blocked = targetIsEligible && requesterIsEligible
      ? await isBlockedInTransaction(tx, targetId, requesterId)
      : false;
    const [pending] = await tx
      .select({ createdAt: accountFollowRequests.createdAt })
      .from(accountFollowRequests)
      .where(and(
        eq(accountFollowRequests.requesterId, requesterId),
        eq(accountFollowRequests.targetId, targetId),
      ))
      .limit(1);
    if (!canAcceptFollowRequest({
      targetIsEligible,
      requesterIsEligible,
      blocked,
      requestExists: Boolean(pending),
    })) return false;
    await tx.insert(accountFollows)
      .values({ followerId: requesterId, followedId: targetId })
      .onConflictDoNothing();
    await tx.delete(accountFollowRequests).where(and(
      eq(accountFollowRequests.requesterId, requesterId),
      eq(accountFollowRequests.targetId, targetId),
    ));
    return true;
  });
}

export async function persistFollowRequestDecline(
  targetId: string,
  requesterId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    if ((await lockRelationshipAccounts(tx, targetId, requesterId)).length !== 2) return;
    await tx.delete(accountFollowRequests).where(and(
      eq(accountFollowRequests.requesterId, requesterId),
      eq(accountFollowRequests.targetId, targetId),
    ));
  });
}
