import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  unique,
  uniqueIndex,
  uuid,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { accounts } from "../accounts/schema";
import { feedTable } from "../config";
import { feedPosts } from "./posts";

export const feedPostComments = feedTable(
  "post_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => feedPosts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    clientMutationId: uuid("client_mutation_id").notNull(),
    replyToCommentId: uuid("reply_to_comment_id"),
    content: varchar("content", { length: 2000 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "feed_post_comments_content_valid",
      sql`char_length(btrim("content")) between 1 and 2000`,
    ),
    unique("feed_post_comments_post_id_id_unique").on(
      table.postId,
      table.id,
    ),
    uniqueIndex("feed_post_comments_author_mutation_unique").on(
      table.authorId,
      table.clientMutationId,
    ),
    foreignKey({
      name: "feed_post_comments_parent_same_post_fk",
      columns: [table.postId, table.replyToCommentId],
      foreignColumns: [table.postId, table.id],
    }).onDelete("cascade"),
    index("feed_post_comments_post_created_id").on(
      table.postId,
      table.createdAt,
      table.id,
    ),
    index("feed_post_comments_author_created").on(
      table.authorId,
      table.createdAt.desc(),
    ),
  ],
);
