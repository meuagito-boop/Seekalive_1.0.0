CREATE SCHEMA IF NOT EXISTS "profiles";
--> statement-breakpoint
CREATE TABLE "profiles"."account_blocks" (
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id"),
CONSTRAINT "account_blocks_no_self" CHECK ("blocker_id" <> "blocked_id")
);
--> statement-breakpoint
CREATE TABLE "profiles"."account_follow_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT "account_follow_requests_no_self" CHECK ("requester_id" <> "target_id")
);
--> statement-breakpoint
CREATE TABLE "profiles"."account_follows" (
	"follower_id" uuid NOT NULL,
	"followed_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_follows_follower_id_followed_id_pk" PRIMARY KEY("follower_id","followed_id"),
CONSTRAINT "account_follows_no_self" CHECK ("follower_id" <> "followed_id")
);
--> statement-breakpoint
ALTER TABLE "profiles"."account_blocks" ADD CONSTRAINT "account_blocks_blocker_id_accounts_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles"."account_blocks" ADD CONSTRAINT "account_blocks_blocked_id_accounts_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles"."account_follow_requests" ADD CONSTRAINT "account_follow_requests_requester_id_accounts_id_fk" FOREIGN KEY ("requester_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles"."account_follow_requests" ADD CONSTRAINT "account_follow_requests_target_id_accounts_id_fk" FOREIGN KEY ("target_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles"."account_follows" ADD CONSTRAINT "account_follows_follower_id_accounts_id_fk" FOREIGN KEY ("follower_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles"."account_follows" ADD CONSTRAINT "account_follows_followed_id_accounts_id_fk" FOREIGN KEY ("followed_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_blocks_blocked_created" ON "profiles"."account_blocks" USING btree ("blocked_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "account_follow_requests_pair_unique" ON "profiles"."account_follow_requests" USING btree ("requester_id","target_id");--> statement-breakpoint
CREATE INDEX "account_follow_requests_target_created" ON "profiles"."account_follow_requests" USING btree ("target_id","created_at");--> statement-breakpoint
CREATE INDEX "account_follows_followed_created" ON "profiles"."account_follows" USING btree ("followed_id","created_at");