import React, { createContext, useContext, useReducer, ReactNode } from "react";
import {
  Post, User, Notification, Conversation, Message,
  mockPosts, mockUsers, mockNotifications, mockConversations, mockMessages,
} from "@/data/mockData";

// ── State shape ──────────────────────────────────────────────────────
interface SocialState {
  posts: Post[];
  users: User[];
  notifications: Notification[];
  conversations: Conversation[];
  messages: Message[];
}

// ── Actions ──────────────────────────────────────────────────────────
type Action =
  | { type: "TOGGLE_LIKE"; postId: string }
  | { type: "TOGGLE_REPOST"; postId: string }
  | { type: "TOGGLE_BOOKMARK"; postId: string }
  | { type: "INCREMENT_COMMENTS"; postId: string }
  | { type: "TOGGLE_FOLLOW"; userId: string }
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
};

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
  requestCircle: (userId: string) => void;
  acceptCircle: (userId: string) => void;
  cancelCircle: (userId: string) => void;
  addPost: (content: string, audience: "public" | "circles" | "private") => void;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  markConversationRead: (convId: string) => void;
  sendMessage: (convId: string, content: string) => void;
  acceptCircleNotification: (actorId: string, notifId: string) => void;
  declineCircleNotification: (actorId: string, notifId: string) => void;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────
export function SocialProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

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
    requestCircle: (userId) => dispatch({ type: "REQUEST_CIRCLE", userId }),
    acceptCircle: (userId) => dispatch({ type: "ACCEPT_CIRCLE", userId }),
    cancelCircle: (userId) => dispatch({ type: "CANCEL_CIRCLE", userId }),
    addPost: (content, audience) => dispatch({
      type: "ADD_POST",
      post: {
        id: `post_${Date.now()}`,
        authorId: "me",
        content,
        audience,
        type: "text",
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
