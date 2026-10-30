CREATE SCHEMA IF NOT EXISTS "feed";
--> statement-breakpoint
CREATE TABLE "feed"."comment_likes" (
	"comment_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_likes_comment_id_account_id_pk" PRIMARY KEY("comment_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "feed"."post_bookmarks" (
	"post_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_bookmarks_post_id_account_id_pk" PRIMARY KEY("post_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "feed"."post_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"client_mutation_id" uuid NOT NULL,
	"reply_to_comment_id" uuid,
	"content" varchar(2000) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feed_post_comments_post_id_id_unique" UNIQUE("post_id","id"),
	CONSTRAINT "feed_post_comments_content_valid" CHECK (char_length(btrim("content")) between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "feed"."post_likes" (
	"post_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_likes_post_id_account_id_pk" PRIMARY KEY("post_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "feed"."post_reposts" (
	"post_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_reposts_post_id_account_id_pk" PRIMARY KEY("post_id","account_id")
);
--> statement-breakpoint
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
	CONSTRAINT "feed_posts_audience_valid" CHECK ("audience" in ('public', 'circles', 'private')),
	CONSTRAINT "feed_posts_format_valid" CHECK ("format" in ('text', 'article')),
	CONSTRAINT "feed_posts_content_valid" CHECK ((
        ("format" = 'text' and char_length(btrim("content")) between 1 and 280
          and "article_title" is null and "article_body" is null)
        or
        ("format" = 'article' and char_length("content") <= 280
          and "article_title" is not null and char_length(btrim("article_title")) between 1 and 160
          and "article_body" is not null and char_length(btrim("article_body")) between 1 and 50000)
      )),
	CONSTRAINT "feed_posts_version_positive" CHECK ("version" > 0)
);
--> statement-breakpoint
ALTER TABLE "feed"."comment_likes" ADD CONSTRAINT "comment_likes_comment_id_post_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "feed"."post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed"."comment_likes" ADD CONSTRAINT "comment_likes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed"."post_bookmarks" ADD CONSTRAINT "post_bookmarks_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "feed"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed"."post_bookmarks" ADD CONSTRAINT "post_bookmarks_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed"."post_comments" ADD CONSTRAINT "post_comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "feed"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed"."post_comments" ADD CONSTRAINT "post_comments_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed"."post_comments" ADD CONSTRAINT "feed_post_comments_parent_same_post_fk" FOREIGN KEY ("post_id","reply_to_comment_id") REFERENCES "feed"."post_comments"("post_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed"."post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "feed"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed"."post_likes" ADD CONSTRAINT "post_likes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed"."post_reposts" ADD CONSTRAINT "post_reposts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "feed"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed"."post_reposts" ADD CONSTRAINT "post_reposts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed"."posts" ADD CONSTRAINT "posts_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feed_comment_likes_account_created" ON "feed"."comment_likes" USING btree ("account_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feed_post_bookmarks_account_created" ON "feed"."post_bookmarks" USING btree ("account_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "feed_post_comments_author_mutation_unique" ON "feed"."post_comments" USING btree ("author_id","client_mutation_id");--> statement-breakpoint
CREATE INDEX "feed_post_comments_post_created_id" ON "feed"."post_comments" USING btree ("post_id","created_at","id");--> statement-breakpoint
CREATE INDEX "feed_post_comments_author_created" ON "feed"."post_comments" USING btree ("author_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feed_post_likes_account_created" ON "feed"."post_likes" USING btree ("account_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feed_post_reposts_account_created" ON "feed"."post_reposts" USING btree ("account_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feed_posts_author_created_id" ON "feed"."posts" USING btree ("author_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feed_posts_audience_created_id" ON "feed"."posts" USING btree ("audience","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);
