import type { Dispatch } from "react";
import type {
  Conversation,
  FollowRequest,
  Message,
  Post,
  SeekReview,
  User,
} from "@/data/mockData";
import type { SocialComment, SocialRepost, PublishPostInput } from "@/types/social/posts";
import type { SocialAction, SocialState } from "@/context/social/state";

export interface SocialContextType extends SocialState {
  dispatch: Dispatch<SocialAction>;
  getPostById: (id: string) => Post | undefined;
  getUserById: (id: string) => User | undefined;
  getConversationMessages: (convId: string) => Message[];
  unreadNotifications: number;
  unreadMessages: number;
  incomingFollowRequests: FollowRequest[];
  isRemoteSocialSession: boolean;
  socialGraphLoading: boolean;
  socialGraphError: string | null;
  retrySocialGraph: () => void;
  loadRemoteProfile: (username: string) => Promise<User | null>;
  upsertRemoteUser: (user: User) => void;
  toggleLike: (postId: string) => void;
  toggleRepost: (postId: string, actorId?: string) => void;
  publishPost: (input: PublishPostInput) => Promise<Post>;
  addComment: (
    postId: string,
    content: string,
    authorId: string,
    replyToCommentId?: string,
  ) => Promise<SocialComment>;
  toggleCommentLike: (commentId: string) => void;
  deletePost: (postId: string, authorId: string) => Promise<void>;
  toggleBookmark: (postId: string) => void;
  toggleFollow: (userId: string) => Promise<boolean>;
  blockUser: (userId: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;
  acceptFollowRequest: (requestId: string) => Promise<boolean>;
  declineFollowRequest: (requestId: string) => Promise<boolean>;
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
