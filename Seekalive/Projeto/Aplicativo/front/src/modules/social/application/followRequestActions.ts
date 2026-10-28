import type {
  RelationshipActionDependencies,
  RelationshipActionSupport,
} from "@/modules/social/application/relationshipActionDependencies";
import { socialGraphApi } from "@/modules/social/services/socialGraphApi";
import { viewerFollowsUser } from "@/modules/social/domain/followRelationships";

export function createFollowRequestActions(
  dependencies: RelationshipActionDependencies,
  support: RelationshipActionSupport,
) {
  const {
    state,
    currentUser,
    isRemoteSocialSession,
    blockedUserIdSet,
    accountsBlockingViewerSet,
    dispatch,
    updateAccount,
    remoteFollowRequests,
    setRemoteFollowRequests,
    savePreviewAccount,
  } = dependencies;
  const { showRelationshipError, refreshRemoteAccount } = support;

  async function acceptFollowRequest(requestId: string): Promise<boolean> {
    const ownerId = currentUser?.id;
    if (!ownerId) return false;
    const request = isRemoteSocialSession
      ? remoteFollowRequests.find(
          (item) => item.id === requestId && item.targetId === ownerId,
        )
      : state.followRequests.find(
          (item) => item.id === requestId && item.targetId === ownerId,
        );
    if (
      !request ||
      blockedUserIdSet.has(request.requesterId) ||
      accountsBlockingViewerSet.has(request.requesterId)
    ) {
      return false;
    }

    if (isRemoteSocialSession) {
      try {
        await socialGraphApi.acceptFollowRequest(request.requesterId);
      } catch (error) {
        showRelationshipError("Não foi possível aceitar a solicitação", error);
        return false;
      }
      setRemoteFollowRequests((requests) =>
        requests.filter((item) => item.id !== requestId),
      );
      try {
        await Promise.all([
          refreshRemoteAccount(ownerId),
          refreshRemoteAccount(request.requesterId),
        ]);
      } catch {
        dependencies.showRefreshWarning();
      }
      return true;
    }

    const targetAccount = currentUser;
    const requester = state.users.find(
      (user) => user.id === request.requesterId,
    );
    if (!requester) return false;
    const requesterAlreadyFollows = (requester.followingIds ?? []).includes(
      targetAccount.id,
    );
    const viewerAlreadyFollowsRequester = viewerFollowsUser(
      targetAccount,
      requester,
    );
    const updatedViewer = requesterAlreadyFollows
      ? targetAccount
      : {
          ...targetAccount,
          stats: {
            ...targetAccount.stats,
            followers: targetAccount.stats.followers + 1,
            circles:
              targetAccount.stats.circles +
              (viewerAlreadyFollowsRequester ? 1 : 0),
          },
        };
    const updatedRequester = requesterAlreadyFollows
      ? requester
      : {
          ...requester,
          followingIds: [...(requester.followingIds ?? []), targetAccount.id],
          stats: {
            ...requester.stats,
            following: requester.stats.following + 1,
            circles:
              requester.stats.circles + (viewerAlreadyFollowsRequester ? 1 : 0),
          },
        };

    if (!requesterAlreadyFollows) {
      updateAccount(updatedViewer);
      if (updatedViewer.source !== "server") {
        savePreviewAccount(updatedViewer);
      }
      if (updatedRequester.source !== "server") {
        savePreviewAccount(updatedRequester);
      }
      dispatch({ type: "UPDATE_USER", user: updatedViewer });
      dispatch({ type: "UPDATE_USER", user: updatedRequester });
    }
    dispatch({ type: "REMOVE_FOLLOW_REQUEST", requestId });
    return true;
  }

  async function declineFollowRequest(requestId: string): Promise<boolean> {
    const request = isRemoteSocialSession
      ? remoteFollowRequests.find(
          (item) => item.id === requestId && item.targetId === currentUser?.id,
        )
      : state.followRequests.find(
          (item) => item.id === requestId && item.targetId === currentUser?.id,
        );
    if (!request) return false;
    if (isRemoteSocialSession) {
      try {
        await socialGraphApi.declineFollowRequest(request.requesterId);
        setRemoteFollowRequests((requests) =>
          requests.filter((item) => item.id !== requestId),
        );
        return true;
      } catch (error) {
        showRelationshipError("Não foi possível recusar a solicitação", error);
        return false;
      }
    }
    dispatch({ type: "REMOVE_FOLLOW_REQUEST", requestId });
    return true;
  }

  return { acceptFollowRequest, declineFollowRequest };
}
