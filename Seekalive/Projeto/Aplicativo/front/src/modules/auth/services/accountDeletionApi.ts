import {
  ConfirmAccountDeletionResponse,
  RequestAccountDeletionCodeResponse,
} from "@workspace/api-zod";
import { postJson } from "@/modules/app/api/httpClient";

export type AccountDeletionCodeResult = {
  challengeId: string;
  emailMasked: string;
  expiresAt: string;
};

export type AccountDeletionScheduledResult = {
  deletionScheduledFor: string;
};

export async function requestAccountDeletionCode(): Promise<AccountDeletionCodeResult> {
  return postJson<AccountDeletionCodeResult>(
    "/auth/account/deletion/code",
    {},
    { 202: RequestAccountDeletionCodeResponse },
  );
}

export async function confirmAccountDeletion(input: {
  challengeId: string;
  code: string;
}): Promise<AccountDeletionScheduledResult> {
  return postJson<AccountDeletionScheduledResult>(
    "/auth/account/deletion/confirm",
    input,
    { 200: ConfirmAccountDeletionResponse },
  );
}
