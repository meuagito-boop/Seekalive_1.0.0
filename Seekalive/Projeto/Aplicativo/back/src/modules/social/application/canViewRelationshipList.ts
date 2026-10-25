import { and, eq } from "drizzle-orm";
import { accountFollows, db } from "@workspace/db";
import { isBlockedBetween } from "./isBlockedBetween";

export async function canViewRelationshipList(
  viewerId: string | null,
  targetId: string,
  targetIsPrivate: boolean,
): Promise<boolean> {
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
