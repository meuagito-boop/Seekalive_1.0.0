import React, { createContext, useContext, useReducer, ReactNode } from "react";
import {
  Post, User, Notification, Conversation, Message, SeekReview,
  mockPosts, mockUsers, mockNotifications, mockConversations, mockMessages, mockSeekReviews,
  currentUser as demoCurrentUser,
} from "@/data/mockData";
import { getStoredAccounts, saveSocialAccount } from "@/data/accountStorage";
import { getStoredSeekReviews, saveStoredSeekReviews } from "@/data/reviewStorage";
import { useAppContext } from "@/context/AppContext";
import type { PublishPostInput, SocialComment, SocialRepost } from "@/types/content";
import { contentService, ContentServiceError } from "@/services/contentService";
import { canReadPost, assertCommentParent, makeDemoMessage } from "@/services/contentValidation";
import { demoIntegrationPosts } from "@/data/demoIntegrationPosts";
import { demoSeekAccounts, demoSeekReviews, withDemoSeekMedia } from "@/data/demoSeekAccounts";

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
  | { type: "TOGGLE_FOLLOW"; userId: string }
  | { type: "ADD_USER"; user: User }
  | { type: "UPSERT_SEEK_REVIEW"; review: SeekReview }
  | { type: "REPLY_TO_SEEK_REVIEW"; reviewId: string; businessAccountId: string; content: string }
  | { type: "REQUEST_CIRCLE"; userId: string }
  | { type: "ACCEPT_CIRCLE"; userId: string }
  | { type: "CANCEL_CIRCLE"; userId: string }
  | { type: "ACCEPT_CIRCLE_NOTIFICATION"; actorId: string; notifId: string }
  | { type: "DECLINE_CIRCLE_NOTIFICATION"; actorId: string; notifId: string }
  | { type: "ADD_POST"; post: Post }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  | { type: "MARK_NOTIFICATION_READ"; id: string }
  | { type: "MARK_CONVERSATION_READ"; convId: string }
  | { type: "SEND_MESSAGE"; message: Message };

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

    case "TOGGLE_FOLLOW": {
      const user = state.users.find(u => u.id === action.userId);
      if (!user) return state;
      const wasFollowing = user.isFollowing ?? false;
      return {
        ...state,
        users: state.users.map(u =>
          u.id !== action.userId ? u : {
            ...u,
            isFollowing: !wasFollowing,
            stats: { ...u.stats, followers: wasFollowing ? u.stats.followers - 1 : u.stats.followers + 1 },
          }
        ),
      };
    }

    case "ADD_USER":
      return {
        ...state,
        users: state.users.some((user) => user.id === action.user.id)
          ? state.users.map((user) => user.id === action.user.id ? action.user : user)
          : [...state.users, action.user],
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

    case "REQUEST_CIRCLE":
      return {
        ...state,
        users: state.users.map(u =>
          u.id !== action.userId ? u : { ...u, circleStatus: "pending" }
        ),
      };

    case "ACCEPT_CIRCLE":
      return {
        ...state,
        users: state.users.map(u =>
          u.id !== action.userId ? u : {
            ...u,
            circleStatus: "accepted",
            isInCircle: true,
            stats: { ...u.stats, circles: u.stats.circles + 1 },
          }
        ),
      };

    case "CANCEL_CIRCLE":
      return {
        ...state,
        users: state.users.map(u =>
          u.id !== action.userId ? u : {
            ...u,
            circleStatus: null,
            isInCircle: false,
          }
        ),
      };

    case "ACCEPT_CIRCLE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id !== action.notifId ? n : { ...n, isRead: true }
        ),
        users: state.users.map(u =>
          u.id !== action.actorId ? u : { ...u, circleStatus: "accepted", isInCircle: true }
        ),
      };

    case "DECLINE_CIRCLE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id !== action.notifId ? n : { ...n, isRead: true }
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

    default:
      return state;
  }
}

// ── Initial state ─────────────────────────────────────────────────────
const initialState: SocialState = {
  posts: [...demoIntegrationPosts, ...mockPosts].map(p => ({ ...p, isBookmarked: false, isReposted: false })),
  users: import.meta.env?.DEV ? [...mockUsers.map(withDemoSeekMedia), ...demoSeekAccounts] : [...mockUsers],
  notifications: [...mockNotifications],
  conversations: [...mockConversations],
  messages: [...mockMessages],
  reviews: [...mockSeekReviews, ...(import.meta.env?.DEV ? demoSeekReviews : [])],
  postComments: [],
  repostEntries: [],
};

function createInitialState(): SocialState {
  const usersById = new Map([...initialState.users, ...getStoredAccounts()].map((user) => [user.id, user]));
  const reviewsById = new Map([...initialState.reviews, ...getStoredSeekReviews()].map((review) => [review.id, review]));
  return {
    ...initialState,
    users: [...usersById.values()],
    reviews: [...reviewsById.values()],
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
  // Action helpers
  toggleLike: (postId: string) => void;
  toggleRepost: (postId: string, actorId?: string) => void;
  publishPost: (input: PublishPostInput) => Promise<Post>;
  addComment: (postId: string, content: string, authorId: string, replyToCommentId?: string) => Promise<SocialComment>;
  toggleCommentLike: (commentId: string) => void;
  deletePost: (postId: string, authorId: string) => Promise<void>;
  toggleBookmark: (postId: string) => void;
  toggleFollow: (userId: string) => void;
  addUser: (user: User) => void;
  requestCircle: (userId: string) => void;
  acceptCircle: (userId: string) => void;
  cancelCircle: (userId: string) => void;
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
  acceptCircleNotification: (actorId: string, notifId: string) => void;
  declineCircleNotification: (actorId: string, notifId: string) => void;
  upsertSeekReview: (review: SeekReview) => void;
  replyToSeekReview: (reviewId: string, businessAccountId: string, content: string) => void;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────
export function SocialProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(socialReducer, undefined, createInitialState);
  const { currentUser } = useAppContext();
  function assertSession(authorId: string) {
    if (!currentUser) throw new ContentServiceError("Entre na sua conta para continuar.", 401);
    if (authorId !== currentUser.id) throw new ContentServiceError("Você não tem permissão para publicar em nome de outra conta.", 403);
  }
  function assertReadable(postId: string) {
    const post = state.posts.find(item => item.id === postId);
    if (!post) throw new ContentServiceError("Conteúdo indisponível.", 404);
    const author = state.users.find(user => user.id === post.authorId);
    if (!canReadPost(post, currentUser?.id, author?.isInCircle ?? false))
      throw new ContentServiceError("Você não tem acesso a esta publicação.", 403);
    return post;
  }

  const ctx: SocialContextType = {
    ...state,
    dispatch,

    getPostById: (id) => state.posts.find(p => p.id === id),
    getUserById: (id) => {
      if (id === currentUser?.id) return currentUser;
      if (id === "me") return demoCurrentUser;
      return state.users.find(u => u.id === id);
    },
    getConversationMessages: (convId) => currentUser && state.conversations.some(c => c.id === convId && c.participantIds.includes(currentUser.id))
      ? state.messages.filter(m => m.conversationId === convId) : [],
    unreadNotifications: state.notifications.filter(n => !n.isRead).length,
    unreadMessages: state.conversations.filter(c => currentUser && c.participantIds.includes(currentUser.id)).reduce((acc, c) => acc + c.unreadCount, 0),

    toggleLike: (postId) => dispatch({ type: "TOGGLE_LIKE", postId }),
    toggleRepost: (postId, actorId = currentUser?.id ?? "") => {
      assertSession(actorId);
      const post = assertReadable(postId);
      if (post.audience !== "public") throw new ContentServiceError("Somente publicações públicas podem ser repostadas.", 403);
      dispatch({ type: "TOGGLE_REPOST", postId, actorId });
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
      dispatch({ type: "TOGGLE_COMMENT_LIKE", commentId });
    },
    deletePost: async (postId, authorId) => {
      assertSession(authorId);
      const post = assertReadable(postId);
      if (post.authorId !== authorId) throw new ContentServiceError("Somente o autor pode excluir a publicação.", 403);
      dispatch({ type: "DELETE_POST", postId });
    },
    toggleBookmark: (postId) => dispatch({ type: "TOGGLE_BOOKMARK", postId }),
    toggleFollow: (userId) => dispatch({ type: "TOGGLE_FOLLOW", userId }),
    addUser: (user) => {
      saveSocialAccount(user);
      dispatch({ type: "ADD_USER", user });
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
    requestCircle: (userId) => dispatch({ type: "REQUEST_CIRCLE", userId }),
    acceptCircle: (userId) => dispatch({ type: "ACCEPT_CIRCLE", userId }),
    cancelCircle: (userId) => dispatch({ type: "CANCEL_CIRCLE", userId }),
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
    markAllNotificationsRead: () => dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" }),
    markNotificationRead: (id) => dispatch({ type: "MARK_NOTIFICATION_READ", id }),
    markConversationRead: (convId) => {
      if (currentUser && state.conversations.some(c => c.id === convId && c.participantIds.includes(currentUser.id)))
        dispatch({ type: "MARK_CONVERSATION_READ", convId });
    },
    sendMessage: (convId, content) => dispatch({
      type: "SEND_MESSAGE",
      message: makeDemoMessage(state.conversations.find(c => c.id === convId), currentUser?.id, content),
    }),
    acceptCircleNotification: (actorId, notifId) => dispatch({ type: "ACCEPT_CIRCLE_NOTIFICATION", actorId, notifId }),
    declineCircleNotification: (actorId, notifId) => dispatch({ type: "DECLINE_CIRCLE_NOTIFICATION", actorId, notifId }),
  };

  return <SocialContext.Provider value={ctx}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial must be used within SocialProvider");
  return ctx;
}
