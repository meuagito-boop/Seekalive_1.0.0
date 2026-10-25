import { saveSocialAccount } from "@/modules/app/storage/accountStorage";
import { toast } from "@/modules/shared/hooks/useToast";
import {
  SocialGraphApiError,
  socialGraphApi,
} from "@/modules/social/services/socialGraphApi";
import { refreshRemoteAccount, showRelationshipError } from "@/modules/social/services/relationshipActionSupport";
import type { RelationshipActionDependencies } from "@/modules/social/services/relationshipActionDependencies";
import { followRequestIdsBetween, removeFollowEdgesForBlock } from "@/modules/social/utils/followRelationships";
import type { User } from "@/modules/profile/types/user";

export function createBlockActions(dependencies: RelationshipActionDependencies) {
  const {
    state,
    currentUser,
    viewer,
    isRemoteSocialSession,
    blockedUserIdSet,
    dispatch,
    setRemoteFollowRequests,
    setRemoteBlockedUserIds,
    toggleBlockedUser,
    showRefreshWarning,
  } = dependencies;

  async function blockUser(userId: string): Promise<boolean> {
    const target = state.users.find((user) => user.id === userId);
    if (!viewer || !target || userId === viewer.id || blockedUserIdSet.has(userId)) return false;

    if (isRemoteSocialSession) {
      if (target.source !== "server") {
        toast({
          title: "Conta de demonstração",
          description: "Perfis de exemplo não podem ser bloqueados pela conta real.",
        });
        return false;
      }
      try {
        await socialGraphApi.block(userId);
      } catch (error) {
        showRelationshipError("Não foi possível bloquear o perfil", error);
        return false;
      }
      setRemoteBlockedUserIds((ids) => ids.includes(userId) ? ids : [...ids, userId]);
      setRemoteFollowRequests((requests) =>
        requests.filter((request) => request.requesterId !== userId && request.targetId !== userId),
      );
      dispatch({
        type: "UPDATE_USER",
        user: {
          ...target,
          isBlocked: true,
          isBlockedByViewer: true,
          blocksViewer: false,
          isFollowing: false,
          followRequestSent: false,
          isInCircle: false,
        },
      });
      for (const requestId of followRequestIdsBetween(state.followRequests, viewer.id, userId)) {
        dispatch({ type: "REMOVE_FOLLOW_REQUEST", requestId });
      }
      if (currentUser) {
        try {
          await refreshRemoteAccount(dependencies, currentUser.id);
        } catch {
          showRefreshWarning();
        }
      }
      return true;
    }

    const { actor: updatedViewer, target: updatedTarget, changed } =
      removeFollowEdgesForBlock(viewer, target);
    if (changed) {
      if (currentUser) dependencies.updateAccount(updatedViewer);
      else if (updatedViewer.source !== "server") {
        saveSocialAccount(updatedViewer);
      }
      if (updatedTarget.source !== "server") saveSocialAccount(updatedTarget);
      dispatch({ type: "UPDATE_USER", user: updatedTarget });
      if (state.users.some((user) => user.id === viewer.id)) {
        dispatch({ type: "UPDATE_USER", user: updatedViewer });
      }
    }
    for (const requestId of followRequestIdsBetween(state.followRequests, viewer.id, userId)) {
      dispatch({ type: "REMOVE_FOLLOW_REQUEST", requestId });
    }
    toggleBlockedUser(userId);
    return true;
  }

  async function unblockUser(userId: string): Promise<boolean> {
    if (!blockedUserIdSet.has(userId)) return false;
    if (!isRemoteSocialSession) {
      toggleBlockedUser(userId);
      return true;
    }

    try {
      await socialGraphApi.unblock(userId);
    } catch (error) {
      showRelationshipError("Não foi possível remover o bloqueio", error);
      return false;
    }
    setRemoteBlockedUserIds((ids) => ids.filter((id) => id !== userId));
    try {
      await refreshRemoteAccount(dependencies, userId);
    } catch (error) {
      if (!(error instanceof SocialGraphApiError) || error.status !== 404) {
        showRefreshWarning();
      } else {
        const previous = state.users.find((user) => user.id === userId);
        if (previous) {
          dispatch({
            type: "UPDATE_USER",
            user: {
              ...previous,
              isBlocked: true,
              isBlockedByViewer: false,
              blocksViewer: false,
              isFollowing: false,
              followRequestSent: false,
              isInCircle: false,
            },
          });
        }
      }
    }
    return true;
  }

  return { blockUser, unblockUser };
}
