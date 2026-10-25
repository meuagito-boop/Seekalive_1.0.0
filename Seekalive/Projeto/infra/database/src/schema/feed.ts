import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { feedNamespace } from "./domains";

const feedTable: typeof pgTable =
  feedNamespace.table.bind(feedNamespace) as unknown as typeof pgTable;

export const feedPosts = feedTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    content: varchar("content", { length: 280 }).default("").notNull(),
    audience: varchar("audience", { length: 16 }).notNull(),
    format: varchar("format", { length: 16 }).notNull(),
    articleTitle: varchar("article_title", { length: 160 }),
    articleBody: text("article_body"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    check("feed_posts_audience_valid", sql`${table.audience} in ('public', 'circles', 'private')`),
    check("feed_posts_format_valid", sql`${table.format} in ('text', 'article')`),
    check(
      "feed_posts_content_valid",
      sql`(
        (${table.format} = 'text' and char_length(btrim(${table.content})) between 1 and 280
          and ${table.articleTitle} is null and ${table.articleBody} is null)
        or
        (${table.format} = 'article' and char_length(${table.content}) <= 280
          and ${table.articleTitle} is not null and char_length(btrim(${table.articleTitle})) between 1 and 160
          and ${table.articleBody} is not null and char_length(btrim(${table.articleBody})) between 1 and 50000)
      )`,
    ),
    check("feed_posts_version_positive", sql`${table.version} > 0`),
    index("feed_posts_author_created_id").on(table.authorId, table.createdAt.desc(), table.id.desc()),
    index("feed_posts_audience_created_id").on(table.audience, table.createdAt.desc(), table.id.desc()),
  ],
);
