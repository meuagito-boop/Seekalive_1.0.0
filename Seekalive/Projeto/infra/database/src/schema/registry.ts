import {
  accountEmails,
  accountInterests,
  accountUsernameReservations,
  accounts,
} from "./accounts/schema";
import { feedPosts } from "./feed/posts";
import {
  accountBlocks,
  accountFollows,
  accountFollowRequests,
} from "./profiles/relationships";
import { commercialProfiles } from "./seek/businessProfiles";
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
  commercialProfiles,
};

export {
  accountEmails,
  accountInterests,
  accountUsernameReservations,
  accounts,
  authChallenges,
  commercialProfiles,
  accountBlocks,
  accountFollows,
  accountFollowRequests,
  feedPosts,
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
