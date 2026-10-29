import { randomInt, randomUUID } from "node:crypto";
import { hashAccountDeletionCode } from "../../../../security/tokenHashing";
import type {
  AccountDeletionChallengeInvalidator,
  AccountDeletionChallengeWriter,
} from "./deletionCodePorts";

export const ACCOUNT_DELETION_CODE_TTL_MS = 10 * 60 * 1000;

type AccountDeletionEmailDelivery = {
  readonly isConfigured: boolean;
  sendAccountDeletionCode(input: {
    email: string;
    displayName: string;
    code: string;
    purpose: "request_deletion";
  }): Promise<void>;
};

type Dependencies = {
  writeChallenge: AccountDeletionChallengeWriter;
  invalidateChallenge: AccountDeletionChallengeInvalidator;
  getEmailDelivery(): AccountDeletionEmailDelivery;
};

export function createRequestAccountDeletionCode({
  writeChallenge,
  invalidateChallenge,
  getEmailDelivery,
}: Dependencies) {
  return async function requestAccountDeletionCode(accountId: string) {
    const delivery = getEmailDelivery();
    if (!delivery.isConfigured)
      return { kind: "delivery_unavailable" as const };

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const challengeId = randomUUID();
    const createdAt = new Date();
    const expiresAt = new Date(
      createdAt.getTime() + ACCOUNT_DELETION_CODE_TTL_MS,
    );
    const account = await writeChallenge({
      accountId,
      challengeId,
      purpose: "account_deletion_request",
      tokenHash: hashAccountDeletionCode(
        accountId,
        challengeId,
        "account_deletion_request",
        code,
      ),
      createdAt,
      expiresAt,
    });

    if (!account) return { kind: "account_unavailable" as const };

    try {
      await delivery.sendAccountDeletionCode({
        ...account,
        code,
        purpose: "request_deletion",
      });
    } catch {
      await invalidateChallenge(challengeId, "account_deletion_request");
      return { kind: "delivery_failed" as const };
    }

    return {
      kind: "code_sent" as const,
      challengeId,
      email: account.email,
      expiresAt,
    };
  };
}
