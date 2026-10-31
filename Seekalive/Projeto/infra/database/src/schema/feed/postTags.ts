import { index, primaryKey, uuid, varchar } from "drizzle-orm/pg-core";
import { feedTable } from "../config";
import { feedPosts } from "./posts";

export const feedPostTags = feedTable(
  "post_tags",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => feedPosts.id, { onDelete: "cascade" }),
    normalizedTag: varchar("normalized_tag", { length: 40 }).notNull(),
  },
  (table) => [
    primaryKey({
      name: "feed_post_tags_pkey",
      columns: [table.postId, table.normalizedTag],
    }),
    index("feed_post_tags_normalized_prefix_idx").using(
      "btree",
      table.normalizedTag.op("varchar_pattern_ops"),
      table.postId,
    ),
  ],
);
