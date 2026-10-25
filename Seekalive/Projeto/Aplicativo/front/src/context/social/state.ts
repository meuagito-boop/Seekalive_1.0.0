import type {
  Conversation,
  FollowRequest,
  Message,
  Notification,
  Post,
  SeekReview,
  User,
} from "@/data/mockData";
import { getStoredAccounts } from "@/data/accountStorage";
import { getStoredFollowRequests } from "@/data/followRequestStorage";
import { getStoredSeekReviews } from "@/data/reviewStorage";
import type { SocialComment, SocialRepost } from "@/types/social/posts";

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

export type SocialAction =
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
  | { type: "REMOVE_FOLLOW_REQUEST"; requestId: string }
  | { type: "HYDRATE_DEVELOPMENT_PREVIEW"; preview: SocialState };

function mergeById<T extends { id: string }>(previewItems: T[], currentItems: T[]): T[] {
  const merged = new Map(previewItems.map((item) => [item.id, item]));
  for (const item of currentItems) merged.set(item.id, item);
  return [...merged.values()];
}

export function mergeDevelopmentPreviewState(current: SocialState, preview: SocialState): SocialState {
  return {
    posts: mergeById(preview.posts, current.posts),
    users: mergeById(preview.users, current.users),
    notifications: mergeById(preview.notifications, current.notifications),
    conversations: mergeById(preview.conversations, current.conversations),
    messages: mergeById(preview.messages, current.messages),
    reviews: mergeById(preview.reviews, current.reviews),
    postComments: mergeById(preview.postComments, current.postComments),
    repostEntries: mergeById(preview.repostEntries, current.repostEntries),
    followRequests: mergeById(preview.followRequests, current.followRequests),
  };
}

export function socialReducer(state: SocialState, action: SocialAction): SocialState {
  switch (action.type) {
    case "HYDRATE_DEVELOPMENT_PREVIEW":
      return mergeDevelopmentPreviewState(state, action.preview);
    case "TOGGLE_LIKE":
      return {
        ...state,
        posts: state.posts.map((post) =>
          post.id !== action.postId
            ? post
            : {
                ...post,
                isLiked: !post.isLiked,
                likes: post.isLiked ? Math.max(0, post.likes - 1) : post.likes + 1,
              },
        ),
      };
    case "TOGGLE_REPOST": {
      const existing = state.repostEntries.find(
        (entry) => entry.postId === action.postId && entry.authorId === action.actorId,
      );
      return {
        ...state,
        repostEntries: existing
          ? state.repostEntries.filter((entry) => entry.id !== existing.id)
          : [{
              id: `repost_${action.actorId}_${action.postId}`,
              postId: action.postId,
              authorId: action.actorId,
              createdAt: new Date().toISOString(),
            }, ...state.repostEntries],
        posts: state.posts.map((post) =>
          post.id !== action.postId
            ? post
            : {
                ...post,
                isReposted: !existing,
                reposts: existing ? Math.max(0, post.reposts - 1) : post.reposts + 1,
              },
        ),
      };
    }
    case "ADD_COMMENT":
      if (state.postComments.some((comment) => comment.id === action.comment.id)) return state;
      return {
        ...state,
        postComments: [...state.postComments, action.comment],
        posts: state.posts.map((post) =>
          post.id === action.comment.postId ? { ...post, comments: post.comments + 1 } : post,
        ),
      };
    case "TOGGLE_COMMENT_LIKE":
      return {
        ...state,
        postComments: state.postComments.map((comment) =>
          comment.id !== action.commentId
            ? comment
            : {
                ...comment,
                isLiked: !comment.isLiked,
                likes: comment.isLiked ? Math.max(0, comment.likes - 1) : comment.likes + 1,
              },
        ),
      };
    case "DELETE_POST":
      return {
        ...state,
        posts: state.posts.filter((post) => post.id !== action.postId),
        postComments: state.postComments.filter((comment) => comment.postId !== action.postId),
        repostEntries: state.repostEntries.filter((entry) => entry.postId !== action.postId),
      };
    case "TOGGLE_BOOKMARK":
      return {
        ...state,
        posts: state.posts.map((post) =>
          post.id !== action.postId ? post : { ...post, isBookmarked: !post.isBookmarked },
        ),
      };
    case "INCREMENT_COMMENTS":
      return {
        ...state,
        posts: state.posts.map((post) =>
          post.id !== action.postId ? post : { ...post, comments: post.comments + 1 },
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
          review.businessAccountId === action.review.businessAccountId
          && review.reviewerId === action.review.reviewerId,
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
                businessReply: { content: action.content, createdAt: new Date().toISOString() },
              },
        ),
      };
    case "ADD_POST":
      return { ...state, posts: [action.post, ...state.posts] };
    case "MARK_ALL_NOTIFICATIONS_READ":
      return { ...state, notifications: state.notifications.map((notification) => ({ ...notification, isRead: true })) };
    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.id === action.id ? { ...notification, isRead: true } : notification,
        ),
      };
    case "MARK_CONVERSATION_READ":
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.convId ? { ...conversation, unreadCount: 0 } : conversation,
        ),
        messages: state.messages.map((message) =>
          message.conversationId === action.convId ? { ...message, isRead: true } : message,
        ),
      };
    case "SEND_MESSAGE": {
      const message = action.message;
      const conversation = state.conversations.find((item) => item.id === message.conversationId);
      if (
        !conversation?.participantIds.includes(message.senderId)
        || state.messages.some((item) => item.id === message.id)
      ) return state;
      return {
        ...state,
        messages: [...state.messages, message],
        conversations: state.conversations.map((item) =>
          item.id === message.conversationId
            ? { ...item, lastMessage: message, unreadCount: 0 }
            : item,
        ),
      };
    }
    case "ADD_FOLLOW_REQUEST":
      if (state.followRequests.some(
        (request) =>
          request.requesterId === action.request.requesterId
          && request.targetId === action.request.targetId,
      )) return state;
      return { ...state, followRequests: [...state.followRequests, action.request] };
    case "REMOVE_FOLLOW_REQUEST":
      return {
        ...state,
        followRequests: state.followRequests.filter((request) => request.id !== action.requestId),
      };
    default:
      return state;
  }
}

const initialState: SocialState = {
  posts: [],
  users: [],
  notifications: [],
  conversations: [],
  messages: [],
  reviews: [],
  postComments: [],
  repostEntries: [],
  followRequests: [],
};

export function createInitialState(): SocialState {
  const usersById = new Map(getStoredAccounts().map((user) => [user.id, user]));
  const reviewsById = new Map(getStoredSeekReviews().map((review) => [review.id, review]));
  return {
    ...initialState,
    posts: [],
    notifications: [],
    conversations: [],
    messages: [],
    postComments: [],
    repostEntries: [],
    users: [...usersById.values()],
    reviews: [...reviewsById.values()],
    followRequests: getStoredFollowRequests(),
  };
}
