import { sql } from "drizzle-orm";
import {
  check,
  index,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { accounts } from "../accounts/schema";
import { profilesTable } from "../config";

export const accountFollows = profilesTable(
  "account_follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    followedId: uuid("followed_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followedId] }),
    check("account_follows_no_self", sql.raw(`"follower_id" <> "followed_id"`)),
    index("account_follows_followed_created").on(
      table.followedId,
      table.createdAt,
    ),
  ],
);

export const accountFollowRequests = profilesTable(
  "account_follow_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("account_follow_requests_pair_unique").on(
      table.requesterId,
      table.targetId,
    ),
    check(
      "account_follow_requests_no_self",
      sql.raw(`"requester_id" <> "target_id"`),
    ),
    index("account_follow_requests_target_created").on(
      table.targetId,
      table.createdAt,
    ),
  ],
);

export const accountBlocks = profilesTable(
  "account_blocks",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerId, table.blockedId] }),
    check("account_blocks_no_self", sql.raw(`"blocker_id" <> "blocked_id"`)),
    index("account_blocks_blocked_created").on(
      table.blockedId,
      table.createdAt,
    ),
  ],
);
