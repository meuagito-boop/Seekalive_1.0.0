import { toast } from "@/hooks/use-toast";
import {
  accountViewToUser,
  myAccountToUser,
  socialGraphApi,
} from "@/modules/social/services/socialGraphApi";
import type { RelationshipActionDependencies } from "@/modules/social/application/relationshipActionDependencies";

export function createRelationshipActionSupport({
  currentUser,
  dispatch,
  updateAccount,
}: RelationshipActionDependencies) {
  function showRelationshipError(title: string, error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível concluir a solicitação.";
    toast({ title, description: message, variant: "destructive" });
  }

  async function refreshRemoteAccount(accountId: string) {
    const isCurrentAccount = accountId === currentUser?.id;
    const user = isCurrentAccount
      ? myAccountToUser(await socialGraphApi.getMyAccount())
      : accountViewToUser(
          await socialGraphApi.getProfileByAccountId(accountId),
        );
    dispatch({ type: "ADD_USER", user });
    if (isCurrentAccount) updateAccount(user);
    return user;
  }

  return { showRelationshipError, refreshRemoteAccount };
}
