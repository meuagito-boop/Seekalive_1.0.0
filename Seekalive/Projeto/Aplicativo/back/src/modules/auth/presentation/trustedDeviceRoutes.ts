import { Router, type IRouter } from "express";
import { trustedDeviceIdParamSchema } from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../security/request-origin";
import {
  clearDeviceCookie,
  clearSessionCookie,
  loadActiveSession,
  PRE_AUTH_COOKIE,
  requireCsrf,
} from "../../../security/session";
import {
  listTrustedDevices,
  revokeOtherTrustedDevices,
  revokeTrustedDevice,
} from "../application/trustedDevices/deviceManagement";
import { sendError, sendValidationError } from "./responses";

const router: IRouter = Router();

router.get("/devices", createAuthRateLimit("devices-list", 60, 15 * 60 * 1000), async (request, response) => {
  const activeSession = await loadActiveSession(request);
  if (!activeSession) {
    sendError(response, 401, "AUTH_REQUIRED", "Entre novamente para gerenciar as instalações confiáveis.");
    return;
  }

  const rows = await listTrustedDevices(activeSession.accountId);

  response.json({
    items: rows.slice(0, 100).map((device) => ({
      id: device.id,
      firstSeenAt: device.createdAt.toISOString(),
      lastSeenAt: device.lastSeenAt.toISOString(),
      isCurrent: device.id === activeSession.deviceId,
    })),
    hasMore: rows.length > 100,
  });
});

router.delete("/devices/others", createAuthRateLimit("devices-revoke-others", 10, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const activeSession = await loadActiveSession(request);
  if (!activeSession) {
    sendError(response, 401, "AUTH_REQUIRED", "Entre novamente para gerenciar as instalações confiáveis.");
    return;
  }

  const revokedDeviceIds = await revokeOtherTrustedDevices(activeSession.accountId, activeSession.deviceId);
  response.json({ status: "other_devices_revoked", revokedCount: revokedDeviceIds.length });
});

router.delete("/devices/:deviceId", createAuthRateLimit("device-revoke", 20, 15 * 60 * 1000), requireCsrf, async (request, response) => {
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

  const result = await revokeTrustedDevice(
    activeSession.accountId,
    params.data.deviceId,
    activeSession.deviceId,
  );
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
});

export default router;
