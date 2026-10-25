import { and, eq, gt } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { accountUsernameReservations, accounts, db } from "@workspace/db";
import { createAuthRateLimit } from "../../../security/request-origin";
import { sendError } from "./routeSupport";

const router: IRouter = Router();

router.get(
  "/accounts/availability",
  createAuthRateLimit("account-availability", 30, 60_000),
  async (request, response) => {
    const username = typeof request.query.username === "string"
      ? request.query.username.trim().replace(/^@/, "").toLowerCase()
      : "";
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      sendError(response, 400, "VALIDATION_ERROR", "Informe um nome de usuário válido.");
      return;
    }
    const now = new Date();
    const [[match], [reservation]] = await Promise.all([
      db.select({ id: accounts.id }).from(accounts).where(eq(accounts.username, username)).limit(1),
      db.select({ username: accountUsernameReservations.username })
        .from(accountUsernameReservations)
        .where(and(
          eq(accountUsernameReservations.username, username),
          gt(accountUsernameReservations.reservedUntil, now),
        ))
        .limit(1),
    ]);
    response.json({ available: !match && !reservation, normalizedUsername: username });
  },
);

export default router;
