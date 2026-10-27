import type {
  EmailVerificationDelivery,
  EmailVerificationRepository,
} from "./ports";

type SendVerificationCode = (
  delivery: EmailVerificationDelivery,
  account: { id: string; displayName: string },
  email: string,
) => Promise<void>;

export function createRequestEmailVerification(
  repository: EmailVerificationRepository,
  sendVerificationCode: SendVerificationCode,
) {
  return async function requestEmailVerification(
    email: string,
    delivery: EmailVerificationDelivery,
  ): Promise<"sent" | "not_pending" | "delivery_failed"> {
    const account = await repository.findResendAccountByEmail(email);
    if (account?.status !== "pending_verification" || account.verifiedAt) {
      return "not_pending";
    }

    try {
      await sendVerificationCode(
        delivery,
        { id: account.id, displayName: account.displayName },
        email,
      );
    } catch {
      return "delivery_failed";
    }
    return "sent";
  };
}
