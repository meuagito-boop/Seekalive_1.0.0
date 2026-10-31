CREATE SCHEMA IF NOT EXISTS "media";
--> statement-breakpoint
CREATE TABLE "media"."assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" uuid NOT NULL,
	"post_id" uuid,
	"position" smallint,
	"storage_key" uuid NOT NULL,
	"media_type" varchar(8) NOT NULL,
	"content_type" varchar(32) NOT NULL,
	"size_bytes" integer NOT NULL,
	"state" varchar(12) DEFAULT 'staged' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "media_assets_type_valid" CHECK ("media_type" in ('image', 'video')),
	CONSTRAINT "media_assets_content_type_valid" CHECK ("content_type" in (
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
        'video/mp4', 'video/webm'
      )),
	CONSTRAINT "media_assets_size_valid" CHECK ("size_bytes" between 1 and 104857600),
	CONSTRAINT "media_assets_state_consistent" CHECK ((
        "state" = 'staged' and "post_id" is null
          and "position" is null and "expires_at" > "created_at"
      ) or (
        "state" = 'attached' and "post_id" is not null
          and "position" between 0 and 7
      ))
);
--> statement-breakpoint
ALTER TABLE "media"."assets" ADD CONSTRAINT "assets_owner_account_id_accounts_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media"."assets" ADD CONSTRAINT "assets_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "feed"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_storage_key_unique" ON "media"."assets" USING btree ("storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_post_position_unique" ON "media"."assets" USING btree ("post_id","position");--> statement-breakpoint
CREATE INDEX "media_assets_owner_state_created" ON "media"."assets" USING btree ("owner_account_id","state","created_at");--> statement-breakpoint
CREATE INDEX "media_assets_expiry" ON "media"."assets" USING btree ("expires_at");
