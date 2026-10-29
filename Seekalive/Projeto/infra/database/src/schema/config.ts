import { pgSchema, pgTable } from "drizzle-orm/pg-core";

const isolatedSchema = process.env.SEEKALIVE_DB_SCHEMA?.trim();

if (
  isolatedSchema &&
  (process.env.NODE_ENV !== "test" ||
    !/^seekalive_test_[0-9a-f]{32}$/i.test(isolatedSchema))
) {
  throw new Error("SEEKALIVE_DB_SCHEMA is reserved for isolated test schemas.");
}

export const domainNamespace = (name: string) =>
  pgSchema(isolatedSchema ?? name);

export const accountsNamespace = domainNamespace("accounts");
export const securityNamespace = domainNamespace("security");
export const profilesNamespace = domainNamespace("profiles");
export const feedNamespace = domainNamespace("feed");
export const seekNamespace = domainNamespace("seek");
export const mediaNamespace = domainNamespace("media");
export const messagesNamespace = domainNamespace("messages");
export const notificationsNamespace = domainNamespace("notifications");
export const searchNamespace = domainNamespace("search");
export const locationNamespace = domainNamespace("location");
export const trustSafetyNamespace = domainNamespace("trust_safety");

export const accountsTable: typeof pgTable = accountsNamespace.table.bind(
  accountsNamespace,
) as unknown as typeof pgTable;
export const securityTable: typeof pgTable = securityNamespace.table.bind(
  securityNamespace,
) as unknown as typeof pgTable;
export const profilesTable: typeof pgTable = profilesNamespace.table.bind(
  profilesNamespace,
) as unknown as typeof pgTable;
export const feedTable: typeof pgTable = feedNamespace.table.bind(
  feedNamespace,
) as unknown as typeof pgTable;
export const seekTable: typeof pgTable = seekNamespace.table.bind(
  seekNamespace,
) as unknown as typeof pgTable;

export const databaseSchemaFilter = isolatedSchema
  ? [isolatedSchema]
  : [
      "public",
      "accounts",
      "security",
      "profiles",
      "feed",
      "media",
      "messages",
      "notifications",
      "search",
      "seek",
      "location",
      "trust_safety",
    ];
