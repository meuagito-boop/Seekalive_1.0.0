import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, sessions, trustedDevices } from "@workspace/db";
import { createAuthRateLimit } from "../../../../security/request-origin";
import { loadActiveSession, requireCsrf } from "../../../../security/session";
import { sendError } from "../responses";

const router: IRouter = Router();

router.delete(
  "/devices/others",
  createAuthRateLimit("devices-revoke-others", 10, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const activeSession = await loadActiveSession(request);
    if (!activeSession) {
      sendError(response, 401, "AUTH_REQUIRED", "Entre novamente para gerenciar as instalações confiáveis.");
      return;
    }

    const now = new Date();
    const revokedDeviceIds = await db.transaction(async (tx) => {
      const revoked = await tx
        .update(trustedDevices)
        .set({ revokedAt: now })
        .where(and(
          eq(trustedDevices.accountId, activeSession.accountId),
          ne(trustedDevices.id, activeSession.deviceId),
          isNull(trustedDevices.revokedAt),
        ))
        .returning({ id: trustedDevices.id });
      if (revoked.length > 0) {
        await tx
          .update(sessions)
          .set({ revokedAt: now })
          .where(and(
            eq(sessions.accountId, activeSession.accountId),
            inArray(sessions.deviceId, revoked.map((device) => device.id)),
            isNull(sessions.revokedAt),
          ));
      }
      return revoked.map((device) => device.id);
    });
    response.json({ status: "other_devices_revoked", revokedCount: revokedDeviceIds.length });
  },
);

export default router;
