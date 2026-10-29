CREATE SCHEMA IF NOT EXISTS "accounts";
--> statement-breakpoint
CREATE TABLE "accounts"."account_emails" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"email_normalized" varchar(254) NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts"."account_interests" (
	"account_id" uuid NOT NULL,
	"interest_key" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_interests_account_id_interest_key_pk" PRIMARY KEY("account_id","interest_key")
);
--> statement-breakpoint
CREATE TABLE "accounts"."account_username_reservations" (
	"username" varchar(20) PRIMARY KEY NOT NULL,
	"account_id" uuid,
	"reserved_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts"."accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(20) NOT NULL,
	"first_name" varchar(80),
	"last_name" varchar(80),
	"age" smallint NOT NULL,
	"accepted_terms_version" varchar(50) NOT NULL,
	"terms_accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"location_label" varchar(160),
	"website_url" varchar(2048),
	"account_type" varchar(16) NOT NULL,
	"status" varchar(32) DEFAULT 'pending_verification' NOT NULL,
	"deletion_requested_at" timestamp with time zone,
	"deletion_scheduled_for" timestamp with time zone,
	"security_locked_at" timestamp with time zone,
	"public_name_changed_at" timestamp with time zone,
	"username_changed_at" timestamp with time zone,
	"is_private" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"messages_policy" varchar(16) DEFAULT 'everyone' NOT NULL,
	"read_receipts" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT "accounts_age_adult_range" CHECK ("age" >= 18 AND "age" <= 120),
	CONSTRAINT "accounts_deletion_schedule_consistent" CHECK ((
        "status" = 'deletion_pending'
        AND "deletion_requested_at" IS NOT NULL
        AND "deletion_scheduled_for" IS NOT NULL
        AND "deletion_scheduled_for" > "deletion_requested_at"
      ) OR (
        "status" <> 'deletion_pending'
        AND "deletion_requested_at" IS NULL
        AND "deletion_scheduled_for" IS NULL
      ))
);
--> statement-breakpoint
ALTER TABLE "accounts"."account_emails" ADD CONSTRAINT "account_emails_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts"."account_interests" ADD CONSTRAINT "account_interests_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts"."account_username_reservations" ADD CONSTRAINT "account_username_reservations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_emails_email_unique" ON "accounts"."account_emails" USING btree ("email_normalized");--> statement-breakpoint
CREATE INDEX "account_username_reservations_account_id_index" ON "accounts"."account_username_reservations" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "account_username_reservations_expiry_index" ON "accounts"."account_username_reservations" USING btree ("reserved_until");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_username_unique" ON "accounts"."accounts" USING btree ("username");--> statement-breakpoint
CREATE INDEX "accounts_deletion_due_idx" ON "accounts"."accounts" USING btree ("deletion_scheduled_for","id") WHERE "status" = 'deletion_pending';