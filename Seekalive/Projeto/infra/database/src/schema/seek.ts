import { timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { seekTable } from "./config";

export const commercialProfiles = seekTable("business_profiles", {
  accountId: uuid("account_id").primaryKey().references(() => accounts.id, { onDelete: "cascade" }),
  categoryKey: varchar("category_key", { length: 40 }).notNull(),
  discoveryKind: varchar("discovery_kind", { length: 16 }).notNull(),
  address: varchar("address", { length: 250 }).notNull(),
  postalCode: varchar("postal_code", { length: 20 }).notNull(),
  cityName: varchar("city_name", { length: 120 }).notNull(),
  stateName: varchar("state_name", { length: 100 }).notNull(),
  countryName: varchar("country_name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
