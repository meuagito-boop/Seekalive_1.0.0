import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db, sessions, trustedDevices } from "@workspace/db";

export async function listTrustedDevices(accountId: string) {
  return db
    .select({
      id: trustedDevices.id,
      createdAt: trustedDevices.createdAt,
      lastSeenAt: trustedDevices.lastSeenAt,
    })
    .from(trustedDevices)
    .where(and(
      eq(trustedDevices.accountId, accountId),
      isNull(trustedDevices.revokedAt),
    ))
    .orderBy(desc(trustedDevices.lastSeenAt), desc(trustedDevices.id))
    .limit(101);
}

export async function revokeOtherTrustedDevices(
  accountId: string,
  currentDeviceId: string,
  now = new Date(),
): Promise<string[]> {
  return db.transaction(async (tx) => {
    const revoked = await tx
      .update(trustedDevices)
      .set({ revokedAt: now })
      .where(and(
        eq(trustedDevices.accountId, accountId),
        ne(trustedDevices.id, currentDeviceId),
        isNull(trustedDevices.revokedAt),
      ))
      .returning({ id: trustedDevices.id });
    if (revoked.length > 0) {
      await tx
        .update(sessions)
        .set({ revokedAt: now })
        .where(and(
          eq(sessions.accountId, accountId),
          inArray(sessions.deviceId, revoked.map((device) => device.id)),
          isNull(sessions.revokedAt),
        ));
    }
    return revoked.map((device) => device.id);
  });
}

export async function revokeTrustedDevice(
  accountId: string,
  deviceId: string,
  currentDeviceId: string,
  now = new Date(),
): Promise<{ isCurrent: boolean } | null> {
  return db.transaction(async (tx) => {
    const [revoked] = await tx
      .update(trustedDevices)
      .set({ revokedAt: now })
      .where(and(
        eq(trustedDevices.id, deviceId),
        eq(trustedDevices.accountId, accountId),
        isNull(trustedDevices.revokedAt),
      ))
      .returning({ id: trustedDevices.id });
    if (!revoked) return null;

    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(
        eq(sessions.accountId, accountId),
        eq(sessions.deviceId, revoked.id),
        isNull(sessions.revokedAt),
      ));
    return { isCurrent: revoked.id === currentDeviceId };
  });
}
