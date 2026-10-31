ALTER TABLE "feed"."posts" DROP CONSTRAINT "feed_posts_format_valid";--> statement-breakpoint
ALTER TABLE "feed"."posts" DROP CONSTRAINT "feed_posts_content_valid";--> statement-breakpoint
ALTER TABLE "feed"."posts" ADD COLUMN "media" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "feed"."posts" ADD CONSTRAINT "feed_posts_format_valid" CHECK ("format" in ('text', 'media', 'article'));--> statement-breakpoint
ALTER TABLE "feed"."posts" ADD CONSTRAINT "feed_posts_content_valid" CHECK ((
        ("format" = 'text' and char_length(btrim("content")) between 1 and 280
          and "article_title" is null and "article_body" is null
          and jsonb_typeof("media") = 'array' and jsonb_array_length("media") = 0)
        or
        ("format" = 'media' and char_length("content") <= 280
          and "article_title" is null and "article_body" is null
          and jsonb_typeof("media") = 'array' and jsonb_array_length("media") between 1 and 8)
        or
        ("format" = 'article' and char_length("content") <= 280
          and "article_title" is not null and char_length(btrim("article_title")) between 1 and 160
          and "article_body" is not null and char_length(btrim("article_body")) between 1 and 50000
          and jsonb_typeof("media") = 'array' and jsonb_array_length("media") <= 8)
      ));