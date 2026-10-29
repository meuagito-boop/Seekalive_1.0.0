import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { accounts } from "../accounts/schema";
import { feedTable } from "../config";

export const feedPosts = feedTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    content: varchar("content", { length: 280 }).default("").notNull(),
    audience: varchar("audience", { length: 16 }).notNull(),
    format: varchar("format", { length: 16 }).notNull(),
    articleTitle: varchar("article_title", { length: 160 }),
    articleBody: text("article_body"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    check(
      "feed_posts_audience_valid",
      sql.raw(`"audience" in ('public', 'circles', 'private')`),
    ),
    check(
      "feed_posts_format_valid",
      sql.raw(`"format" in ('text', 'article')`),
    ),
    check(
      "feed_posts_content_valid",
      sql.raw(`(
        ("format" = 'text' and char_length(btrim("content")) between 1 and 280
          and "article_title" is null and "article_body" is null)
        or
        ("format" = 'article' and char_length("content") <= 280
          and "article_title" is not null and char_length(btrim("article_title")) between 1 and 160
          and "article_body" is not null and char_length(btrim("article_body")) between 1 and 50000)
      )`),
    ),
    check("feed_posts_version_positive", sql.raw(`"version" > 0`)),
    index("feed_posts_author_created_id").on(
      table.authorId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index("feed_posts_audience_created_id").on(
      table.audience,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);
