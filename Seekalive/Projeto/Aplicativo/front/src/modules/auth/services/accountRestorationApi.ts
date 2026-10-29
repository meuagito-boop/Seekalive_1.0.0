import {
  ConfirmAccountRestorationResponse,
  RequestAccountRestorationCodeResponse,
} from "@workspace/api-zod";
import { postJson } from "@/modules/app/api/httpClient";

export type AccountRestorationCodeResult = {
  challengeId: string;
  emailMasked: string;
  expiresAt: string;
};

export async function requestAccountRestorationCode(input: {
  identifier: string;
  password: string;
}): Promise<AccountRestorationCodeResult> {
  return postJson<AccountRestorationCodeResult>(
    "/auth/account/deletion/restore/code",
    input,
    { 202: RequestAccountRestorationCodeResponse },
  );
}

export async function confirmAccountRestoration(input: {
  identifier: string;
  password: string;
  challengeId: string;
  code: string;
}): Promise<{ status: "account_restored" }> {
  return postJson<{ status: "account_restored" }>(
    "/auth/account/deletion/restore/confirm",
    input,
    { 200: ConfirmAccountRestorationResponse },
  );
}
