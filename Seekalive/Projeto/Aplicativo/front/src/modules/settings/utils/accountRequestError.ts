import { SocialGraphApiError } from "@/modules/social/services/socialGraphApi";

export function accountRequestError(error: unknown): string {
  if (error instanceof SocialGraphApiError && error.key === "VERSION_CONFLICT") {
    return "Os dados da conta mudaram em outra sessão. Recarregue as informações antes de salvar.";
  }
  return error instanceof Error ? error.message : "Não foi possível salvar os dados da conta.";
}
