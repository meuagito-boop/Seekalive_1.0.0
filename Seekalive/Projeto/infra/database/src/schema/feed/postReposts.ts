import { index, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { accounts } from "../accounts/schema";
import { feedTable } from "../config";
import { feedPosts } from "./posts";

export const feedPostReposts = feedTable(
  "post_reposts",
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
    index("feed_post_reposts_account_created").on(
      table.accountId,
      table.createdAt.desc(),
    ),
  ],
);
