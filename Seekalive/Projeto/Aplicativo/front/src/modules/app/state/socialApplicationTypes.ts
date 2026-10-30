import type { Dispatch } from "react";
import type {
  Conversation,
} from "@/modules/messages/types/conversation";
import type { FollowRequest } from "@/modules/social/types/followRequest";
import type { Message } from "@/modules/messages/types/message";
import type { Post } from "@/modules/social/types/post";
import type { SeekReview } from "@/modules/seek/types/review";
import type { User } from "@/modules/profile/types/user";
import type { SocialComment, SocialRepost, PublishPostInput } from "@/modules/social/types/posts";
import type { SocialAction, SocialState } from "@/modules/app/state/socialApplicationState";

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
  loadRemoteProfileContent: (
    accountId: string,
    cursor?: string,
  ) => Promise<{ items: Post[]; nextCursor: string | null }>;
  loadRemotePost: (postId: string) => Promise<Post | null>;
  loadPostComments: (
    postId: string,
    cursor?: string,
  ) => Promise<{ items: SocialComment[]; nextCursor: string | null }>;
  upsertRemoteUser: (user: User) => void;
  toggleLike: (postId: string) => Promise<void>;
  toggleRepost: (postId: string, actorId?: string) => Promise<void>;
  publishPost: (input: PublishPostInput) => Promise<Post>;
  addComment: (
    postId: string,
    content: string,
    authorId: string,
    replyToCommentId?: string,
    idempotencyKey?: string,
  ) => Promise<SocialComment>;
  toggleCommentLike: (commentId: string) => Promise<void>;
  deletePost: (postId: string, authorId: string) => Promise<void>;
  toggleBookmark: (postId: string) => Promise<void>;
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
