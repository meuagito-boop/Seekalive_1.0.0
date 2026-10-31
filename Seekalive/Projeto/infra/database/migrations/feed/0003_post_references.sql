CREATE TABLE "feed"."post_references" (
	"post_id" uuid PRIMARY KEY NOT NULL,
	"reference_type" varchar(24) DEFAULT 'social_post' NOT NULL,
	"reference_id" uuid NOT NULL,
	"referenced_post_id" uuid,
	CONSTRAINT "feed_post_references_social_type" CHECK ("feed"."post_references"."reference_type" = 'social_post'),
	CONSTRAINT "feed_post_references_not_self" CHECK ("feed"."post_references"."post_id" <> "feed"."post_references"."reference_id"),
	CONSTRAINT "feed_post_references_target_consistent" CHECK ("feed"."post_references"."referenced_post_id" is null or "feed"."post_references"."referenced_post_id" = "feed"."post_references"."reference_id")
);
--> statement-breakpoint
ALTER TABLE "feed"."post_references" ADD CONSTRAINT "post_references_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "feed"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed"."post_references" ADD CONSTRAINT "post_references_referenced_post_id_posts_id_fk" FOREIGN KEY ("referenced_post_id") REFERENCES "feed"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feed_post_references_target_idx" ON "feed"."post_references" USING btree ("referenced_post_id");
