CREATE TABLE "profiles"."business_profile_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_account_id" uuid NOT NULL,
	"reviewer_account_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" varchar(500) NOT NULL,
	"business_reply" text,
	"business_replied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_profile_reviews_rating_range" CHECK ("profiles"."business_profile_reviews"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "business_profile_reviews_not_self" CHECK ("profiles"."business_profile_reviews"."business_account_id" <> "profiles"."business_profile_reviews"."reviewer_account_id"),
	CONSTRAINT "business_profile_reviews_comment_length" CHECK (length(btrim("profiles"."business_profile_reviews"."comment")) BETWEEN 10 AND 500),
	CONSTRAINT "business_profile_reviews_reply_consistent" CHECK (("profiles"."business_profile_reviews"."business_reply" IS NULL AND "profiles"."business_profile_reviews"."business_replied_at" IS NULL)
        OR ("profiles"."business_profile_reviews"."business_reply" IS NOT NULL
          AND length(btrim("profiles"."business_profile_reviews"."business_reply")) BETWEEN 3 AND 500
          AND "profiles"."business_profile_reviews"."business_replied_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "profiles"."business_profile_reviews" ADD CONSTRAINT "business_profile_reviews_business_account_id_business_profiles_account_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "profiles"."business_profiles"("account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles"."business_profile_reviews" ADD CONSTRAINT "business_profile_reviews_reviewer_account_id_accounts_id_fk" FOREIGN KEY ("reviewer_account_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_profile_reviews_business_reviewer_unique" ON "profiles"."business_profile_reviews" USING btree ("business_account_id","reviewer_account_id");--> statement-breakpoint
CREATE INDEX "business_profile_reviews_business_created_idx" ON "profiles"."business_profile_reviews" USING btree ("business_account_id","created_at","id");--> statement-breakpoint
CREATE INDEX "business_profile_reviews_reviewer_idx" ON "profiles"."business_profile_reviews" USING btree ("reviewer_account_id");