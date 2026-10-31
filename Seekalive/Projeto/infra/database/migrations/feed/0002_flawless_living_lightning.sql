CREATE TABLE "feed"."post_tags" (
	"post_id" uuid NOT NULL,
	"normalized_tag" varchar(40) NOT NULL,
	CONSTRAINT "feed_post_tags_pkey" PRIMARY KEY("post_id","normalized_tag")
);
--> statement-breakpoint
ALTER TABLE "feed"."post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "feed"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feed_post_tags_normalized_prefix_idx" ON "feed"."post_tags" USING btree ("normalized_tag" varchar_pattern_ops,"post_id");