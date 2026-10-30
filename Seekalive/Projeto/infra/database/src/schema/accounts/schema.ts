import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  primaryKey,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { accountsTable } from "../config";

export const accounts = accountsTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: varchar("username", { length: 20 }).notNull(),
    age: smallint("age").notNull(),
    acceptedTermsVersion: varchar("accepted_terms_version", {
      length: 50,
    }).notNull(),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    accountType: varchar("account_type", { length: 16 }).notNull(),
    status: varchar("status", { length: 32 })
      .default("pending_verification")
      .notNull(),
    deletionRequestedAt: timestamp("deletion_requested_at", {
      withTimezone: true,
    }),
    deletionScheduledFor: timestamp("deletion_scheduled_for", {
      withTimezone: true,
    }),
    deletionRetentionUntil: timestamp("deletion_retention_until", {
      withTimezone: true,
    }),
    securityLockedAt: timestamp("security_locked_at", { withTimezone: true }),
    usernameChangedAt: timestamp("username_changed_at", { withTimezone: true }),
    isVerified: boolean("is_verified").default(false).notNull(),
    messagesPolicy: varchar("messages_policy", { length: 16 })
      .default("everyone")
      .notNull(),
    readReceipts: boolean("read_receipts").default(true).notNull(),
    version: integer("version").default(1).notNull(),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("accounts_username_unique")
      .on(table.username)
      .where(sql.raw(`"status" <> 'deletion_retained'`)),
    index("accounts_deletion_due_idx")
      .on(table.deletionScheduledFor, table.id)
      .where(sql.raw(`"status" = 'deletion_pending'`)),
    index("accounts_retention_due_idx")
      .on(table.deletionRetentionUntil, table.id)
      .where(sql.raw(`"status" = 'deletion_retained'`)),
    check("accounts_age_adult_range", sql.raw(`"age" >= 18 AND "age" <= 120`)),
    check(
      "accounts_deletion_schedule_consistent",
      sql.raw(`(
        "status" = 'deletion_pending'
        AND "deletion_requested_at" IS NOT NULL
        AND "deletion_scheduled_for" IS NOT NULL
        AND "deletion_scheduled_for" > "deletion_requested_at"
        AND "deletion_retention_until" IS NULL
      ) OR (
        "status" = 'deletion_retained'
        AND "deletion_requested_at" IS NOT NULL
        AND "deletion_scheduled_for" IS NOT NULL
        AND "deletion_scheduled_for" > "deletion_requested_at"
        AND "deletion_retention_until" > "deletion_scheduled_for"
      ) OR (
        "status" NOT IN ('deletion_pending', 'deletion_retained')
        AND "deletion_requested_at" IS NULL
        AND "deletion_scheduled_for" IS NULL
        AND "deletion_retention_until" IS NULL
      )`),
    ),
  ],
);

export const accountUsernameReservations = accountsTable(
  "account_username_reservations",
  {
    username: varchar("username", { length: 20 }).primaryKey(),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    reservedUntil: timestamp("reserved_until", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("account_username_reservations_account_id_index").on(table.accountId),
    index("account_username_reservations_expiry_index").on(table.reservedUntil),
  ],
);

export const accountEmails = accountsTable(
  "account_emails",
  {
    accountId: uuid("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "cascade" }),
    emailNormalized: varchar("email_normalized", { length: 254 }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("account_emails_email_unique").on(table.emailNormalized),
  ],
);

export const accountInterests = accountsTable(
  "account_interests",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    interestKey: varchar("interest_key", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.accountId, table.interestKey] })],
);
