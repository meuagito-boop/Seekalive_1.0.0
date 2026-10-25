import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { accountBlocks, db } from "@workspace/db";
import { accountView, findActiveAccountById } from "../../profiles/application/accountViews";
import { activeAccountId } from "./routeSupport";

const router: IRouter = Router();

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

export default router;
