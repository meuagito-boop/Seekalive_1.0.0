import { useMemo } from "react";
import type { SocialState } from "@/modules/app/state/socialState";
import type { User } from "@/modules/profile/types/user";
import {
  getAccountBlockProjection,
  readAccountScopedIdsMap,
} from "@/modules/shared/storage/accountScopedStorage";
import {
  getSocialAccountActivity,
  type SocialAccountActivityMap,
} from "@/modules/app/storage/socialAccountActivityStorage";
import {
  areMutualFollowers,
  viewerFollowsUser,
} from "@/modules/social/utils/followRelationships";

interface UseSocialContextViewOptions {
  state: SocialState;
  currentUser: User | null;
  actorId: string;
  isRemoteSocialSession: boolean;
  isDevelopmentPreview: boolean;
  localBlockedUserIds: string[];
  remoteBlockedUserIds: string[];
  activityByAccount: SocialAccountActivityMap;
}

export function useSocialContextView({
  state,
  currentUser,
  actorId,
  isRemoteSocialSession,
  isDevelopmentPreview,
  localBlockedUserIds,
  remoteBlockedUserIds,
  activityByAccount,
}: UseSocialContextViewOptions) {
  const viewer = currentUser;
  const blockedUserIds = isRemoteSocialSession ? remoteBlockedUserIds : localBlockedUserIds;
  const blockedUserIdSet = new Set(blockedUserIds);
  const blockRelations = readAccountScopedIdsMap("seekalive-blocked-users");
  const blockProjection = getAccountBlockProjection(blockRelations, actorId);
  const accountsBlockingViewerSet = isRemoteSocialSession
    ? new Set<string>()
    : new Set(blockProjection.blockingViewerIds);
  const blockedAccountIds = new Set(blockProjection.unavailableAccountIds);
  const blockedPostIds = new Set(
    state.posts.filter((post) => blockedAccountIds.has(post.authorId)).map((post) => post.id),
  );
  const accountActivity = useMemo(
    () => getSocialAccountActivity(activityByAccount, actorId),
    [activityByAccount, actorId],
  );
  const accountActivities = Object.values(activityByAccount);
  const posts = state.posts.map((post) => ({
    ...post,
    isLiked: accountActivity.likedPostIds.includes(post.id),
    isBookmarked: accountActivity.bookmarkedPostIds.includes(post.id),
    isReposted: accountActivity.reposts.some((repost) => repost.postId === post.id),
    likes: post.likes + accountActivities.filter((activity) => activity.likedPostIds.includes(post.id)).length,
    reposts: post.reposts + accountActivities.reduce(
      (count, activity) => count + activity.reposts.filter((repost) => repost.postId === post.id).length,
      0,
    ),
  }));
  const postComments = state.postComments.map((comment) => ({
    ...comment,
    isLiked: accountActivity.likedCommentIds.includes(comment.id),
    likes: comment.likes + accountActivities.filter((activity) => activity.likedCommentIds.includes(comment.id)).length,
  }));
  const repostEntries = [
    ...state.repostEntries,
    ...accountActivities.flatMap((activity) => activity.reposts),
  ].filter((entry, index, entries) => entries.findIndex((candidate) => candidate.id === entry.id) === index);
  const visibleNotifications = state.notifications
    .filter((notification) => notification.recipientId
      ? notification.recipientId === actorId
      : isDevelopmentPreview && actorId === currentUser?.id)
    .filter((notification) => !blockedAccountIds.has(notification.actorId)
      && (!notification.entityId || !blockedPostIds.has(notification.entityId)))
    .map((notification) => ({
      ...notification,
      isRead: accountActivity.readNotificationIds.includes(notification.id)
        || (isDevelopmentPreview && actorId === currentUser?.id && notification.isRead),
    }));
  const visibleConversations = state.conversations
    .filter((conversation) => conversation.participantIds.includes(actorId)
      && !conversation.participantIds.some((id) => id !== actorId && blockedAccountIds.has(id)))
    .map((conversation) => ({
      ...conversation,
      unreadCount: accountActivity.readConversationIds.includes(conversation.id) ? 0 : conversation.unreadCount,
    }));
  const visibleConversationIds = new Set(visibleConversations.map((conversation) => conversation.id));
  const visibleMessages = state.messages
    .filter((message) => visibleConversationIds.has(message.conversationId))
    .map((message) => ({
      ...message,
      isRead: message.senderId === actorId
        ? message.isRead
        : accountActivity.readMessageIds.includes(message.id)
          || (isDevelopmentPreview && actorId === currentUser?.id && message.isRead),
    }));
  const users = state.users.map((user) => ({
    ...user,
    isBlockedByViewer: blockedUserIdSet.has(user.id)
      || (!isRemoteSocialSession && Boolean(user.isBlockedByViewer)),
    blocksViewer: !isRemoteSocialSession && accountsBlockingViewerSet.has(user.id),
    isBlocked: blockedUserIdSet.has(user.id)
      || (!isRemoteSocialSession && accountsBlockingViewerSet.has(user.id))
      || (isRemoteSocialSession && user.source === "server" && Boolean(user.isBlocked)),
    isFollowing: isRemoteSocialSession
      ? user.source === "server" && Boolean(user.isFollowing)
      : viewer ? viewerFollowsUser(viewer, user) : false,
    followRequestSent: isRemoteSocialSession
      ? user.source === "server" && Boolean(user.followRequestSent)
      : !!viewer
        && !blockedUserIdSet.has(user.id)
        && !accountsBlockingViewerSet.has(user.id)
        && state.followRequests.some((request) =>
          request.requesterId === viewer.id && request.targetId === user.id,
        ),
    isInCircle: isRemoteSocialSession
      ? user.source === "server" && Boolean(user.isInCircle)
      : viewer ? areMutualFollowers(viewer, user) : false,
  }));

  return {
    accountActivity,
    blockedUserIdSet,
    accountsBlockingViewerSet,
    blockedAccountIds,
    blockedPostIds,
    posts,
    postComments,
    repostEntries,
    visibleNotifications,
    visibleConversations,
    visibleConversationIds,
    visibleMessages,
    users,
  };
}
