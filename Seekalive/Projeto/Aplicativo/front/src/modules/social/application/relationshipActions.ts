import type { Dispatch, SetStateAction } from "react";
import type { FollowRequest } from "@/modules/social/types/followRequest";
import type { User } from "@/modules/profile/types/user";
import { toast } from "@/hooks/use-toast";
import {
  accountViewToUser,
  myAccountToUser,
  SocialGraphApiError,
  socialGraphApi,
} from "@/modules/social/services/socialGraphApi";
import {
  areMutualFollowers,
  followRequestIdsBetween,
  removeFollowEdgesForBlock,
  viewerFollowsUser,
} from "@/modules/social/domain/followRelationships";
import type { SocialGraphAction, SocialGraphState } from "@/modules/social/state/relationshipReducer";

type RelationshipActionDependencies = {
  state: SocialGraphState;
  currentUser: User | null;
  viewer: User | null;
  isRemoteSocialSession: boolean;
  blockedUserIdSet: Set<string>;
  accountsBlockingViewerSet: Set<string>;
  dispatch: Dispatch<SocialGraphAction>;
  updateAccount: (user: User) => void;
  remoteFollowRequests: FollowRequest[];
  setRemoteFollowRequests: Dispatch<SetStateAction<FollowRequest[]>>;
  setRemoteBlockedUserIds: Dispatch<SetStateAction<string[]>>;
  toggleBlockedUser: (userId: string) => void;
  showRefreshWarning: () => void;
  savePreviewAccount: (account: User) => void;
};

export function createSocialRelationshipActions(dependencies: RelationshipActionDependencies) {
  const {
    state,
    currentUser,
    viewer,
    isRemoteSocialSession,
    blockedUserIdSet,
    accountsBlockingViewerSet,
    dispatch,
    updateAccount,
    remoteFollowRequests,
    setRemoteFollowRequests,
    setRemoteBlockedUserIds,
    toggleBlockedUser,
    showRefreshWarning,
    savePreviewAccount,
  } = dependencies;

  function showRelationshipError(title: string, error: unknown) {
    const message = error instanceof Error
      ? error.message
      : "Não foi possível concluir a solicitação.";
    toast({ title, description: message, variant: "destructive" });
  }

  async function refreshRemoteAccount(accountId: string): Promise<User> {
    const isCurrentAccount = accountId === currentUser?.id;
    const user = isCurrentAccount
      ? myAccountToUser(await socialGraphApi.getMyAccount())
      : accountViewToUser(await socialGraphApi.getProfileByAccountId(accountId));
    dispatch({ type: "ADD_USER", user });
    if (isCurrentAccount) updateAccount(user);
    return user;
  }

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
          refreshRemoteAccount(userId),
          currentUser ? refreshRemoteAccount(currentUser.id) : Promise.resolve(null),
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
    if (updatedTarget.source !== "server") {
      savePreviewAccount(updatedTarget);
    }
    dispatch({ type: "UPDATE_USER", user: updatedTarget });
    if (currentUser && state.users.some((user) => user.id === currentUser.id)) {
      dispatch({ type: "UPDATE_USER", user: updatedViewer });
    }
    return true;
  }

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
          await refreshRemoteAccount(currentUser.id);
        } catch {
          showRefreshWarning();
        }
      }
      return true;
    }

    const { actor: updatedViewer, target: updatedTarget, changed } =
      removeFollowEdgesForBlock(viewer, target);
    if (changed) {
      if (currentUser) updateAccount(updatedViewer);
      else if (updatedViewer.source !== "server") {
        savePreviewAccount(updatedViewer);
      }
      if (updatedTarget.source !== "server") {
        savePreviewAccount(updatedTarget);
      }
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
      await refreshRemoteAccount(userId);
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

  async function acceptFollowRequest(requestId: string): Promise<boolean> {
    const ownerId = currentUser?.id;
    if (!ownerId) return false;
    const request = isRemoteSocialSession
      ? remoteFollowRequests.find((item) => item.id === requestId && item.targetId === ownerId)
      : state.followRequests.find((item) => item.id === requestId && item.targetId === ownerId);
    if (!request || blockedUserIdSet.has(request.requesterId) || accountsBlockingViewerSet.has(request.requesterId)) {
      return false;
    }

    if (isRemoteSocialSession) {
      try {
        await socialGraphApi.acceptFollowRequest(request.requesterId);
      } catch (error) {
        showRelationshipError("Não foi possível aceitar a solicitação", error);
        return false;
      }
      setRemoteFollowRequests((requests) => requests.filter((item) => item.id !== requestId));
      try {
        await Promise.all([
          refreshRemoteAccount(ownerId),
          refreshRemoteAccount(request.requesterId),
        ]);
      } catch {
        showRefreshWarning();
      }
      return true;
    }

    const targetAccount = currentUser;
    const requester = state.users.find((user) => user.id === request.requesterId);
    if (!requester) return false;
    const requesterAlreadyFollows = (requester.followingIds ?? []).includes(targetAccount.id);
    const viewerAlreadyFollowsRequester = viewerFollowsUser(targetAccount, requester);
    const updatedViewer: User = requesterAlreadyFollows
      ? targetAccount
      : {
          ...targetAccount,
          stats: {
            ...targetAccount.stats,
            followers: targetAccount.stats.followers + 1,
            circles: targetAccount.stats.circles + (viewerAlreadyFollowsRequester ? 1 : 0),
          },
        };
    const updatedRequester: User = requesterAlreadyFollows
      ? requester
      : {
          ...requester,
          followingIds: [...(requester.followingIds ?? []), targetAccount.id],
          stats: {
            ...requester.stats,
            following: requester.stats.following + 1,
            circles: requester.stats.circles + (viewerAlreadyFollowsRequester ? 1 : 0),
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
      ? remoteFollowRequests.find((item) => item.id === requestId && item.targetId === currentUser?.id)
      : state.followRequests.find((item) => item.id === requestId && item.targetId === currentUser?.id);
    if (!request) return false;
    if (isRemoteSocialSession) {
      try {
        await socialGraphApi.declineFollowRequest(request.requesterId);
        setRemoteFollowRequests((requests) => requests.filter((item) => item.id !== requestId));
        return true;
      } catch (error) {
        showRelationshipError("Não foi possível recusar a solicitação", error);
        return false;
      }
    }
    dispatch({ type: "REMOVE_FOLLOW_REQUEST", requestId });
    return true;
  }

  return {
    toggleFollow,
    blockUser,
    unblockUser,
    acceptFollowRequest,
    declineFollowRequest,
  };
}
