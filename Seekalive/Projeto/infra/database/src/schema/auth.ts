import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { applicationTable } from "./config";

export const accounts = applicationTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: varchar("username", { length: 20 }).notNull(),
    firstName: varchar("first_name", { length: 80 }),
    lastName: varchar("last_name", { length: 80 }),
    age: smallint("age").notNull(),
    acceptedTermsVersion: varchar("accepted_terms_version", { length: 50 }).notNull(),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }).defaultNow().notNull(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    bio: text("bio").default("").notNull(),
    locationLabel: varchar("location_label", { length: 160 }),
    websiteUrl: varchar("website_url", { length: 2048 }),
    accountType: varchar("account_type", { length: 16 }).notNull(),
    status: varchar("status", { length: 32 }).default("pending_verification").notNull(),
    securityLockedAt: timestamp("security_locked_at", { withTimezone: true }),
    publicNameChangedAt: timestamp("public_name_changed_at", { withTimezone: true }),
    usernameChangedAt: timestamp("username_changed_at", { withTimezone: true }),
    isPrivate: boolean("is_private").default(false).notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    messagesPolicy: varchar("messages_policy", { length: 16 }).default("everyone").notNull(),
    readReceipts: boolean("read_receipts").default(true).notNull(),
    version: integer("version").default(1).notNull(),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("accounts_username_unique").on(table.username),
    check("accounts_age_adult_range", sql`${table.age} >= 18 AND ${table.age} <= 120`),
  ],
);

export const accountUsernameReservations = applicationTable(
  "account_username_reservations",
  {
    username: varchar("username", { length: 20 }).primaryKey(),
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
    reservedUntil: timestamp("reserved_until", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("account_username_reservations_account_id_index").on(table.accountId),
    index("account_username_reservations_expiry_index").on(table.reservedUntil),
  ],
);

export const accountEmails = applicationTable(
  "account_emails",
  {
    accountId: uuid("account_id").primaryKey().references(() => accounts.id, { onDelete: "cascade" }),
    emailNormalized: varchar("email_normalized", { length: 254 }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("account_emails_email_unique").on(table.emailNormalized)],
);

export const passwordCredentials = applicationTable("password_credentials", {
  accountId: uuid("account_id").primaryKey().references(() => accounts.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  passwordPolicyVersion: smallint("password_policy_version").default(0).notNull(),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const commercialProfiles = applicationTable("business_profiles", {
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

export const authChallenges = applicationTable(
  "auth_challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    purpose: varchar("purpose", { length: 32 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    deviceTokenHash: varchar("device_token_hash", { length: 64 }),
    pendingPasswordHash: text("pending_password_hash"),
    basePasswordHash: text("base_password_hash"),
    attempts: integer("attempts").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    resendAvailableAt: timestamp("resend_available_at", { withTimezone: true }),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("auth_challenges_token_hash_unique").on(table.tokenHash),
    index("auth_challenges_account_purpose").on(table.accountId, table.purpose, table.createdAt),
  ],
);

export const trustedDevices = applicationTable(
  "trusted_devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("trusted_devices_token_hash_unique").on(table.tokenHash),
    index("trusted_devices_account_id_index").on(table.accountId),
  ],
);

export const sessions = applicationTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").references(() => trustedDevices.id, { onDelete: "set null" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    csrfTokenHash: varchar("csrf_token_hash", { length: 64 }).notNull(),
    passwordPolicyVersion: smallint("password_policy_version").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_account_id_index").on(table.accountId),
    index("sessions_expiry_index").on(table.expiresAt),
  ],
);

export const accountInterests = applicationTable(
  "account_interests",
  {
    accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    interestKey: varchar("interest_key", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.accountId, table.interestKey] })],
);
