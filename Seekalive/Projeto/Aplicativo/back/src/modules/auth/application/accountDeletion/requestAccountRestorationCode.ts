import { randomInt, randomUUID } from "node:crypto";
import { hashAccountDeletionCode } from "../../../../security/tokenHashing";
import { ACCOUNT_DELETION_CODE_TTL_MS } from "./requestAccountDeletionCode";
import type {
  AccountDeletionChallengeInvalidator,
  AccountDeletionChallengeWriter,
} from "./deletionCodePorts";

type AccountRestorationEmailDelivery = {
  readonly isConfigured: boolean;
  sendAccountDeletionCode(input: {
    email: string;
    displayName: string;
    code: string;
    purpose: "restore_account";
  }): Promise<void>;
};

type Dependencies = {
  writeChallenge: AccountDeletionChallengeWriter;
  invalidateChallenge: AccountDeletionChallengeInvalidator;
  getEmailDelivery(): AccountRestorationEmailDelivery;
};

export function createRequestAccountRestorationCode({
  writeChallenge,
  invalidateChallenge,
  getEmailDelivery,
}: Dependencies) {
  return async function requestAccountRestorationCode(accountId: string) {
    const delivery = getEmailDelivery();
    if (!delivery.isConfigured)
      return { kind: "delivery_unavailable" as const };

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const challengeId = randomUUID();
    const createdAt = new Date();
    const account = await writeChallenge({
      accountId,
      challengeId,
      purpose: "account_deletion_restore",
      tokenHash: hashAccountDeletionCode(
        accountId,
        challengeId,
        "account_deletion_restore",
        code,
      ),
      createdAt,
      expiresAt: new Date(createdAt.getTime() + ACCOUNT_DELETION_CODE_TTL_MS),
    });
    if (!account) return { kind: "account_unavailable" as const };

    try {
      await delivery.sendAccountDeletionCode({
        ...account,
        code,
        purpose: "restore_account",
      });
    } catch {
      await invalidateChallenge(challengeId, "account_deletion_restore");
      return { kind: "delivery_failed" as const };
    }

    return {
      kind: "code_sent" as const,
      challengeId,
      email: account.email,
      expiresAt: new Date(createdAt.getTime() + ACCOUNT_DELETION_CODE_TTL_MS),
    };
  };
}
