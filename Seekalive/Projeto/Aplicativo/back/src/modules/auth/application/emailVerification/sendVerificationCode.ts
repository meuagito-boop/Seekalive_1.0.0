import { randomInt } from "node:crypto";
import { hashVerificationCode } from "../../../../security/session";
import { VerificationDeliveryUnavailableError } from "./errors";
import { EMAIL_VERIFICATION_TTL_MS } from "./policy";
import type {
  EmailVerificationDelivery,
  EmailVerificationRepository,
  ResendVerificationAccount,
} from "./ports";

export function createSendVerificationCode(
  repository: EmailVerificationRepository,
) {
  return async function sendVerificationCode(
    delivery: EmailVerificationDelivery,
    account: Pick<ResendVerificationAccount, "id" | "displayName">,
    email: string,
  ): Promise<void> {
    if (!delivery.isConfigured) {
      throw new VerificationDeliveryUnavailableError();
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const now = new Date();
    await repository.replaceChallenge({
      accountId: account.id,
      tokenHash: hashVerificationCode(account.id, code),
      expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS),
      now,
    });
    await delivery.sendVerificationCode({
      email,
      displayName: account.displayName,
      code,
    });
  };
}
