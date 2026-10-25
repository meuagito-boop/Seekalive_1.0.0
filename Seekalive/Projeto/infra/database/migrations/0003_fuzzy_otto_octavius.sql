CREATE SCHEMA "accounts";
--> statement-breakpoint
CREATE SCHEMA "profiles";
--> statement-breakpoint
CREATE SCHEMA "security";
--> statement-breakpoint
CREATE SCHEMA "seek";
--> statement-breakpoint
ALTER TABLE "public"."account_emails" SET SCHEMA "accounts";
--> statement-breakpoint
ALTER TABLE "public"."account_interests" SET SCHEMA "accounts";
--> statement-breakpoint
ALTER TABLE "public"."account_username_reservations" SET SCHEMA "accounts";
--> statement-breakpoint
ALTER TABLE "public"."accounts" SET SCHEMA "accounts";
--> statement-breakpoint
ALTER TABLE "public"."auth_challenges" SET SCHEMA "security";
--> statement-breakpoint
ALTER TABLE "public"."password_credentials" SET SCHEMA "security";
--> statement-breakpoint
ALTER TABLE "public"."sessions" SET SCHEMA "security";
--> statement-breakpoint
ALTER TABLE "public"."trusted_devices" SET SCHEMA "security";
--> statement-breakpoint
ALTER TABLE "public"."business_profiles" SET SCHEMA "seek";
--> statement-breakpoint
ALTER TABLE "public"."account_blocks" SET SCHEMA "profiles";
--> statement-breakpoint
ALTER TABLE "public"."account_follow_requests" SET SCHEMA "profiles";
--> statement-breakpoint
ALTER TABLE "public"."account_follows" SET SCHEMA "profiles";
