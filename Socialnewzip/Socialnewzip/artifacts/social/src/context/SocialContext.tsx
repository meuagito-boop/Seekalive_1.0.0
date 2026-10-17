import React, { createContext, useContext, useReducer, ReactNode } from "react";
import {
  Post, User, Notification, Conversation, Message, SeekReview,
  mockPosts, mockUsers, mockNotifications, mockConversations, mockMessages, mockSeekReviews,
} from "@/data/mockData";
import { getStoredAccounts, saveSocialAccount } from "@/data/accountStorage";
import { getStoredSeekReviews, saveStoredSeekReviews } from "@/data/reviewStorage";

// ── State shape ──────────────────────────────────────────────────────
interface SocialState {
  posts: Post[];
  users: User[];
  notifications: Notification[];
  conversations: Conversation[];
  messages: Message[];
  reviews: SeekReview[];
}

// ── Actions ──────────────────────────────────────────────────────────
type Action =
  | { type: "TOGGLE_LIKE"; postId: string }
  | { type: "TOGGLE_REPOST"; postId: string }
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
  | { type: "SEND_MESSAGE"; convId: string; content: string };

// ── Reducer ──────────────────────────────────────────────────────────
function reducer(state: SocialState, action: Action): SocialState {
  switch (action.type) {

    case "TOGGLE_LIKE":
      return {
        ...state,
        posts: state.posts.map(p =>
          p.id !== action.postId ? p : {
            ...p,
            isLiked: !p.isLiked,
            likes: p.isLiked ? p.likes - 1 : p.likes + 1,
          }
        ),
      };

    case "TOGGLE_REPOST":
      return {
        ...state,
        posts: state.posts.map(p =>
          p.id !== action.postId ? p : {
            ...p,
            isReposted: !p.isReposted,
            reposts: p.isReposted ? p.reposts - 1 : p.reposts + 1,
          }
        ),
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
      const newMsg: Message = {
        id: `msg_${Date.now()}`,
        conversationId: action.convId,
        senderId: "me",
        content: action.content,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        messages: [...state.messages, newMsg],
        conversations: state.conversations.map(c =>
          c.id !== action.convId ? c : { ...c, lastMessage: newMsg }
        ),
      };
    }

    default:
      return state;
  }
}

// ── Initial state ─────────────────────────────────────────────────────
const initialState: SocialState = {
  posts: mockPosts.map(p => ({ ...p, isBookmarked: false })),
  users: [...mockUsers],
  notifications: [...mockNotifications],
  conversations: [...mockConversations],
  messages: [...mockMessages],
  reviews: [...mockSeekReviews],
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
  toggleRepost: (postId: string) => void;
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
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  const ctx: SocialContextType = {
    ...state,
    dispatch,

    getPostById: (id) => state.posts.find(p => p.id === id),
    getUserById: (id) => {
      if (id === "me") {
        // return currentUser — import avoids circular dep by using mockData directly
        return {
          id: "me",
          username: "orbit_user",
          displayName: "Orbit User",
          bio: "Exploring the universe of ideas. Building something new every day.",
          avatarUrl: "https://i.pravatar.cc/150?img=68",
          coverUrl: "https://picsum.photos/800/200?random=100",
          location: "Internet",
          website: "https://orbit.social",
          joinedAt: new Date().toISOString(),
          accountType: "personal",
          stats: { posts: 12, followers: 142, following: 38, circles: 5 },
        };
      }
      return state.users.find(u => u.id === id);
    },
    getConversationMessages: (convId) => state.messages.filter(m => m.conversationId === convId),
    unreadNotifications: state.notifications.filter(n => !n.isRead).length,
    unreadMessages: state.conversations.reduce((acc, c) => acc + c.unreadCount, 0),

    toggleLike: (postId) => dispatch({ type: "TOGGLE_LIKE", postId }),
    toggleRepost: (postId) => dispatch({ type: "TOGGLE_REPOST", postId }),
    toggleBookmark: (postId) => dispatch({ type: "TOGGLE_BOOKMARK", postId }),
    toggleFollow: (userId) => dispatch({ type: "TOGGLE_FOLLOW", userId }),
    addUser: (user) => {
      saveSocialAccount(user);
      dispatch({ type: "ADD_USER", user });
    },
    upsertSeekReview: (review) => {
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
    markConversationRead: (convId) => dispatch({ type: "MARK_CONVERSATION_READ", convId }),
    sendMessage: (convId, content) => dispatch({ type: "SEND_MESSAGE", convId, content }),
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
