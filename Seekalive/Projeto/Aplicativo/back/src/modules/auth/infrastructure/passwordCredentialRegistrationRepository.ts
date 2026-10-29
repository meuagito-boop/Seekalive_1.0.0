import { passwordCredentials, type DatabaseTransaction } from "@workspace/db";
import { PASSWORD_POLICY_VERSION } from "@workspace/api-zod";

export async function createInitialPasswordCredential(
  transaction: DatabaseTransaction,
  accountId: string,
  passwordHash: string,
): Promise<void> {
  await transaction.insert(passwordCredentials).values({
    accountId,
    passwordHash,
    passwordPolicyVersion: PASSWORD_POLICY_VERSION,
  });
}
