import {
  GetAuthSessionResponse,
  ListAuthSessionsResponse,
  ListAuthTrustedDevicesResponse,
  RevokeOtherAuthSessionsResponse,
  RevokeOtherAuthTrustedDevicesResponse,
} from "@workspace/api-zod";
import {
  deleteJson,
  getJson,
  postJson,
} from "@/modules/app/api/httpClient";
import type {
  AuthAccount,
  AuthSessionPage,
  CurrentSession,
  TrustedDevicePage,
} from "../types";

export type {
  AuthAccount,
  AuthSessionPage,
  AuthSessionView,
  CurrentSession,
  TrustedDevicePage,
  TrustedDeviceView,
} from "../types";

export function getCurrentSession(): Promise<CurrentSession> {
  return getJson<CurrentSession>("/auth/session", {
    200: GetAuthSessionResponse,
  });
}

export function getAuthSessions(cursor?: string): Promise<AuthSessionPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return getJson<AuthSessionPage>(`/auth/sessions${query}`, {
    200: ListAuthSessionsResponse,
  });
}

export function getTrustedDevices(): Promise<TrustedDevicePage> {
  return getJson<TrustedDevicePage>("/auth/devices", {
    200: ListAuthTrustedDevicesResponse,
  });
}

export async function logoutAccount(): Promise<void> {
  await postJson<void>("/auth/logout", undefined, { 204: "empty" });
}

export function revokeAuthSession(sessionId: string): Promise<void> {
  return deleteJson<void>(
    `/auth/sessions/${encodeURIComponent(sessionId)}`,
    { 204: "empty" },
  );
}

export function revokeOtherAuthSessions(): Promise<{
  status: "other_sessions_revoked";
  revokedCount: number;
}> {
  return deleteJson<{ status: "other_sessions_revoked"; revokedCount: number }>(
    "/auth/sessions/others",
    { 200: RevokeOtherAuthSessionsResponse },
  );
}

export function revokeTrustedDevice(deviceId: string): Promise<void> {
  return deleteJson<void>(
    `/auth/devices/${encodeURIComponent(deviceId)}`,
    { 204: "empty" },
  );
}

export function revokeOtherTrustedDevices(): Promise<{
  status: "other_devices_revoked";
  revokedCount: number;
}> {
  return deleteJson<{ status: "other_devices_revoked"; revokedCount: number }>(
    "/auth/devices/others",
    { 200: RevokeOtherAuthTrustedDevicesResponse },
  );
}
