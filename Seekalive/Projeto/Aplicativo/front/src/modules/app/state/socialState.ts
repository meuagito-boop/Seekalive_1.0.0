import type { Conversation, Message } from "@/modules/messages/types/message";
import type { FollowRequest } from "@/modules/social/types/followRequest";
import type { Notification } from "@/modules/notifications/types/notification";
import type { Post } from "@/modules/social/types/post";
import type { SeekReview } from "@/modules/seek/types/review";
import type { User } from "@/modules/profile/types/user";
import { getStoredAccounts } from "@/modules/app/storage/accountStorage";
import { getStoredFollowRequests } from "@/modules/social/data/followRequestStorage";
import { getStoredSeekReviews } from "@/modules/seek/data/reviewStorage";
import type { SocialComment, SocialRepost } from "@/modules/social/types/content";
import { reduceSocialContent } from "@/modules/social/state/contentReducer";
import { reduceSocialRelationships } from "@/modules/social/state/relationshipReducer";
import { reduceSeekReviews } from "@/modules/seek/state/reviewReducer";
import { reduceNotifications } from "@/modules/notifications/state/notificationReducer";
import { reduceMessages } from "@/modules/messages/state/messageReducer";

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
  if (action.type === "HYDRATE_DEVELOPMENT_PREVIEW") {
    return mergeDevelopmentPreviewState(state, action.preview);
  }
  return reduceSocialContent(state, action)
    ?? reduceSocialRelationships(state, action)
    ?? reduceSeekReviews(state, action)
    ?? reduceNotifications(state, action)
    ?? reduceMessages(state, action)
    ?? state;
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
    users: [...usersById.values()],
    reviews: [...reviewsById.values()],
    followRequests: getStoredFollowRequests(),
  };
}
