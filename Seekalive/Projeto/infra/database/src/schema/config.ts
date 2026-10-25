import { pgSchema, pgTable } from "drizzle-orm/pg-core";

const isolatedSchema = process.env.SEEKALIVE_DB_SCHEMA?.trim();

if (isolatedSchema && (
  process.env.NODE_ENV !== "test"
  || !/^seekalive_test_[0-9a-f]{32}$/i.test(isolatedSchema)
)) {
  throw new Error("SEEKALIVE_DB_SCHEMA is reserved for isolated test schemas.");
}

export const domainNamespace = (name: string) => pgSchema(isolatedSchema ?? name);

export const accountsNamespace = domainNamespace("accounts");
export const securityNamespace = domainNamespace("security");
export const profilesNamespace = domainNamespace("profiles");
export const seekNamespace = domainNamespace("seek");

export const accountsTable: typeof pgTable =
  accountsNamespace.table.bind(accountsNamespace) as unknown as typeof pgTable;
export const securityTable: typeof pgTable =
  securityNamespace.table.bind(securityNamespace) as unknown as typeof pgTable;
export const profilesTable: typeof pgTable =
  profilesNamespace.table.bind(profilesNamespace) as unknown as typeof pgTable;
export const seekTable: typeof pgTable =
  seekNamespace.table.bind(seekNamespace) as unknown as typeof pgTable;

export const databaseSchemaFilter = isolatedSchema
  ? [isolatedSchema]
  : [
      "public",
      "accounts",
      "security",
      "profiles",
      "media",
      "feed",
      "messages",
      "notifications",
      "search",
      "seek",
      "location",
      "shop",
      "trust_safety",
    ];
