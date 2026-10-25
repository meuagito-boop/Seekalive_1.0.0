import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { accountEmails, accountFollows, accounts, db } from "@workspace/db";
import { accountViewsByIds } from "../../accounts/application/accountViews";
import { activeAccountId, pageResult, parsePage, sendError } from "./routeSupport";

const router: IRouter = Router();

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
  const items = (await accountViewsByIds(rows.map((row) => row.id), actorId))
    .map((account) => ({ account, isMutual: true }));
  response.json(pageResult(items, page.limit, page.offset));
});

export default router;
