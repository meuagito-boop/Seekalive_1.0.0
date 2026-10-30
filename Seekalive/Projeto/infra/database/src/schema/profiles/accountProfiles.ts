import { boolean, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { accounts } from "../accounts/schema";
import { profilesTable } from "../config";

export const accountProfiles = profilesTable("account_profiles", {
  accountId: uuid("account_id")
    .primaryKey()
    .references(() => accounts.id, { onDelete: "cascade" }),
  firstName: varchar("first_name", { length: 80 }),
  lastName: varchar("last_name", { length: 80 }),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  bio: text("bio").default("").notNull(),
  locationLabel: varchar("location_label", { length: 160 }),
  websiteUrl: varchar("website_url", { length: 2048 }),
  publicNameChangedAt: timestamp("public_name_changed_at", {
    withTimezone: true,
  }),
  isPrivate: boolean("is_private").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
