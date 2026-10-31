import { getStoredAccounts } from "@/modules/profile/data/accountStorage";
import { getStoredFollowRequests } from "@/modules/social/data/followRequestStorage";
import { getStoredBusinessProfileReviews } from "@/modules/profile/commercial-profile/data/businessProfileReviewStorage";
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
  businessProfileReviewReducer,
  type BusinessProfileReviewAction,
  type BusinessProfileReviewState,
} from "@/modules/profile/commercial-profile/state/businessProfileReviewReducer";
import type { NotificationState } from "@/modules/notifications/types/notification";
import {
  messageReducer,
  type MessageAction,
  type MessageState,
} from "@/modules/messages/state/messageReducer";

export interface SocialState
  extends
    SocialContentState,
    SocialGraphState,
    BusinessProfileReviewState,
    NotificationState,
    MessageState {}

export type SocialAction =
  | SocialContentAction
  | SocialGraphAction
  | BusinessProfileReviewAction
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
    remotePosts: mergeById(preview.remotePosts, current.remotePosts),
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
    case "UPSERT_POST":
    case "UPSERT_REMOTE_PROFILE_POSTS":
    case "HYDRATE_POST_COMMENTS":
    case "UPSERT_COMMENT":
    case "REMOVE_COMMENT":
      return { ...state, ...socialContentReducer(state, action) };
    case "ADD_USER":
    case "UPDATE_USER":
    case "ADD_FOLLOW_REQUEST":
    case "REMOVE_FOLLOW_REQUEST":
      return { ...state, ...socialGraphReducer(state, action) };
    case "PUBLISH_BUSINESS_PROFILE_REVIEW":
    case "DELETE_BUSINESS_PROFILE_REVIEW":
    case "REPLY_TO_BUSINESS_PROFILE_REVIEW":
      return { ...state, ...businessProfileReviewReducer(state, action) };
    case "MARK_CONVERSATION_READ":
    case "SEND_MESSAGE":
      return { ...state, ...messageReducer(state, action) };
  }
  return state;
}

const initialState: SocialState = {
  posts: [],
  remotePosts: [],
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
    getStoredBusinessProfileReviews().map((review) => [review.id, review]),
  );
  return {
    ...initialState,
    users: [...usersById.values()],
    reviews: [...reviewsById.values()],
    followRequests: getStoredFollowRequests(),
  };
}
