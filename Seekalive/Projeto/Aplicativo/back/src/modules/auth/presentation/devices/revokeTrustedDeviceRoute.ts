import { and, eq, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, sessions, trustedDevices } from "@workspace/db";
import { trustedDeviceIdParamSchema } from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../../security/request-origin";
import {
  clearDeviceCookie,
  clearSessionCookie,
  loadActiveSession,
  PRE_AUTH_COOKIE,
  requireCsrf,
} from "../../../../security/session";
import { sendError, sendValidationError } from "../responses";

const router: IRouter = Router();

router.delete(
  "/devices/:deviceId",
  createAuthRateLimit("device-revoke", 20, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const params = trustedDeviceIdParamSchema.safeParse(request.params);
    if (!params.success) {
      sendValidationError(response, params.error.issues);
      return;
    }
    const activeSession = await loadActiveSession(request);
    if (!activeSession) {
      sendError(response, 401, "AUTH_REQUIRED", "Entre novamente para gerenciar as instalações confiáveis.");
      return;
    }

    const now = new Date();
    const result = await db.transaction(async (tx) => {
      const [revoked] = await tx
        .update(trustedDevices)
        .set({ revokedAt: now })
        .where(and(
          eq(trustedDevices.id, params.data.deviceId),
          eq(trustedDevices.accountId, activeSession.accountId),
          isNull(trustedDevices.revokedAt),
        ))
        .returning({ id: trustedDevices.id });
      if (!revoked) return null;

      await tx
        .update(sessions)
        .set({ revokedAt: now })
        .where(and(
          eq(sessions.accountId, activeSession.accountId),
          eq(sessions.deviceId, revoked.id),
          isNull(sessions.revokedAt),
        ));
      return { isCurrent: revoked.id === activeSession.deviceId };
    });
    if (!result) {
      sendError(response, 404, "DEVICE_NOT_FOUND", "A instalação não foi encontrada ou já foi removida.");
      return;
    }
    if (result.isCurrent) {
      clearSessionCookie(response);
      clearDeviceCookie(response);
      response.clearCookie(PRE_AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    }
    response.status(204).end();
  },
);

export default router;
