import { check, index, pgTable, primaryKey, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { accounts } from "./auth";

export const accountFollows = pgTable(
  "account_follows",
  {
    followerId: uuid("follower_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    followedId: uuid("followed_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followedId] }),
    check("account_follows_no_self", sql`${table.followerId} <> ${table.followedId}`),
    index("account_follows_followed_created").on(table.followedId, table.createdAt),
  ],
);

export const accountFollowRequests = pgTable(
  "account_follow_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requesterId: uuid("requester_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    targetId: uuid("target_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("account_follow_requests_pair_unique").on(table.requesterId, table.targetId),
    check("account_follow_requests_no_self", sql`${table.requesterId} <> ${table.targetId}`),
    index("account_follow_requests_target_created").on(table.targetId, table.createdAt),
  ],
);

export const accountBlocks = pgTable(
  "account_blocks",
  {
    blockerId: uuid("blocker_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerId, table.blockedId] }),
    check("account_blocks_no_self", sql`${table.blockerId} <> ${table.blockedId}`),
    index("account_blocks_blocked_created").on(table.blockedId, table.createdAt),
  ],
);
