import { saveSocialAccount } from "@/modules/app/storage/accountStorage";
import { toast } from "@/modules/shared/hooks/useToast";
import { socialGraphApi } from "@/modules/social/services/socialGraphApi";
import { refreshRemoteAccount, showRelationshipError } from "@/modules/social/services/relationshipActionSupport";
import type { RelationshipActionDependencies } from "@/modules/social/services/relationshipActionDependencies";
import type { User } from "@/modules/profile/types/user";
import { viewerFollowsUser } from "@/modules/social/utils/followRelationships";

export function createFollowActions(dependencies: RelationshipActionDependencies) {
  const {
    state,
    currentUser,
    viewer,
    isRemoteSocialSession,
    blockedUserIdSet,
    accountsBlockingViewerSet,
    dispatch,
    updateAccount,
    showRefreshWarning,
  } = dependencies;

  async function toggleFollow(userId: string): Promise<boolean> {
    const target = state.users.find((user) => user.id === userId);
    if (!viewer || !target || target.id === viewer.id
      || blockedUserIdSet.has(userId) || accountsBlockingViewerSet.has(userId)) return false;

    if (isRemoteSocialSession) {
      if (target.source !== "server") {
        toast({
          title: "Conta de demonstração",
          description: "Perfis de exemplo não podem ser seguidos pela conta real.",
        });
        return false;
      }
      try {
        const previousFollowing = Boolean(target.isFollowing);
        const result = previousFollowing || target.followRequestSent
          ? null
          : await socialGraphApi.follow(userId);
        if (previousFollowing || target.followRequestSent) {
          await socialGraphApi.unfollow(userId);
          dispatch({
            type: "UPDATE_USER",
            user: { ...target, isFollowing: false, followRequestSent: false, isInCircle: false },
          });
        } else if (result) {
          dispatch({
            type: "UPDATE_USER",
            user: {
              ...target,
              isFollowing: result.status === "accepted",
              followRequestSent: result.status === "pending",
              isInCircle: false,
            },
          });
        }
      } catch (error) {
        showRelationshipError("Não foi possível atualizar o seguimento", error);
        return false;
      }

      try {
        await Promise.all([
          refreshRemoteAccount(dependencies, userId),
          currentUser ? refreshRemoteAccount(dependencies, currentUser.id) : Promise.resolve(null),
        ]);
      } catch {
        showRefreshWarning();
      }
      return true;
    }

    const pendingRequest = state.followRequests.find((request) =>
      request.requesterId === viewer.id && request.targetId === userId,
    );
    if (pendingRequest) {
      dispatch({ type: "REMOVE_FOLLOW_REQUEST", requestId: pendingRequest.id });
      return true;
    }

    const wasFollowing = viewerFollowsUser(viewer, target);
    if (!wasFollowing && target.isPrivate) {
      dispatch({
        type: "ADD_FOLLOW_REQUEST",
        request: {
          id: `follow_request_${viewer.id}_${target.id}`,
          requesterId: viewer.id,
          targetId: target.id,
          createdAt: new Date().toISOString(),
        },
      });
      return true;
    }

    const targetFollowsViewer = (target.followingIds ?? []).includes(viewer.id);
    const wasMutual = wasFollowing && targetFollowsViewer;
    const willBeMutual = !wasFollowing && targetFollowsViewer;
    const nextFollowingIds = (viewer.followingIds ?? []).filter((id) => id !== userId);
    if (!wasFollowing) nextFollowingIds.push(userId);

    const updatedViewer: User = {
      ...viewer,
      followingIds: nextFollowingIds,
      stats: {
        ...viewer.stats,
        following: Math.max(0, viewer.stats.following + (wasFollowing ? -1 : 1)),
        circles: Math.max(0, viewer.stats.circles + (willBeMutual ? 1 : wasMutual ? -1 : 0)),
      },
    };
    const updatedTarget: User = {
      ...target,
      isFollowing: !wasFollowing,
      stats: {
        ...target.stats,
        followers: Math.max(0, target.stats.followers + (wasFollowing ? -1 : 1)),
        circles: Math.max(0, target.stats.circles + (willBeMutual ? 1 : wasMutual ? -1 : 0)),
      },
    };

    if (currentUser) updateAccount(updatedViewer);
    if (updatedTarget.source !== "server") saveSocialAccount(updatedTarget);
    dispatch({ type: "UPDATE_USER", user: updatedTarget });
    if (currentUser && state.users.some((user) => user.id === currentUser.id)) {
      dispatch({ type: "UPDATE_USER", user: updatedViewer });
    }
    return true;
  }

  return { toggleFollow };
}
