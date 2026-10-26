import { eq } from "drizzle-orm";
import { accountEmails, accounts, db } from "@workspace/db";
import type { AuthEmailDelivery } from "../../infrastructure/emailDelivery";
import { deliverVerificationCode } from "../emailVerification";

export async function requestEmailVerification(
  email: string,
  delivery: AuthEmailDelivery,
): Promise<"sent" | "not_pending" | "delivery_failed"> {
  const [account] = await db
    .select({
      id: accounts.id,
      displayName: accounts.displayName,
      status: accounts.status,
      verifiedAt: accountEmails.verifiedAt,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(eq(accountEmails.emailNormalized, email))
    .limit(1);

  if (account?.status !== "pending_verification" || account.verifiedAt) {
    return "not_pending";
  }
  try {
    await deliverVerificationCode(delivery, account, email);
  } catch {
    return "delivery_failed";
  }
  return "sent";
}
