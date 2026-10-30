import { and, eq, sql } from "drizzle-orm";
import { accountProfiles, accounts, db } from "@workspace/db";
import type { PrivacyWrite } from "@workspace/api-zod";
import type { PrivacySettingsRecord } from "../application/ports";

export async function findPrivacySettings(
  accountId: string,
): Promise<PrivacySettingsRecord | null> {
  const [row] = await db
    .select({
      isPrivate: accountProfiles.isPrivate,
      messagesPolicy: accounts.messagesPolicy,
      readReceipts: accounts.readReceipts,
      version: accounts.version,
    })
    .from(accounts)
    .innerJoin(accountProfiles, eq(accountProfiles.accountId, accounts.id))
    .where(and(eq(accounts.id, accountId), eq(accounts.status, "active")))
    .limit(1);

  return row ?? null;
}

export async function savePrivacySettings(
  accountId: string,
  input: PrivacyWrite,
): Promise<{ version: number } | null> {
  return db.transaction(async (tx) => {
    const [owner] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.id, accountId),
          eq(accounts.version, input.version),
          eq(accounts.status, "active"),
        ),
      )
      .for("update")
      .limit(1);
    if (!owner) return null;

    const now = new Date();
    const [profile] = await tx
      .update(accountProfiles)
      .set({
        isPrivate: input.profileVisibility === "private",
        updatedAt: now,
      })
      .where(eq(accountProfiles.accountId, accountId))
      .returning({ accountId: accountProfiles.accountId });
    if (!profile) {
      throw new Error(`Account ${accountId} has no canonical profile record.`);
    }

    const [updated] = await tx
      .update(accounts)
      .set({
        messagesPolicy: input.messages,
        readReceipts: input.readReceipts,
        updatedAt: now,
        version: sql`${accounts.version} + 1`,
      })
      .where(eq(accounts.id, accountId))
      .returning({ version: accounts.version });

    return updated ?? null;
  });
}
