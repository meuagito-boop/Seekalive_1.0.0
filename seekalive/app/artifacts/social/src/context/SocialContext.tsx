import React, { createContext, useContext, useEffect, useMemo, useReducer, useState, ReactNode } from "react";
import {
  Post, User, Notification, Conversation, Message, SeekReview, FollowRequest,
  mockPosts, mockUsers, mockNotifications, mockConversations, mockMessages, mockSeekReviews,
  currentUser as demoCurrentUser,
} from "@/data/mockData";
import { getStoredAccounts, saveSocialAccount } from "@/data/accountStorage";
import { getStoredFollowRequests, saveStoredFollowRequests } from "@/data/followRequestStorage";
import { getStoredSeekReviews, saveStoredSeekReviews } from "@/data/reviewStorage";
import { useAppContext } from "@/context/AppContext";
import type { PublishPostInput, SocialComment, SocialRepost } from "@/types/content";
import { contentService, ContentServiceError } from "@/services/contentService";
import { canReadPost, assertCommentParent, makeDemoMessage } from "@/services/contentValidation";
import { demoIntegrationPosts } from "@/data/demoIntegrationPosts";
import { demoSeekAccounts, demoSeekReviews, withDemoSeekMedia } from "@/data/demoSeekAccounts";
import { getPrivacyPreferences } from "@/data/appPreferences";
import { useAccountScopedIds } from "@/data/accountScopedStorage";
import {
  getSocialAccountActivity,
  readSocialAccountActivityMap,
  saveSocialAccountActivityMap,
  updateSocialAccountActivity,
} from "@/data/socialAccountActivityStorage";
import type { SocialAccountActivity } from "@/data/socialAccountActivityStorage";
import { areMutualFollowers, viewerFollowsUser } from "@/lib/followRelationships";

// ── State shape ──────────────────────────────────────────────────────
export interface SocialState {
  posts: Post[];
  users: User[];
  notifications: Notification[];
  conversations: Conversation[];
  messages: Message[];
  reviews: SeekReview[];
  postComments: SocialComment[];
  repostEntries: SocialRepost[];
  followRequests: FollowRequest[];
}

// ── Actions ──────────────────────────────────────────────────────────
type Action =
  | { type: "TOGGLE_LIKE"; postId: string }
  | { type: "TOGGLE_REPOST"; postId: string; actorId: string }
  | { type: "ADD_COMMENT"; comment: SocialComment }
  | { type: "TOGGLE_COMMENT_LIKE"; commentId: string }
  | { type: "DELETE_POST"; postId: string }
  | { type: "TOGGLE_BOOKMARK"; postId: string }
  | { type: "INCREMENT_COMMENTS"; postId: string }
  | { type: "ADD_USER"; user: User }
  | { type: "UPDATE_USER"; user: User }
  | { type: "UPSERT_SEEK_REVIEW"; review: SeekReview }
  | { type: "REPLY_TO_SEEK_REVIEW"; reviewId: string; businessAccountId: string; content: string }
  | { type: "ADD_POST"; post: Post }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  | { type: "MARK_NOTIFICATION_READ"; id: string }
  | { type: "MARK_CONVERSATION_READ"; convId: string }
  | { type: "SEND_MESSAGE"; message: Message }
  | { type: "ADD_FOLLOW_REQUEST"; request: FollowRequest }
  | { type: "REMOVE_FOLLOW_REQUEST"; requestId: string };


// ── Reducer ──────────────────────────────────────────────────────────
export function socialReducer(state: SocialState, action: Action): SocialState {
  switch (action.type) {

    case "TOGGLE_LIKE":
      return {
        ...state,
        posts: state.posts.map(p =>
          p.id !== action.postId ? p : {
            ...p,
            isLiked: !p.isLiked,
            likes: p.isLiked ? Math.max(0, p.likes - 1) : p.likes + 1,
          }
        ),
      };

    case "TOGGLE_REPOST": {
      const existing = state.repostEntries.find(entry => entry.postId === action.postId && entry.authorId === action.actorId);
      return {
        ...state,
        repostEntries: existing
          ? state.repostEntries.filter(entry => entry.id !== existing.id)
          : [{ id: `repost_${action.actorId}_${action.postId}`, postId: action.postId, authorId: action.actorId, createdAt: new Date().toISOString() }, ...state.repostEntries],
        posts: state.posts.map(p =>
          p.id !== action.postId ? p : {
            ...p,
            isReposted: !existing,
            reposts: existing ? Math.max(0, p.reposts - 1) : p.reposts + 1,
          }
        ),
      };
    }
    case "ADD_COMMENT":
      if (state.postComments.some(comment => comment.id === action.comment.id)) return state;
      return {
        ...state,
        postComments: [...state.postComments, action.comment],
        posts: state.posts.map(post => post.id === action.comment.postId ? { ...post, comments: post.comments + 1 } : post),
      };
    case "TOGGLE_COMMENT_LIKE":
      return {
        ...state,
        postComments: state.postComments.map(comment => comment.id === action.commentId
          ? { ...comment, isLiked: !comment.isLiked, likes: comment.isLiked ? Math.max(0, comment.likes - 1) : comment.likes + 1 } : comment),
      };
    case "DELETE_POST":
      return {
        ...state,
        posts: state.posts.filter(post => post.id !== action.postId),
        postComments: state.postComments.filter(comment => comment.postId !== action.postId),
        repostEntries: state.repostEntries.filter(entry => entry.postId !== action.postId),
      };

    case "TOGGLE_BOOKMARK":
      return {
        ...state,
        posts: state.posts.map(p =>
          p.id !== action.postId ? p : {
            ...p,
            isBookmarked: !p.isBookmarked,
          }
        ),
      };

    case "INCREMENT_COMMENTS":
      return {
        ...state,
        posts: state.posts.map(p =>
          p.id !== action.postId ? p : { ...p, comments: p.comments + 1 }
        ),
      };

    case "ADD_USER":
      return {
        ...state,
        users: state.users.some((user) => user.id === action.user.id)
          ? state.users.map((user) => user.id === action.user.id ? action.user : user)
          : [...state.users, action.user],
      };

    case "UPDATE_USER":
      return {
        ...state,
        users: state.users.map((user) => user.id === action.user.id ? action.user : user),
      };

    case "UPSERT_SEEK_REVIEW": {
      const existing = state.reviews.find(
        (review) =>
          review.businessAccountId === action.review.businessAccountId &&
          review.reviewerId === action.review.reviewerId,
      );
      if (!existing) return { ...state, reviews: [...state.reviews, action.review] };

      return {
        ...state,
        reviews: state.reviews.map((review) =>
          review.id === existing.id
            ? { ...action.review, id: existing.id, businessReply: existing.businessReply }
            : review,
        ),
      };
    }

    case "REPLY_TO_SEEK_REVIEW":
      return {
        ...state,
        reviews: state.reviews.map((review) =>
          review.id !== action.reviewId || review.businessAccountId !== action.businessAccountId
            ? review
            : {
                ...review,
                businessReply: {
                  content: action.content,
                  createdAt: new Date().toISOString(),
                },
              },
        ),
      };

    case "ADD_POST":
      return { ...state, posts: [action.post, ...state.posts] };

    case "MARK_ALL_NOTIFICATIONS_READ":
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      };

    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id !== action.id ? n : { ...n, isRead: true }
        ),
      };

    case "MARK_CONVERSATION_READ":
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id !== action.convId ? c : { ...c, unreadCount: 0 }
        ),
        messages: state.messages.map(m =>
          m.conversationId !== action.convId ? m : { ...m, isRead: true }
        ),
      };

    case "SEND_MESSAGE": {
      const newMsg = action.message;
      const conversation = state.conversations.find(item => item.id === newMsg.conversationId);
      if (!conversation?.participantIds.includes(newMsg.senderId) || state.messages.some(item => item.id === newMsg.id)) return state;
      return {
        ...state,
        messages: [...state.messages, newMsg],
        conversations: state.conversations.map(c =>
          c.id !== newMsg.conversationId ? c : { ...c, lastMessage: newMsg, unreadCount: 0 }
        ),
      };
    }

    case "ADD_FOLLOW_REQUEST":
      if (state.followRequests.some(request =>
        request.requesterId === action.request.requesterId &&
        request.targetId === action.request.targetId
      )) return state;
      return { ...state, followRequests: [...state.followRequests, action.request] };

    case "REMOVE_FOLLOW_REQUEST":
      return {
        ...state,
        followRequests: state.followRequests.filter(request => request.id !== action.requestId),
      };

    default:
      return state;
  }
}

// ── Initial state ─────────────────────────────────────────────────────
const initialState: SocialState = {
  posts: import.meta.env.DEV
    ? [...demoIntegrationPosts, ...mockPosts].map(p => ({ ...p, isLiked: false, isBookmarked: false, isReposted: false }))
    : [],
  users: import.meta.env.DEV ? [...mockUsers.map(withDemoSeekMedia), ...demoSeekAccounts] : [],
  notifications: import.meta.env.DEV ? [...mockNotifications] : [],
  conversations: import.meta.env.DEV ? [...mockConversations] : [],
  messages: import.meta.env.DEV ? [...mockMessages] : [],
  reviews: import.meta.env.DEV ? [...mockSeekReviews, ...demoSeekReviews] : [],
  postComments: [],
  repostEntries: [],
  followRequests: [],
};

function createInitialState(): SocialState {
  const usersById = new Map([...initialState.users, ...getStoredAccounts()].map((user) => [user.id, user]));
  const reviewsById = new Map([...initialState.reviews, ...getStoredSeekReviews()].map((review) => [review.id, review]));
  return {
    ...initialState,
    users: [...usersById.values()],
    reviews: [...reviewsById.values()],
    followRequests: getStoredFollowRequests(),
  };
}

// ── Context ───────────────────────────────────────────────────────────
interface SocialContextType extends SocialState {
  dispatch: React.Dispatch<Action>;
  // Derived selectors
  getPostById: (id: string) => Post | undefined;
  getUserById: (id: string) => User | undefined;
  getConversationMessages: (convId: string) => Message[];
  unreadNotifications: number;
  unreadMessages: number;
  incomingFollowRequests: FollowRequest[];
  // Action helpers
  toggleLike: (postId: string) => void;
  toggleRepost: (postId: string, actorId?: string) => void;
  publishPost: (input: PublishPostInput) => Promise<Post>;
  addComment: (postId: string, content: string, authorId: string, replyToCommentId?: string) => Promise<SocialComment>;
  toggleCommentLike: (commentId: string) => void;
  deletePost: (postId: string, authorId: string) => Promise<void>;
  toggleBookmark: (postId: string) => void;
  toggleFollow: (userId: string) => void;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  acceptFollowRequest: (requestId: string) => void;
  declineFollowRequest: (requestId: string) => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  addPost: (
    content: string,
    audience: "public" | "circles" | "private",
    authorId: string,
    mediaUrls?: string[],
    mediaTypes?: ("image" | "video")[],
  ) => void;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  markConversationRead: (convId: string) => void;
  sendMessage: (convId: string, content: string) => void;
  upsertSeekReview: (review: SeekReview) => void;
  replyToSeekReview: (reviewId: string, businessAccountId: string, content: string) => void;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────
export function SocialProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(socialReducer, undefined, createInitialState);
  const { currentUser, updateAccount } = useAppContext();
  const viewer = currentUser ?? (import.meta.env.DEV ? demoCurrentUser : null);
  const actorId = currentUser?.id ?? viewer?.id ?? "guest";
  const { ids: blockedUserIds, toggle: toggleBlockedUser } =
    useAccountScopedIds("seekalive-blocked-users", actorId);
  const blockedUserIdSet = new Set(blockedUserIds);
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
    .map(notification => ({
      ...notification,
      isRead: accountActivity.readNotificationIds.includes(notification.id)
        || (actorId === demoCurrentUser.id && notification.isRead),
    }));
  const visibleConversations = state.conversations
    .filter(conversation => conversation.participantIds.includes(actorId))
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
    saveStoredFollowRequests(state.followRequests);
  }, [state.followRequests]);

  const users = state.users.map((user) => ({
    ...user,
    isBlocked: blockedUserIdSet.has(user.id),
    isFollowing: viewer ? viewerFollowsUser(viewer, user) : false,
    followRequestSent: !!viewer && state.followRequests.some(request =>
      request.requesterId === viewer.id && request.targetId === user.id
    ),
    isInCircle: viewer ? areMutualFollowers(viewer, user) : false,
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
      !!viewer && areMutualFollowers(viewer, author),
      author?.isPrivate ?? false,
      author?.isFollowing ?? false,
    ))
      throw new ContentServiceError("Você não tem acesso a esta publicação.", 403);
    return post;
  }

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
    incomingFollowRequests: state.followRequests.filter(request => request.targetId === currentUser?.id),

    toggleLike: (postId) => updateCurrentActivity(current => ({
      ...current,
      likedPostIds: current.likedPostIds.includes(postId)
        ? current.likedPostIds.filter(id => id !== postId)
        : [...current.likedPostIds, postId],
    })),
    toggleRepost: (postId, actorId = currentUser?.id ?? "") => {
      assertSession(actorId);
      const post = assertReadable(postId);
      if (post.audience !== "public") throw new ContentServiceError("Somente publicações públicas podem ser repostadas.", 403);
      updateCurrentActivity(current => {
        const existing = current.reposts.some(repost => repost.postId === postId);
        return {
          ...current,
          reposts: existing
            ? current.reposts.filter(repost => repost.postId !== postId)
            : [...current.reposts, {
                id: `repost_${actorId}_${postId}`,
                postId,
                authorId: actorId,
                createdAt: new Date().toISOString(),
              }],
        };
      });
    },
    publishPost: async (input) => {
      assertSession(input.authorId);
      const post = await contentService.createPost(input);
      dispatch({ type: "ADD_POST", post });
      return post;
    },
    addComment: async (postId, content, authorId, replyToCommentId) => {
      assertSession(authorId);
      assertReadable(postId);
      assertCommentParent(state.postComments, postId, replyToCommentId);
      const comment = await contentService.createComment(postId, content, authorId, replyToCommentId);
      dispatch({ type: "ADD_COMMENT", comment });
      return comment;
    },
    toggleCommentLike: (commentId) => {
      if (!currentUser) throw new ContentServiceError("Entre na sua conta para curtir.", 401);
      const comment = state.postComments.find(item => item.id === commentId);
      if (!comment) throw new ContentServiceError("Comentário indisponível.", 404);
      assertReadable(comment.postId);
      updateCurrentActivity(current => ({
        ...current,
        likedCommentIds: current.likedCommentIds.includes(commentId)
          ? current.likedCommentIds.filter(id => id !== commentId)
          : [...current.likedCommentIds, commentId],
      }));
    },
    deletePost: async (postId, authorId) => {
      assertSession(authorId);
      const post = assertReadable(postId);
      if (post.authorId !== authorId) throw new ContentServiceError("Somente o autor pode excluir a publicação.", 403);
      dispatch({ type: "DELETE_POST", postId });
    },
    toggleBookmark: (postId) => updateCurrentActivity(current => ({
      ...current,
      bookmarkedPostIds: current.bookmarkedPostIds.includes(postId)
        ? current.bookmarkedPostIds.filter(id => id !== postId)
        : [...current.bookmarkedPostIds, postId],
    })),
    toggleFollow: (userId) => {
      const target = state.users.find(user => user.id === userId);
      if (!viewer || !target || target.id === viewer.id || blockedUserIdSet.has(userId)) return;
      const pendingRequest = state.followRequests.find(request =>
        request.requesterId === viewer.id && request.targetId === userId
      );
      if (pendingRequest) {
        dispatch({ type: "REMOVE_FOLLOW_REQUEST", requestId: pendingRequest.id });
        return;
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
        return;
      }

      const targetFollowsViewer = (target.followingIds ?? []).includes(viewer.id);
      const wasMutual = wasFollowing && targetFollowsViewer;
      const willBeMutual = !wasFollowing && targetFollowsViewer;
      const nextFollowingIds = (viewer.followingIds ?? [])
        .filter(id => id !== userId);
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
      saveSocialAccount(updatedTarget);
      dispatch({ type: "UPDATE_USER", user: updatedTarget });
      if (currentUser && state.users.some(user => user.id === currentUser.id))
        dispatch({ type: "UPDATE_USER", user: updatedViewer });
    },
    blockUser: (userId) => {
      if (!viewer || userId === viewer.id || !state.users.some(user => user.id === userId)) return;
      if (!blockedUserIdSet.has(userId)) toggleBlockedUser(userId);
    },
    unblockUser: (userId) => {
      if (blockedUserIdSet.has(userId)) toggleBlockedUser(userId);
    },
    acceptFollowRequest: (requestId) => {
      const targetAccount = currentUser;
      if (!targetAccount) return;
      const request = state.followRequests.find(item =>
        item.id === requestId && item.targetId === targetAccount.id
      );
      if (!request) return;

      const requester = state.users.find(user => user.id === request.requesterId);
      if (!requester) return;

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
        saveSocialAccount(updatedViewer);
        saveSocialAccount(updatedRequester);
        dispatch({ type: "UPDATE_USER", user: updatedViewer });
        dispatch({ type: "UPDATE_USER", user: updatedRequester });
      }
      dispatch({ type: "REMOVE_FOLLOW_REQUEST", requestId });
    },
    declineFollowRequest: (requestId) => {
      const request = state.followRequests.find(item =>
        item.id === requestId && item.targetId === currentUser?.id
      );
      if (request) dispatch({ type: "REMOVE_FOLLOW_REQUEST", requestId });
    },
    addUser: (user) => {
      saveSocialAccount(user);
      dispatch({ type: "ADD_USER", user });
    },
    updateUser: (user) => {
      saveSocialAccount(user);
      dispatch({ type: "UPDATE_USER", user });
    },
    upsertSeekReview: (review) => {
      const business = state.users.find((user) => user.id === review.businessAccountId && user.accountType === "commercial");
      if (!currentUser || review.reviewerId !== currentUser.id || !business || business.id === currentUser.id)
        throw new ContentServiceError("Esta conta não pode avaliar este comércio.", 403);
      if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5 || review.comment.trim().length < 10)
        throw new ContentServiceError("Escolha uma nota de 1 a 5 e escreva pelo menos 10 caracteres.", 422);
      const existing = state.reviews.find(
        (saved) =>
          saved.businessAccountId === review.businessAccountId &&
          saved.reviewerId === review.reviewerId,
      );
      const normalizedReview = existing
        ? { ...review, id: existing.id, businessReply: existing.businessReply }
        : review;
      const nextReviews = existing
        ? state.reviews.map((saved) => saved.id === existing.id ? normalizedReview : saved)
        : [...state.reviews, normalizedReview];
      saveStoredSeekReviews(nextReviews);
      dispatch({ type: "UPSERT_SEEK_REVIEW", review: normalizedReview });
    },
    replyToSeekReview: (reviewId, businessAccountId, content) => {
      if (!currentUser || currentUser.id !== businessAccountId || currentUser.accountType !== "commercial")
        throw new ContentServiceError("Somente o comércio pode responder à avaliação.", 403);
      if (!state.reviews.some((review) => review.id === reviewId && review.businessAccountId === businessAccountId))
        throw new ContentServiceError("Avaliação não encontrada.", 404);
      if (content.trim().length < 3) throw new ContentServiceError("Escreva uma resposta com pelo menos 3 caracteres.", 422);
      const nextReviews = state.reviews.map((review) =>
        review.id !== reviewId || review.businessAccountId !== businessAccountId
          ? review
          : { ...review, businessReply: { content, createdAt: new Date().toISOString() } },
      );
      saveStoredSeekReviews(nextReviews);
      dispatch({ type: "REPLY_TO_SEEK_REVIEW", reviewId, businessAccountId, content });
    },
    addPost: (content, audience, authorId, mediaUrls = [], mediaTypes = []) => dispatch({
      type: "ADD_POST",
      post: {
        id: `post_${Date.now()}`,
        authorId,
        content,
        mediaUrls,
        mediaTypes,
        audience,
        type: mediaTypes.includes("video") ? "video" : "text",
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        reposts: 0,
        shares: 0,
        isLiked: false,
        isReposted: false,
      },
    }),
    markAllNotificationsRead: () => updateCurrentActivity(current => ({
      ...current,
      readNotificationIds: [...new Set([...current.readNotificationIds, ...visibleNotifications.map(notification => notification.id)])],
    })),
    markNotificationRead: (id) => {
      if (!visibleNotifications.some(notification => notification.id === id)) return;
      updateCurrentActivity(current => ({
        ...current,
        readNotificationIds: current.readNotificationIds.includes(id)
          ? current.readNotificationIds
          : [...current.readNotificationIds, id],
      }));
    },
    markConversationRead: (convId) => {
      if (!visibleConversationIds.has(convId)) return;
      const messageIds = state.messages
        .filter(message => message.conversationId === convId && message.senderId !== actorId)
        .map(message => message.id);
      updateCurrentActivity(current => ({
        ...current,
        readConversationIds: current.readConversationIds.includes(convId)
          ? current.readConversationIds
          : [...current.readConversationIds, convId],
        readMessageIds: [...new Set([...current.readMessageIds, ...messageIds])],
      }));
    },
    sendMessage: (convId, content) => {
      const conversation = state.conversations.find(item => item.id === convId);
      const message = makeDemoMessage(conversation, currentUser?.id, content);
      const recipients = conversation?.participantIds
        .filter(id => id !== currentUser?.id)
        .map(id => users.find(user => user.id === id));
      if (recipients?.some(recipient => !recipient))
        throw new ContentServiceError("A pessoa desta conversa não está disponível.", 404);
      if (recipients?.some(recipient => recipient?.isBlocked))
        throw new ContentServiceError("Esta pessoa não está disponível para mensagens.", 403);
      const policies = (recipients ?? []).map(recipient => getPrivacyPreferences(recipient!.id).messages);
      if (policies.includes("nobody"))
        throw new ContentServiceError("Esta pessoa não está recebendo mensagens diretas.", 403);
      if (policies.includes("circle") && recipients?.some(recipient =>
        !areMutualFollowers(currentUser ?? undefined, recipient)))
        throw new ContentServiceError("Esta pessoa recebe mensagens apenas do próprio Círculo.", 403);
      dispatch({ type: "SEND_MESSAGE", message });
    },
  };

  return <SocialContext.Provider value={ctx}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial must be used within SocialProvider");
  return ctx;
}
