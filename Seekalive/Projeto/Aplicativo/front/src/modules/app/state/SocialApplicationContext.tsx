import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import type { ReactNode } from "react";
import { usernameFormatSchema } from "@workspace/api-zod";
import type { User } from "@/modules/profile/types/user";
import type { Post } from "@/modules/social/types/post";
import type { SocialComment } from "@/modules/social/types/posts";
import { saveSocialAccount } from "@/modules/profile/data/accountStorage";
import { saveStoredFollowRequests } from "@/modules/social/data/followRequestStorage";
import { useAppContext } from "@/modules/app/state/AppContext";
import { toast } from "@/hooks/use-toast";
import {
  accountViewToUser,
  myAccountToUser,
  profileResponseToPosts,
  profileResponseToUser,
  socialGraphApi,
} from "@/modules/social/services/socialGraphApi";
import { restSocialApi } from "@/modules/social/services/restContracts";
import { readAccountScopedIdsMap } from "@/modules/app/persistence/browserAccountStorage";
import { useAccountScopedIds } from "@/modules/app/hooks/useAccountScopedIds";
import { getAccountBlockProjection } from "@/modules/social/application/blockProjection";
import {
  getAccountActivity,
  readAccountActivityMap,
  saveAccountActivityMap,
  updateAccountActivity,
} from "@/modules/app/persistence/accountActivityStorage";
import type { AccountActivity } from "@/modules/app/persistence/accountActivityStorage";
import { createSocialRelationshipActions } from "@/modules/social/application/relationshipActions";
import { createSocialPostActions } from "@/modules/social/application/postActions";
import { createPostAccessPolicy } from "@/modules/social/application/postAccessPolicy";
import { createSeekReviewActions } from "@/modules/seek/application/reviewActions";
import { createMarkConversationReadAction } from "@/modules/messages/application/markConversationRead";
import { createSendMessageAction } from "@/modules/messages/application/sendMessage";
import { createNotificationActions } from "@/modules/notifications/application/notificationActions";
import { getPrivacyPreferences } from "@/modules/settings/data/privacyPreferences";
import { areMutualFollowers } from "@/modules/social/domain/followRelationships";
import { useRemoteSocialGraph } from "@/modules/social/hooks/useRemoteSocialGraph";
import { selectSocialView } from "@/modules/social/application/selectSocialView";
import { selectVisibleMessages } from "@/modules/messages/application/selectVisibleMessages";
import { selectVisibleNotifications } from "@/modules/notifications/application/selectVisibleNotifications";
import {
  canHydrateDevelopmentPreview,
  createInitialState,
  socialReducer,
} from "@/modules/app/state/socialApplicationState";
import type { SocialContextType } from "@/modules/app/state/socialApplicationTypes";

// ── Context ───────────────────────────────────────────────────────────
const SocialContext = createContext<SocialContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────
export function SocialProvider({ children }: { children: ReactNode }) {
  const { currentUser, updateAccount, isDevelopmentPreview } = useAppContext();
  const [state, dispatch] = useReducer(
    socialReducer,
    isDevelopmentPreview,
    createInitialState,
  );
  const isRemoteSocialSession = Boolean(currentUser && !isDevelopmentPreview);
  const viewer = currentUser;
  const actorId = currentUser?.id ?? viewer?.id ?? "guest";
  const addRemoteGraphUser = useCallback(
    (user: User) => dispatch({ type: "ADD_USER", user }),
    [dispatch],
  );
  const {
    blockedUserIds: remoteBlockedUserIds,
    setBlockedUserIds: setRemoteBlockedUserIds,
    followRequests: remoteFollowRequests,
    setFollowRequests: setRemoteFollowRequests,
    loading: socialGraphLoading,
    error: socialGraphError,
    retrySocialGraph,
  } = useRemoteSocialGraph({
    currentUser: currentUser ?? undefined,
    isRemoteSocialSession,
    addRemoteUser: addRemoteGraphUser,
    updateAccount,
  });
  const { ids: localBlockedUserIds, toggle: toggleBlockedUser } =
    useAccountScopedIds("seekalive-blocked-users", actorId);
  const blockedUserIds = isRemoteSocialSession
    ? remoteBlockedUserIds
    : localBlockedUserIds;
  const blockedUserIdSet = new Set(blockedUserIds);
  const blockRelations = readAccountScopedIdsMap("seekalive-blocked-users");
  const blockProjection = getAccountBlockProjection(blockRelations, actorId);
  const accountsBlockingViewerSet = isRemoteSocialSession
    ? new Set<string>()
    : new Set(blockProjection.blockingViewerIds);
  const blockedAccountIds = new Set(blockProjection.unavailableAccountIds);
  const [activityByAccount, setActivityByAccount] = useState(
    readAccountActivityMap,
  );
  const accountActivity = useMemo(
    () => getAccountActivity(activityByAccount, actorId),
    [activityByAccount, actorId],
  );
  const socialView = selectSocialView({
    posts: state.posts,
    comments: state.postComments,
    repostEntries: state.repostEntries,
    users: state.users,
    followRequests: state.followRequests,
    viewer,
    isRemoteSocialSession,
    blockedUserIds: blockedUserIdSet,
    accountsBlockingViewerIds: accountsBlockingViewerSet,
    blockedAccountIds,
    accountActivity,
    accountActivities: Object.values(activityByAccount),
  });
  const {
    blockedPostIds,
    posts,
    comments: postComments,
    repostEntries,
    users,
  } = socialView;
  const visibleNotifications = selectVisibleNotifications({
    notifications: state.notifications,
    actorId,
    currentUserId: currentUser?.id,
    isDevelopmentPreview,
    blockedAccountIds,
    blockedPostIds,
    readNotificationIds: accountActivity.readNotificationIds,
  });
  const { visibleConversations, visibleMessages, visibleConversationIds } =
    selectVisibleMessages({
      conversations: state.conversations,
      messages: state.messages,
      actorId,
      currentUserId: currentUser?.id,
      isDevelopmentPreview,
      blockedAccountIds,
      readConversationIds: accountActivity.readConversationIds,
      readMessageIds: accountActivity.readMessageIds,
    });
  const { assertSession, assertReadable } = createPostAccessPolicy({
    posts: [...state.posts, ...state.remotePosts],
    users,
    currentUser,
    viewer,
    isRemoteSocialSession,
  });

  function updateCurrentActivity(
    update: (current: AccountActivity) => AccountActivity,
  ) {
    const next = updateAccountActivity(activityByAccount, actorId, update);
    saveAccountActivityMap(next);
    setActivityByAccount(next);
  }
  useEffect(() => {
    if (!isRemoteSocialSession) saveStoredFollowRequests(state.followRequests);
  }, [state.followRequests, isRemoteSocialSession]);

  useEffect(() => {
    if (
      !canHydrateDevelopmentPreview(import.meta.env.DEV, isDevelopmentPreview)
    )
      return;
    let active = true;
    void import("@/data/demo/previewFixtures")
      .then(({ createDevelopmentPreviewState }) => {
        if (active) {
          dispatch({
            type: "HYDRATE_DEVELOPMENT_PREVIEW",
            preview: createDevelopmentPreviewState(),
          });
        }
      })
      .catch(() => {
        if (active) {
          toast({
            title: "Dados de demonstração indisponíveis",
            description:
              "Não foi possível carregar os exemplos neste ambiente. Recarregue a página para tentar novamente.",
            variant: "destructive",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [dispatch, isDevelopmentPreview]);

  function showRefreshWarning() {
    toast({
      title: "Alteração salva",
      description:
        "Não foi possível atualizar todos os dados exibidos. Recarregue a tela.",
      variant: "destructive",
    });
  }

  const loadRemoteProfile = useCallback(
    async (username: string): Promise<User | null> => {
      if (!isRemoteSocialSession) return null;
      const parsedUsername = usernameFormatSchema.safeParse(
        username.trim().replace(/^@/, "").toLowerCase(),
      );
      if (!parsedUsername.success) return null;
      const profile = await socialGraphApi.getProfileByUsername(
        parsedUsername.data,
      );
      const user = profileResponseToUser(profile);
      dispatch({ type: "ADD_USER", user });
      dispatch({
        type: "UPSERT_REMOTE_PROFILE_POSTS",
        authorId: user.id,
        posts: profileResponseToPosts(profile),
        append: false,
      });
      return user;
    },
    [isRemoteSocialSession],
  );

  const loadRemotePost = useCallback(
    async (postId: string): Promise<Post | null> => {
      if (!isRemoteSocialSession) return null;
      const post = await restSocialApi.post(postId);
      const profile = await socialGraphApi.getProfileByAccountId(post.authorId);
      const author = accountViewToUser(profile);
      dispatch({ type: "ADD_USER", user: author });
      dispatch({ type: "UPSERT_POST", post });
      return post;
    },
    [isRemoteSocialSession],
  );

  const loadRemoteProfileContent = useCallback(
    async (accountId: string, cursor?: string) => {
      if (!isRemoteSocialSession) {
        return { items: [] as Post[], nextCursor: null };
      }
      const page = await restSocialApi.profilePosts(accountId, cursor, 100);
      dispatch({
        type: "UPSERT_REMOTE_PROFILE_POSTS",
        authorId: accountId,
        posts: page.items,
        append: Boolean(cursor),
      });
      return page;
    },
    [isRemoteSocialSession],
  );

  const loadPostComments = useCallback(
    async (postId: string, cursor?: string) => {
      if (!isRemoteSocialSession) {
        return { items: [] as SocialComment[], nextCursor: null };
      }
      const page = await restSocialApi.comments(postId, cursor);
      dispatch({
        type: "HYDRATE_POST_COMMENTS",
        postId,
        comments: page.items,
        replace: !cursor,
      });
      return page;
    },
    [isRemoteSocialSession],
  );

  const upsertRemoteUser = useCallback(
    (user: User) =>
      dispatch({
        type: "ADD_USER",
        user: { ...user, source: "server" },
      }),
    [],
  );

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
    savePreviewAccount: saveSocialAccount,
  });
  const postActions = createSocialPostActions({
    state,
    currentUser,
    dispatch,
    updateCurrentActivity,
    assertSession,
    assertReadable,
    isRemoteSocialSession,
  });
  const reviewActions = createSeekReviewActions({
    state,
    currentUser,
    dispatch,
  });
  const markConversationRead = createMarkConversationReadAction({
    state,
    actorId,
    visibleConversationIds,
    updateCurrentActivity,
  });
  const sendMessage = createSendMessageAction({
    state,
    currentUser,
    users,
    dispatch,
    getRecipientMessagePolicy: (recipientAccountId) =>
      getPrivacyPreferences(recipientAccountId).messages,
    isMutualFollower: (recipient) =>
      areMutualFollowers(currentUser ?? undefined, recipient),
  });
  const notificationActions = createNotificationActions({
    visibleNotifications,
    updateCurrentActivity,
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
    retrySocialGraph,

    getPostById: (id) =>
      posts.find((p) => p.id === id) ??
      state.remotePosts.find((post) => post.id === id),
    getUserById: (id) => {
      if (id === currentUser?.id) return currentUser;
      if (id === "me") return currentUser ?? undefined;
      return users.find((u) => u.id === id);
    },
    getConversationMessages: (convId) =>
      visibleConversationIds.has(convId)
        ? visibleMessages.filter((message) => message.conversationId === convId)
        : [],
    unreadNotifications: visibleNotifications.filter(
      (notification) => !notification.isRead,
    ).length,
    unreadMessages: visibleConversations.reduce(
      (total, conversation) => total + conversation.unreadCount,
      0,
    ),
    incomingFollowRequests: isRemoteSocialSession
      ? remoteFollowRequests.filter(
          (request) => !blockedUserIdSet.has(request.requesterId),
        )
      : state.followRequests.filter(
          (request) =>
            request.targetId === currentUser?.id &&
            !blockedUserIdSet.has(request.requesterId) &&
            !accountsBlockingViewerSet.has(request.requesterId),
        ),
    loadRemoteProfile,
    loadRemoteProfileContent,
    loadRemotePost,
    loadPostComments,
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
    markConversationRead,
    sendMessage,
    ...notificationActions,
  };

  return (
    <SocialContext.Provider value={ctx}>{children}</SocialContext.Provider>
  );
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial must be used within SocialProvider");
  return ctx;
}
