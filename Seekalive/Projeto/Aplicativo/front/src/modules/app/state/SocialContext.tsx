import { createContext, useCallback, useContext, useEffect, useReducer, useState } from "react";
import type { ReactNode } from "react";
import type { FollowRequest } from "@/modules/social/types/followRequest";
import type { User } from "@/modules/profile/types/user";
import { saveSocialAccount } from "@/modules/app/storage/accountStorage";
import { saveStoredFollowRequests } from "@/modules/social/data/followRequestStorage";
import { useAppContext } from "@/modules/app/state/AppContext";
import { toast } from "@/modules/shared/hooks/useToast";
import { ContentServiceError } from "@/modules/shared/content/contentService";
import {
  accountViewToUser,
  followRequestToModel,
  myAccountToUser,
  socialGraphApi,
} from "@/modules/social/services/socialGraphApi";
import { canReadPost } from "@/modules/shared/content/contentValidation";
import {
  useAccountScopedIds,
} from "@/modules/shared/storage/accountScopedStorage";
import {
  readSocialAccountActivityMap,
  saveSocialAccountActivityMap,
  updateSocialAccountActivity,
} from "@/modules/app/storage/socialAccountActivityStorage";
import type { SocialAccountActivity } from "@/modules/app/storage/socialAccountActivityStorage";
import {
  areMutualFollowers,
} from "@/modules/social/utils/followRelationships";
import { useSocialContextView } from "@/modules/social/hooks/useSocialContextView";
import { createSocialRelationshipActions } from "@/modules/social/services/relationshipActions";
import { createSocialPostActions } from "@/modules/social/services/postActions";
import { createSocialReviewActions } from "@/modules/seek/services/reviewActions";
import { createNotificationActions } from "@/modules/notifications/services/notificationActions";
import { createMessageActions } from "@/modules/messages/services/messageActions";
import {
  createInitialState,
  socialReducer,
} from "@/modules/app/state/socialState";
import type { SocialContextType } from "@/modules/app/state/socialContextTypes";

// ── Context ───────────────────────────────────────────────────────────
const SocialContext = createContext<SocialContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────
export function SocialProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(socialReducer, undefined, createInitialState);
  const { currentUser, updateAccount, isDevelopmentPreview } = useAppContext();
  const isRemoteSocialSession = Boolean(currentUser && !isDevelopmentPreview);
  const viewer = currentUser;
  const actorId = currentUser?.id ?? viewer?.id ?? "guest";
  const { ids: localBlockedUserIds, toggle: toggleBlockedUser } =
    useAccountScopedIds("seekalive-blocked-users", actorId);
  const [remoteBlockedUserIds, setRemoteBlockedUserIds] = useState<string[]>([]);
  const [remoteFollowRequests, setRemoteFollowRequests] = useState<FollowRequest[]>([]);
  const [socialGraphLoading, setSocialGraphLoading] = useState(false);
  const [socialGraphError, setSocialGraphError] = useState<string | null>(null);
  const [socialGraphRetry, setSocialGraphRetry] = useState(0);
  const [activityByAccount, setActivityByAccount] = useState(readSocialAccountActivityMap);
  const {
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
  } = useSocialContextView({
    state,
    currentUser,
    actorId,
    isRemoteSocialSession,
    isDevelopmentPreview,
    localBlockedUserIds,
    remoteBlockedUserIds,
    activityByAccount,
  });

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
    if (!import.meta.env.DEV) return;
    let active = true;
    void import("@/modules/app/data/demo/previewFixtures")
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
            description: "Não foi possível carregar os exemplos neste ambiente. Recarregue a página para tentar novamente.",
            variant: "destructive",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [dispatch]);

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
      currentUser?.id ?? "",
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
  const notificationActions = createNotificationActions({
    visibleNotifications,
    updateCurrentActivity,
  });
  const messageActions = createMessageActions({
    state,
    currentUser,
    users,
    actorId,
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
      if (id === "me") return currentUser ?? undefined;
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
    ...notificationActions,
    ...messageActions,
  };

  return <SocialContext.Provider value={ctx}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial must be used within SocialProvider");
  return ctx;
}
