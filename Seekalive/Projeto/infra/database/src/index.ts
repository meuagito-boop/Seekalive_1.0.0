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
export { feedPosts } from "./schema/feed/posts";
export { commercialProfiles } from "./schema/seek/businessProfiles";
export {
  authChallenges,
  passwordCredentials,
  sessions,
  trustedDevices,
} from "./schema/security/schema";
