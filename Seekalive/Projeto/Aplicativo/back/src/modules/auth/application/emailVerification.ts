import { randomInt } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { authChallenges, db } from "@workspace/db";
import { hashVerificationCode } from "../../../security/session";
import {
  EmailDeliveryUnavailableError,
  type AuthEmailDelivery,
} from "../infrastructure/emailDelivery";

const VERIFICATION_TTL_MS = 10 * 60 * 1000;

export async function createVerificationChallenge(accountId: string): Promise<string> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(authChallenges)
      .set({ consumedAt: now })
      .where(and(
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, "verify_email"),
        isNull(authChallenges.consumedAt),
      ));
    await tx.insert(authChallenges).values({
      accountId,
      purpose: "verify_email",
      tokenHash: hashVerificationCode(accountId, code),
      expiresAt: new Date(now.getTime() + VERIFICATION_TTL_MS),
    });
  });

  return code;
}

export async function deliverVerificationCode(
  delivery: AuthEmailDelivery,
  account: { id: string; displayName: string },
  email: string,
): Promise<void> {
  if (!delivery.isConfigured) throw new EmailDeliveryUnavailableError();
  const code = await createVerificationChallenge(account.id);
  await delivery.sendVerificationCode({ email, displayName: account.displayName, code });
}
