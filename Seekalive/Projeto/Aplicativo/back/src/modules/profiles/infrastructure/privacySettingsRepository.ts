import { and, eq, sql } from "drizzle-orm";
import { accounts, db } from "@workspace/db";
import type { PrivacyWrite } from "@workspace/api-zod";
import type { PrivacySettingsRecord } from "../application/ports";

export async function findPrivacySettings(
  accountId: string,
): Promise<PrivacySettingsRecord | null> {
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

  return row ?? null;
}

export async function savePrivacySettings(
  accountId: string,
  input: PrivacyWrite,
): Promise<{ version: number } | null> {
  const [updated] = await db
    .update(accounts)
    .set({
      isPrivate: input.profileVisibility === "private",
      messagesPolicy: input.messages,
      readReceipts: input.readReceipts,
      updatedAt: new Date(),
      version: sql`${accounts.version} + 1`,
    })
    .where(
      and(
        eq(accounts.id, accountId),
        eq(accounts.version, input.version),
        eq(accounts.status, "active"),
      ),
    )
    .returning({ version: accounts.version });

  return updated ?? null;
}
