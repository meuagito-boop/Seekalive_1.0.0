CREATE TABLE "feed"."posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"content" varchar(280) DEFAULT '' NOT NULL,
	"audience" varchar(16) NOT NULL,
	"format" varchar(16) NOT NULL,
	"article_title" varchar(160),
	"article_body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "feed_posts_audience_valid" CHECK ("feed"."posts"."audience" in ('public', 'circles', 'private')),
	CONSTRAINT "feed_posts_format_valid" CHECK ("feed"."posts"."format" in ('text', 'article')),
	CONSTRAINT "feed_posts_content_valid" CHECK ((
        ("feed"."posts"."format" = 'text' and char_length(btrim("feed"."posts"."content")) between 1 and 280
          and "feed"."posts"."article_title" is null and "feed"."posts"."article_body" is null)
        or
        ("feed"."posts"."format" = 'article' and char_length("feed"."posts"."content") <= 280
          and "feed"."posts"."article_title" is not null and char_length(btrim("feed"."posts"."article_title")) between 1 and 160
          and "feed"."posts"."article_body" is not null and char_length(btrim("feed"."posts"."article_body")) between 1 and 50000)
      )),
	CONSTRAINT "feed_posts_version_positive" CHECK ("feed"."posts"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "feed"."posts" ADD CONSTRAINT "posts_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feed_posts_author_created_id" ON "feed"."posts" USING btree ("author_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feed_posts_audience_created_id" ON "feed"."posts" USING btree ("audience","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);