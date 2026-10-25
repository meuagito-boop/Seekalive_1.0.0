import { and, desc, eq, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, trustedDevices } from "@workspace/db";
import { createAuthRateLimit } from "../../../../security/request-origin";
import { loadActiveSession } from "../../../../security/session";
import { sendError } from "../responses";

const router: IRouter = Router();

router.get(
  "/devices",
  createAuthRateLimit("devices-list", 60, 15 * 60 * 1000),
  async (request, response) => {
    const activeSession = await loadActiveSession(request);
    if (!activeSession) {
      sendError(response, 401, "AUTH_REQUIRED", "Entre novamente para gerenciar as instalações confiáveis.");
      return;
    }

    const rows = await db
      .select({
        id: trustedDevices.id,
        createdAt: trustedDevices.createdAt,
        lastSeenAt: trustedDevices.lastSeenAt,
      })
      .from(trustedDevices)
      .where(and(
        eq(trustedDevices.accountId, activeSession.accountId),
        isNull(trustedDevices.revokedAt),
      ))
      .orderBy(desc(trustedDevices.lastSeenAt), desc(trustedDevices.id))
      .limit(101);

    response.json({
      items: rows.slice(0, 100).map((device) => ({
        id: device.id,
        firstSeenAt: device.createdAt.toISOString(),
        lastSeenAt: device.lastSeenAt.toISOString(),
        isCurrent: device.id === activeSession.deviceId,
      })),
      hasMore: rows.length > 100,
    });
  },
);

export default router;
