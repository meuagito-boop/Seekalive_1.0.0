import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { accounts } from "../accounts/schema";
import { profilesTable } from "../config";
import { commercialProfiles } from "./businessProfiles";

export const businessProfileReviews = profilesTable(
  "business_profile_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessAccountId: uuid("business_account_id")
      .notNull()
      .references(() => commercialProfiles.accountId, { onDelete: "cascade" }),
    reviewerAccountId: uuid("reviewer_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: varchar("comment", { length: 500 }).notNull(),
    businessReply: text("business_reply"),
    businessRepliedAt: timestamp("business_replied_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("business_profile_reviews_business_reviewer_unique").on(
      table.businessAccountId,
      table.reviewerAccountId,
    ),
    index("business_profile_reviews_business_created_idx").on(
      table.businessAccountId,
      table.createdAt,
      table.id,
    ),
    index("business_profile_reviews_reviewer_idx").on(table.reviewerAccountId),
    check(
      "business_profile_reviews_rating_range",
      sql`${table.rating} BETWEEN 1 AND 5`,
    ),
    check(
      "business_profile_reviews_not_self",
      sql`${table.businessAccountId} <> ${table.reviewerAccountId}`,
    ),
    check(
      "business_profile_reviews_comment_length",
      sql`length(btrim(${table.comment})) BETWEEN 10 AND 500`,
    ),
    check(
      "business_profile_reviews_reply_consistent",
      sql`(${table.businessReply} IS NULL AND ${table.businessRepliedAt} IS NULL)
        OR (${table.businessReply} IS NOT NULL
          AND length(btrim(${table.businessReply})) BETWEEN 3 AND 500
          AND ${table.businessRepliedAt} IS NOT NULL)`,
    ),
  ],
);
