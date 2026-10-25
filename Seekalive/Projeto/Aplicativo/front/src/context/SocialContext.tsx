import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import type { ReactNode } from "react";
import { currentUser as demoCurrentUser } from "@/data/mockData";
import type { FollowRequest, User } from "@/data/mockData";
import { saveSocialAccount } from "@/data/accountStorage";
import { saveStoredFollowRequests } from "@/data/followRequestStorage";
import { useAppContext } from "@/context/AppContext";
import { toast } from "@/hooks/use-toast";
import { ContentServiceError } from "@/services/contentService";
import {
  accountViewToUser,
  followRequestToModel,
  myAccountToUser,
  socialGraphApi,
} from "@/services/socialGraphApi";
import { canReadPost } from "@/services/contentValidation";
import {
  getAccountBlockProjection,
  readAccountScopedIdsMap,
  useAccountScopedIds,
} from "@/data/accountScopedStorage";
import {
  getSocialAccountActivity,
  readSocialAccountActivityMap,
  saveSocialAccountActivityMap,
  updateSocialAccountActivity,
} from "@/data/socialAccountActivityStorage";
import type { SocialAccountActivity } from "@/data/socialAccountActivityStorage";
import {
  areMutualFollowers,
  viewerFollowsUser,
} from "@/lib/followRelationships";
import { createSocialRelationshipActions } from "@/context/social/relationshipActions";
import { createSocialPostActions } from "@/context/social/postActions";
import { createSocialReviewActions } from "@/context/social/reviewActions";
import { createSocialInboxActions } from "@/context/social/inboxActions";
import {
  createInitialState,
  socialReducer,
} from "@/context/social/state";
import type { SocialContextType } from "@/context/social/types";

// ── Context ───────────────────────────────────────────────────────────
const SocialContext = createContext<SocialContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────
export function SocialProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(socialReducer, undefined, createInitialState);
  const { currentUser, updateAccount, isDevelopmentPreview } = useAppContext();
  const isRemoteSocialSession = Boolean(currentUser && !isDevelopmentPreview);
  const viewer = currentUser ?? (import.meta.env.DEV ? demoCurrentUser : null);
  const actorId = currentUser?.id ?? viewer?.id ?? "guest";
  const { ids: localBlockedUserIds, toggle: toggleBlockedUser } =
    useAccountScopedIds("seekalive-blocked-users", actorId);
  const [remoteBlockedUserIds, setRemoteBlockedUserIds] = useState<string[]>([]);
  const [remoteFollowRequests, setRemoteFollowRequests] = useState<FollowRequest[]>([]);
  const [socialGraphLoading, setSocialGraphLoading] = useState(false);
  const [socialGraphError, setSocialGraphError] = useState<string | null>(null);
  const [socialGraphRetry, setSocialGraphRetry] = useState(0);
  const blockedUserIds = isRemoteSocialSession ? remoteBlockedUserIds : localBlockedUserIds;
  const blockedUserIdSet = new Set(blockedUserIds);
  const blockRelations = readAccountScopedIdsMap("seekalive-blocked-users");
  const blockProjection = getAccountBlockProjection(blockRelations, actorId);
  const accountsBlockingViewerSet = isRemoteSocialSession
    ? new Set<string>()
    : new Set(blockProjection.blockingViewerIds);
  const blockedAccountIds = new Set(blockProjection.unavailableAccountIds);
  const blockedPostIds = new Set(
    state.posts.filter(post => blockedAccountIds.has(post.authorId)).map(post => post.id),
  );
  const [activityByAccount, setActivityByAccount] = useState(readSocialAccountActivityMap);
  const accountActivity = useMemo(
    () => getSocialAccountActivity(activityByAccount, actorId),
    [activityByAccount, actorId],
  );
  const accountActivities = Object.values(activityByAccount);
  const posts = state.posts.map(post => ({
    ...post,
    isLiked: accountActivity.likedPostIds.includes(post.id),
    isBookmarked: accountActivity.bookmarkedPostIds.includes(post.id),
    isReposted: accountActivity.reposts.some(repost => repost.postId === post.id),
    likes: post.likes + accountActivities.filter(activity => activity.likedPostIds.includes(post.id)).length,
    reposts: post.reposts + accountActivities.reduce(
      (count, activity) => count + activity.reposts.filter(repost => repost.postId === post.id).length,
      0,
    ),
  }));
  const postComments = state.postComments.map(comment => ({
    ...comment,
    isLiked: accountActivity.likedCommentIds.includes(comment.id),
    likes: comment.likes + accountActivities.filter(activity => activity.likedCommentIds.includes(comment.id)).length,
  }));
  const repostEntries = [
    ...state.repostEntries,
    ...accountActivities.flatMap(activity => activity.reposts),
  ].filter((entry, index, entries) => entries.findIndex(candidate => candidate.id === entry.id) === index);
  const visibleNotifications = state.notifications
    .filter(notification => notification.recipientId
      ? notification.recipientId === actorId
      : actorId === demoCurrentUser.id)
    .filter(notification => !blockedAccountIds.has(notification.actorId)
      && (!notification.entityId || !blockedPostIds.has(notification.entityId)))
    .map(notification => ({
      ...notification,
      isRead: accountActivity.readNotificationIds.includes(notification.id)
        || (actorId === demoCurrentUser.id && notification.isRead),
    }));
  const visibleConversations = state.conversations
    .filter(conversation => conversation.participantIds.includes(actorId)
      && !conversation.participantIds.some(id => id !== actorId && blockedAccountIds.has(id)))
    .map(conversation => ({
      ...conversation,
      unreadCount: accountActivity.readConversationIds.includes(conversation.id) ? 0 : conversation.unreadCount,
    }));
  const visibleConversationIds = new Set(visibleConversations.map(conversation => conversation.id));
  const visibleMessages = state.messages
    .filter(message => visibleConversationIds.has(message.conversationId))
    .map(message => ({
      ...message,
      isRead: message.senderId === actorId
        ? message.isRead
        : accountActivity.readMessageIds.includes(message.id)
          || (actorId === demoCurrentUser.id && message.isRead),
    }));

  function updateCurrentActivity(
    update: (current: SocialAccountActivity) => SocialAccountActivity,
  ) {
    const next = updateSocialAccountActivity(activityByAccount, actorId, update);
    saveSocialAccountActivityMap(next);
    setActivityByAccount(next);
  }
  useEffect(() => {
    if (!isRemoteSocialSession) saveStoredFollowRequests(state.followRequests);
  }, [state.followRequests, isRemoteSocialSession]);

  useEffect(() => {
    if (!isRemoteSocialSession || !currentUser) {
      setRemoteBlockedUserIds([]);
      setRemoteFollowRequests([]);
      setSocialGraphError(null);
      setSocialGraphLoading(false);
      return;
    }

    let active = true;
    setSocialGraphLoading(true);
    setSocialGraphError(null);
    setRemoteBlockedUserIds([]);
    setRemoteFollowRequests([]);
    Promise.all([
      socialGraphApi.getMyAccount(),
      socialGraphApi.getIncomingFollowRequests(),
      socialGraphApi.getBlockedAccounts(),
    ]).then(([ownerAccount, requestsPage, blockedAccounts]) => {
      if (!active) return;
      const accountUser = myAccountToUser(ownerAccount);
      const incoming = requestsPage.items.map((request) =>
        followRequestToModel(request, ownerAccount.account.id),
      );
      const blockedUsers = blockedAccounts.items.map(accountViewToUser);
      const remoteUsers = [
        accountUser,
        ...requestsPage.items.map((request) => accountViewToUser(request.account)),
        ...blockedUsers,
      ];
      remoteUsers.forEach((user) => dispatch({ type: "ADD_USER", user }));
      updateAccount(accountUser);
      setRemoteFollowRequests(incoming);
      setRemoteBlockedUserIds(blockedUsers.map((user) => user.id));
    }).catch((error: unknown) => {
      if (!active) return;
      const message = error instanceof Error
        ? error.message
        : "Não foi possível carregar as conexões da conta.";
      setSocialGraphError(message);
      toast({
        title: "Falha ao carregar conexões",
        description: message,
        variant: "destructive",
      });
    }).finally(() => {
      if (active) setSocialGraphLoading(false);
    });

    return () => {
      active = false;
    };
  }, [currentUser?.id, isRemoteSocialSession, socialGraphRetry]);

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
        && state.followRequests.some(request =>
          request.requesterId === viewer.id && request.targetId === user.id
        ),
    isInCircle: isRemoteSocialSession
      ? user.source === "server" && Boolean(user.isInCircle)
      : viewer ? areMutualFollowers(viewer, user) : false,
  }));
  function assertSession(authorId: string) {
    if (!currentUser) throw new ContentServiceError("Entre na sua conta para continuar.", 401);
    if (authorId !== currentUser.id) throw new ContentServiceError("Você não tem permissão para publicar em nome de outra conta.", 403);
  }
  function assertReadable(postId: string) {
    const post = state.posts.find(item => item.id === postId);
    if (!post) throw new ContentServiceError("Conteúdo indisponível.", 404);
    const author = users.find(user => user.id === post.authorId);
    if (!canReadPost(
      post,
      currentUser?.id ?? (import.meta.env.DEV ? demoCurrentUser.id : ""),
       !!viewer && (isRemoteSocialSession
         ? Boolean(author?.isInCircle)
         : areMutualFollowers(viewer, author)),
      author?.isPrivate ?? false,
      author?.isFollowing ?? false,
    ))
      throw new ContentServiceError("Você não tem acesso a esta publicação.", 403);
    return post;
  }

  function showRefreshWarning() {
    toast({
      title: "Alteração salva",
      description: "Não foi possível atualizar todos os dados exibidos. Recarregue a tela.",
      variant: "destructive",
    });
  }

  const loadRemoteProfile = useCallback(async (username: string): Promise<User | null> => {
    if (!isRemoteSocialSession) return null;
    const normalizedUsername = username.trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) return null;
    const profile = await socialGraphApi.getProfileByUsername(normalizedUsername);
    const user = accountViewToUser(profile.account);
    dispatch({ type: "ADD_USER", user });
    return user;
  }, [isRemoteSocialSession]);

  const upsertRemoteUser = useCallback((user: User) => dispatch({
    type: "ADD_USER",
    user: { ...user, source: "server" },
  }), []);

  const relationshipActions = createSocialRelationshipActions({
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
  });
  const postActions = createSocialPostActions({
    state,
    currentUser,
    dispatch,
    updateCurrentActivity,
    assertSession,
    assertReadable,
  });
  const reviewActions = createSocialReviewActions({ state, currentUser, dispatch });
  const inboxActions = createSocialInboxActions({
    state,
    currentUser,
    users,
    actorId,
    visibleNotifications,
    visibleConversations,
    visibleConversationIds,
    updateCurrentActivity,
    dispatch,
  });

  const ctx: SocialContextType = {
    ...state,
    posts,
    postComments,
    repostEntries,
    notifications: visibleNotifications,
    conversations: visibleConversations,
    messages: visibleMessages,
    users,
    dispatch,
    isRemoteSocialSession,
    socialGraphLoading,
    socialGraphError,
    retrySocialGraph: () => setSocialGraphRetry((retry) => retry + 1),

    getPostById: (id) => posts.find(p => p.id === id),
    getUserById: (id) => {
      if (id === currentUser?.id) return currentUser;
      if (id === "me") return currentUser ?? (import.meta.env.DEV ? demoCurrentUser : undefined);
      return users.find(u => u.id === id);
    },
    getConversationMessages: (convId) => visibleConversationIds.has(convId)
      ? visibleMessages.filter(message => message.conversationId === convId) : [],
    unreadNotifications: visibleNotifications.filter(notification => !notification.isRead).length,
    unreadMessages: visibleConversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
    incomingFollowRequests: isRemoteSocialSession
      ? remoteFollowRequests.filter((request) => !blockedUserIdSet.has(request.requesterId))
      : state.followRequests.filter(request =>
        request.targetId === currentUser?.id
        && !blockedUserIdSet.has(request.requesterId)
        && !accountsBlockingViewerSet.has(request.requesterId)
      ),
    loadRemoteProfile,
    upsertRemoteUser,

    ...postActions,
    ...relationshipActions,
    addUser: (user) => {
      if (user.source !== "server") saveSocialAccount(user);
      dispatch({ type: "ADD_USER", user });
    },
    updateUser: (user) => {
      if (user.source !== "server") saveSocialAccount(user);
      dispatch({ type: "UPDATE_USER", user });
    },
    ...reviewActions,
    ...inboxActions,
  };

  return <SocialContext.Provider value={ctx}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial must be used within SocialProvider");
  return ctx;
}
