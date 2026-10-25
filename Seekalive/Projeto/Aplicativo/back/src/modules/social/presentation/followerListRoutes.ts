import { and, desc, eq, isNotNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { accountEmails, accountFollows, accounts, db } from "@workspace/db";
import { accountViewsByIds } from "../../profiles/application/accountViews";
import { isAccountId, pageResult, parsePage, sendError } from "./routeSupport";
import { requireVisibleRelationshipTarget } from "./relationshipListSupport";

const router: IRouter = Router();

router.get("/accounts/:accountId/followers", async (request, response) => {
  const accountId = typeof request.params.accountId === "string" ? request.params.accountId : "";
  if (!isAccountId(accountId)) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Esta conta não está disponível.");
    return;
  }
  const target = await requireVisibleRelationshipTarget(request, response, accountId);
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
  const items = await accountViewsByIds(rows.map((row) => row.id), target.viewerId);
  response.json(pageResult(items, page.limit, page.offset));
});

export default router;
