import { postJson } from "@/modules/app/api/httpClient";
import type { EmailConfirmationResult } from "../types";

export function confirmEmail(payload: { email: string; code: string }) {
  return postJson<EmailConfirmationResult>(
    "/auth/verification/confirm",
    payload,
  );
}

export function resendVerification(payload: { email: string }) {
  return postJson<{ status: "verification_required"; message: string }>(
    "/auth/verification",
    payload,
  );
}
