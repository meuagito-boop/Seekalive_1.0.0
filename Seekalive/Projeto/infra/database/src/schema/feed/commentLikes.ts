import { index, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { accounts } from "../accounts/schema";
import { feedTable } from "../config";
import { feedPostComments } from "./postComments";

export const feedCommentLikes = feedTable(
  "comment_likes",
  {
    commentId: uuid("comment_id")
      .notNull()
      .references(() => feedPostComments.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.commentId, table.accountId] }),
    index("feed_comment_likes_account_created").on(
      table.accountId,
      table.createdAt.desc(),
    ),
  ],
);
