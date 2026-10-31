import { check, index, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { feedTable } from "../config";
import { feedPosts } from "./posts";

export const feedPostReferences = feedTable(
  "post_references",
  {
    postId: uuid("post_id")
      .primaryKey()
      .references(() => feedPosts.id, { onDelete: "cascade" }),
    referenceType: varchar("reference_type", { length: 24 })
      .notNull()
      .default("social_post"),
    referenceId: uuid("reference_id").notNull(),
    referencedPostId: uuid("referenced_post_id").references(
      () => feedPosts.id,
      { onDelete: "set null" },
    ),
  },
  (table) => [
    check(
      "feed_post_references_social_type",
      sql`${table.referenceType} = 'social_post'`,
    ),
    check(
      "feed_post_references_not_self",
      sql`${table.postId} <> ${table.referenceId}`,
    ),
    check(
      "feed_post_references_target_consistent",
      sql`${table.referencedPostId} is null or ${table.referencedPostId} = ${table.referenceId}`,
    ),
    index("feed_post_references_target_idx").on(table.referencedPostId),
  ],
);
