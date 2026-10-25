import { toast } from "@/modules/shared/hooks/useToast";
import {
  accountViewToUser,
  myAccountToUser,
  socialGraphApi,
} from "@/modules/social/services/socialGraphApi";
import type { RelationshipActionDependencies } from "@/modules/social/services/relationshipActionDependencies";
import type { User } from "@/modules/profile/types/user";

export function showRelationshipError(title: string, error: unknown) {
  const message = error instanceof Error
    ? error.message
    : "Não foi possível concluir a solicitação.";
  toast({ title, description: message, variant: "destructive" });
}

export async function refreshRemoteAccount(
  dependencies: Pick<RelationshipActionDependencies, "currentUser" | "dispatch" | "updateAccount">,
  accountId: string,
): Promise<User> {
  const isCurrentAccount = accountId === dependencies.currentUser?.id;
  const user = isCurrentAccount
    ? myAccountToUser(await socialGraphApi.getMyAccount())
    : accountViewToUser(await socialGraphApi.getProfileByAccountId(accountId));
  dependencies.dispatch({ type: "ADD_USER", user });
  if (isCurrentAccount) dependencies.updateAccount(user);
  return user;
}
