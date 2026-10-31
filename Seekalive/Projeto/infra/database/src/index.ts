import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { resolveDatabaseConnectionUrl } from "./connection";
import { databaseSchema } from "./schema/registry";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: resolveDatabaseConnectionUrl(process.env, "runtime"),
});
export const db = drizzle(pool, { schema: databaseSchema });

export type DatabaseTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export {
  accounts,
  accountEmails,
  accountInterests,
  accountUsernameReservations,
} from "./schema/accounts/schema";
export {
  accountBlocks,
  accountFollows,
  accountFollowRequests,
} from "./schema/profiles/relationships";
export { accountProfiles } from "./schema/profiles/accountProfiles";
export { feedPosts } from "./schema/feed/posts";
export { feedPostTags } from "./schema/feed/postTags";
export { feedPostReferences } from "./schema/feed/postReferences";
export { feedPostLikes } from "./schema/feed/postLikes";
export { feedPostReposts } from "./schema/feed/postReposts";
export { feedPostBookmarks } from "./schema/feed/postBookmarks";
export { feedPostComments } from "./schema/feed/postComments";
export { feedCommentLikes } from "./schema/feed/commentLikes";
export { mediaAssets } from "./schema/media/assets";
export { commercialProfiles } from "./schema/profiles/businessProfiles";
export {
  authChallenges,
  passwordCredentials,
  sessions,
  trustedDevices,
} from "./schema/security/schema";
