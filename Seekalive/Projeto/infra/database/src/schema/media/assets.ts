import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { accounts } from "../accounts/schema";
import { feedPosts } from "../feed/posts";
import { mediaTable } from "../config";

export const mediaAssets = mediaTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerAccountId: uuid("owner_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => feedPosts.id, {
      onDelete: "cascade",
    }),
    position: smallint("position"),
    storageKey: uuid("storage_key").notNull(),
    mediaType: varchar("media_type", { length: 8 }).notNull(),
    contentType: varchar("content_type", { length: 32 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    state: varchar("state", { length: 12 }).default("staged").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      "media_assets_type_valid",
      sql.raw(`"media_type" in ('image', 'video')`),
    ),
    check(
      "media_assets_content_type_valid",
      sql.raw(`"content_type" in (
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
        'video/mp4', 'video/webm'
      )`),
    ),
    check(
      "media_assets_size_valid",
      sql.raw(`"size_bytes" between 1 and 104857600`),
    ),
    check(
      "media_assets_state_consistent",
      sql.raw(`(
        "state" = 'staged' and "post_id" is null
          and "position" is null and "expires_at" > "created_at"
      ) or (
        "state" = 'attached' and "post_id" is not null
          and "position" between 0 and 7
      )`),
    ),
    uniqueIndex("media_assets_storage_key_unique").on(table.storageKey),
    uniqueIndex("media_assets_post_position_unique").on(
      table.postId,
      table.position,
    ),
    index("media_assets_owner_state_created").on(
      table.ownerAccountId,
      table.state,
      table.createdAt,
    ),
    index("media_assets_expiry").on(table.expiresAt),
  ],
);
