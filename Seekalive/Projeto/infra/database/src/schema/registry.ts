import {
  accountEmails,
  accountInterests,
  accountUsernameReservations,
  accounts,
} from "./accounts/schema";
import { feedPosts } from "./feed/posts";
import { feedPostTags } from "./feed/postTags";
import { feedPostReferences } from "./feed/postReferences";
import { feedPostLikes } from "./feed/postLikes";
import { feedPostReposts } from "./feed/postReposts";
import { feedPostBookmarks } from "./feed/postBookmarks";
import { feedPostComments } from "./feed/postComments";
import { feedCommentLikes } from "./feed/commentLikes";
import { mediaAssets } from "./media/assets";
import {
  accountBlocks,
  accountFollows,
  accountFollowRequests,
} from "./profiles/relationships";
import { accountProfiles } from "./profiles/accountProfiles";
import { commercialProfiles } from "./profiles/businessProfiles";
import { businessProfileReviews } from "./profiles/businessProfileReviews";
import {
  authChallenges,
  passwordCredentials,
  sessions,
  trustedDevices,
} from "./security/schema";

// Runtime registry for Drizzle's relational query API. Each table is imported
// from the schema module that owns it; this object does not transfer ownership.
export const databaseSchema = {
  accounts,
  accountEmails,
  accountInterests,
  accountUsernameReservations,
  passwordCredentials,
  authChallenges,
  sessions,
  trustedDevices,
  accountFollows,
  accountFollowRequests,
  accountBlocks,
  feedPosts,
  feedPostTags,
  feedPostReferences,
  feedPostLikes,
  feedPostReposts,
  feedPostBookmarks,
  feedPostComments,
  feedCommentLikes,
  mediaAssets,
  accountProfiles,
  commercialProfiles,
  businessProfileReviews,
};

export {
  accountEmails,
  accountInterests,
  accountUsernameReservations,
  accounts,
  accountProfiles,
  authChallenges,
  commercialProfiles,
  businessProfileReviews,
  accountBlocks,
  accountFollows,
  accountFollowRequests,
  feedPosts,
  feedPostTags,
  feedPostReferences,
  feedPostLikes,
  feedPostReposts,
  feedPostBookmarks,
  feedPostComments,
  feedCommentLikes,
  mediaAssets,
  passwordCredentials,
  sessions,
  trustedDevices,
};

export {
  accountsNamespace,
  feedNamespace,
  locationNamespace,
  mediaNamespace,
  messagesNamespace,
  notificationsNamespace,
  profilesNamespace,
  searchNamespace,
  securityNamespace,
  seekNamespace,
  trustSafetyNamespace,
} from "./config";
