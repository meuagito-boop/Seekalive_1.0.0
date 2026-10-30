import { index, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { accounts } from "../accounts/schema";
import { feedTable } from "../config";
import { feedPosts } from "./posts";

export const feedPostLikes = feedTable(
  "post_likes",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => feedPosts.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.accountId] }),
    index("feed_post_likes_account_created").on(
      table.accountId,
      table.createdAt.desc(),
    ),
  ],
);
