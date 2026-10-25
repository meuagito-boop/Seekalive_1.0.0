CREATE TABLE "account_emails" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"email_normalized" varchar(254) NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_interests" (
	"account_id" uuid NOT NULL,
	"interest_key" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_interests_account_id_interest_key_pk" PRIMARY KEY("account_id","interest_key")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
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
	"security_locked_at" timestamp with time zone,
	"is_private" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"messages_policy" varchar(16) DEFAULT 'everyone' NOT NULL,
	"read_receipts" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_age_adult_range" CHECK ("accounts"."age" >= 18 AND "accounts"."age" <= 120)
);
--> statement-breakpoint
CREATE TABLE "auth_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"purpose" varchar(32) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"device_token_hash" varchar(64),
	"pending_password_hash" text,
	"base_password_hash" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"resend_available_at" timestamp with time zone,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "business_profiles" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"category_key" varchar(40) NOT NULL,
	"discovery_kind" varchar(16) NOT NULL,
	"address" varchar(250) NOT NULL,
	"postal_code" varchar(20) NOT NULL,
	"city_name" varchar(120) NOT NULL,
	"state_name" varchar(100) NOT NULL,
	"country_name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_credentials" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"password_policy_version" smallint DEFAULT 0 NOT NULL,
	"password_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"device_id" uuid,
	"token_hash" varchar(64) NOT NULL,
	"csrf_token_hash" varchar(64) NOT NULL,
	"password_policy_version" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trusted_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "account_blocks" (
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id"),
	CONSTRAINT "account_blocks_no_self" CHECK ("account_blocks"."blocker_id" <> "account_blocks"."blocked_id")
);
--> statement-breakpoint
CREATE TABLE "account_follow_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_follow_requests_no_self" CHECK ("account_follow_requests"."requester_id" <> "account_follow_requests"."target_id")
);
--> statement-breakpoint
CREATE TABLE "account_follows" (
	"follower_id" uuid NOT NULL,
	"followed_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_follows_follower_id_followed_id_pk" PRIMARY KEY("follower_id","followed_id"),
	CONSTRAINT "account_follows_no_self" CHECK ("account_follows"."follower_id" <> "account_follows"."followed_id")
);
--> statement-breakpoint
ALTER TABLE "account_emails" ADD CONSTRAINT "account_emails_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_interests" ADD CONSTRAINT "account_interests_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_credentials" ADD CONSTRAINT "password_credentials_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_device_id_trusted_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."trusted_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_blocks" ADD CONSTRAINT "account_blocks_blocker_id_accounts_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_blocks" ADD CONSTRAINT "account_blocks_blocked_id_accounts_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_follow_requests" ADD CONSTRAINT "account_follow_requests_requester_id_accounts_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_follow_requests" ADD CONSTRAINT "account_follow_requests_target_id_accounts_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_follows" ADD CONSTRAINT "account_follows_follower_id_accounts_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_follows" ADD CONSTRAINT "account_follows_followed_id_accounts_id_fk" FOREIGN KEY ("followed_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_emails_email_unique" ON "account_emails" USING btree ("email_normalized");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_username_unique" ON "accounts" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_challenges_token_hash_unique" ON "auth_challenges" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_challenges_account_purpose" ON "auth_challenges" USING btree ("account_id","purpose","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_account_id_index" ON "sessions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "sessions_expiry_index" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "trusted_devices_token_hash_unique" ON "trusted_devices" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "trusted_devices_account_id_index" ON "trusted_devices" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "account_blocks_blocked_created" ON "account_blocks" USING btree ("blocked_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "account_follow_requests_pair_unique" ON "account_follow_requests" USING btree ("requester_id","target_id");--> statement-breakpoint
CREATE INDEX "account_follow_requests_target_created" ON "account_follow_requests" USING btree ("target_id","created_at");--> statement-breakpoint
CREATE INDEX "account_follows_followed_created" ON "account_follows" USING btree ("followed_id","created_at");