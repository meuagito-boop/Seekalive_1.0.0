import { getStoredAccounts } from "@/modules/profile/data/accountStorage";
import { getStoredFollowRequests } from "@/modules/social/data/followRequestStorage";
import { getStoredSeekReviews } from "@/modules/seek/data/reviewStorage";
import type { SocialComment, SocialRepost } from "@/modules/social/types/posts";
import {
  socialContentReducer,
  type SocialContentAction,
  type SocialContentState,
} from "@/modules/social/state/contentReducer";
import {
  socialGraphReducer,
  type SocialGraphAction,
  type SocialGraphState,
} from "@/modules/social/state/relationshipReducer";
import {
  seekReviewReducer,
  type SeekReviewAction,
  type SeekReviewState,
} from "@/modules/seek/state/reviewReducer";
import {
  notificationReducer,
  type NotificationAction,
  type NotificationState,
} from "@/modules/notifications/state/notificationReducer";
import {
  messageReducer,
  type MessageAction,
  type MessageState,
} from "@/modules/messages/state/messageReducer";

export interface SocialState
  extends
    SocialContentState,
    SocialGraphState,
    SeekReviewState,
    NotificationState,
    MessageState {}

export type SocialAction =
  | SocialContentAction
  | SocialGraphAction
  | SeekReviewAction
  | NotificationAction
  | MessageAction
  | { type: "HYDRATE_DEVELOPMENT_PREVIEW"; preview: SocialState };

export function canHydrateDevelopmentPreview(
  isDevelopmentBuild: boolean,
  isDevelopmentPreview: boolean,
): boolean {
  return isDevelopmentBuild && isDevelopmentPreview;
}

function mergeById<T extends { id: string }>(
  previewItems: T[],
  currentItems: T[],
): T[] {
  const merged = new Map(previewItems.map((item) => [item.id, item]));
  for (const item of currentItems) merged.set(item.id, item);
  return [...merged.values()];
}

export function mergeDevelopmentPreviewState(
  current: SocialState,
  preview: SocialState,
): SocialState {
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

export function socialReducer(
  state: SocialState,
  action: SocialAction,
): SocialState {
  switch (action.type) {
    case "HYDRATE_DEVELOPMENT_PREVIEW":
      return mergeDevelopmentPreviewState(state, action.preview);
    case "TOGGLE_LIKE":
    case "TOGGLE_REPOST":
    case "ADD_COMMENT":
    case "TOGGLE_COMMENT_LIKE":
    case "DELETE_POST":
    case "TOGGLE_BOOKMARK":
    case "INCREMENT_COMMENTS":
    case "ADD_POST":
      return { ...state, ...socialContentReducer(state, action) };
    case "ADD_USER":
    case "UPDATE_USER":
    case "ADD_FOLLOW_REQUEST":
    case "REMOVE_FOLLOW_REQUEST":
      return { ...state, ...socialGraphReducer(state, action) };
    case "UPSERT_SEEK_REVIEW":
    case "REPLY_TO_SEEK_REVIEW":
      return { ...state, ...seekReviewReducer(state, action) };
    case "MARK_ALL_NOTIFICATIONS_READ":
    case "MARK_NOTIFICATION_READ":
      return { ...state, ...notificationReducer(state, action) };
    case "MARK_CONVERSATION_READ":
    case "SEND_MESSAGE":
      return { ...state, ...messageReducer(state, action) };
  }
  return state;
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

export function createInitialState(includeBrowserState = true): SocialState {
  if (!includeBrowserState) return initialState;

  const usersById = new Map(getStoredAccounts().map((user) => [user.id, user]));
  const reviewsById = new Map(
    getStoredSeekReviews().map((review) => [review.id, review]),
  );
  return {
    ...initialState,
    users: [...usersById.values()],
    reviews: [...reviewsById.values()],
    followRequests: getStoredFollowRequests(),
  };
}
