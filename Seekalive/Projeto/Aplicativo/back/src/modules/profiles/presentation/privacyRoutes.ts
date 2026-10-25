import { and, eq, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { accounts, db } from "@workspace/db";
import { privacyWriteSchema } from "@workspace/api-zod";
import { requireCsrf } from "../../../security/session";
import { activeAccountId, sendError } from "./routeSupport";

const router: IRouter = Router();

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
        requestId: response.locals.requestId ?? "unknown",
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
    .where(and(
      eq(accounts.id, accountId),
      eq(accounts.version, parsed.data.version),
      eq(accounts.status, "active"),
    ))
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

export default router;
