import { eq } from "drizzle-orm";
import { accountEmails, accounts, db } from "@workspace/db";
import type { PasswordResetRequestRepository } from "../application/passwordReset/requestPorts";

export const passwordResetRequestRepository: PasswordResetRequestRepository = {
  async findAccountByEmail(email) {
    const [account] = await db
      .select({
        id: accounts.id,
        status: accounts.status,
        securityLockedAt: accounts.securityLockedAt,
        emailVerifiedAt: accountEmails.verifiedAt,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(eq(accountEmails.emailNormalized, email))
      .limit(1);

    return account ?? null;
  },
};
