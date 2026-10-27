import { eq } from "drizzle-orm";
import {
  accountEmails,
  accounts,
  db,
  passwordCredentials,
} from "@workspace/db";
import type { PasswordUpdateRequestRepository } from "../application/passwordUpdate/requestPorts";

export const passwordUpdateRequestRepository: PasswordUpdateRequestRepository =
  {
    async findAccountByIdentifier(identifier) {
      const condition =
        identifier.kind === "email"
          ? eq(accountEmails.emailNormalized, identifier.value)
          : eq(accounts.username, identifier.value);
      const [account] = await db
        .select({
          id: accounts.id,
          status: accounts.status,
          securityLockedAt: accounts.securityLockedAt,
          emailVerifiedAt: accountEmails.verifiedAt,
          email: accountEmails.emailNormalized,
          displayName: accounts.displayName,
          passwordHash: passwordCredentials.passwordHash,
        })
        .from(accounts)
        .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
        .innerJoin(
          passwordCredentials,
          eq(passwordCredentials.accountId, accounts.id),
        )
        .where(condition)
        .limit(1);

      return account ?? null;
    },
  };
