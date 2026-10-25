import { and, asc, eq, ilike, isNotNull, or } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { accountEmails, accounts, db } from "@workspace/db";
import { createAuthRateLimit } from "../../../security/request-origin";
import { accountViewsByIds } from "../../accounts/application/accountViews";
import { activeAccountId, parsePage, sendError } from "./routeSupport";

const router: IRouter = Router();

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
      (await accountViewsByIds(pageRows.map((row) => row.id), viewerId))
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

export default router;
