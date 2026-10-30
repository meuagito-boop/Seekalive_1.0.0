import { and, eq, ne } from "drizzle-orm";
import {
  accountEmails,
  accounts,
  db,
  passwordCredentials,
} from "@workspace/db";
import type { PasswordUpdateRequestRepository } from "../application/passwordUpdate/requestPorts";
import { withProfileDisplayName } from "../../profiles/composition/profileDisplayName";

export const passwordUpdateRequestRepository: PasswordUpdateRequestRepository =
  {
    async findAccountByIdentifier(identifier) {
      const condition =
        identifier.kind === "email"
          ? eq(accountEmails.emailNormalized, identifier.value)
          : and(
              eq(accounts.username, identifier.value),
              ne(accounts.status, "deletion_retained"),
            );
      const [account] = await db
        .select({
          id: accounts.id,
          status: accounts.status,
          securityLockedAt: accounts.securityLockedAt,
          emailVerifiedAt: accountEmails.verifiedAt,
          email: accountEmails.emailNormalized,
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

      return withProfileDisplayName(account);
    },
  };
