import { and, desc, eq, isNotNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { accountEmails, accountFollowRequests, accounts, db } from "@workspace/db";
import { accountViewsByIds } from "../../accounts/application/accountViews";
import { activeAccountId, pageResult, parsePage, sendError } from "./routeSupport";

const router: IRouter = Router();

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
  const accountsById = new Map(
    (await accountViewsByIds(pageRows.map((row) => row.id), actorId))
      .map((account) => [account.id, account]),
  );
  const items = pageRows.flatMap((row) => {
    const account = accountsById.get(row.id);
    return account ? [{ account, createdAt: row.createdAt.toISOString() }] : [];
  });
  response.json(pageResult(items, page.limit, page.offset));
});

export default router;
