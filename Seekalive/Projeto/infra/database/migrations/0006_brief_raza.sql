ALTER TABLE "accounts"."accounts" ADD COLUMN "deletion_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "accounts"."accounts" ADD COLUMN "deletion_scheduled_for" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "accounts_deletion_due_idx" ON "accounts"."accounts" USING btree ("deletion_scheduled_for","id") WHERE "accounts"."accounts"."status" = 'deletion_pending';--> statement-breakpoint
ALTER TABLE "accounts"."accounts" ADD CONSTRAINT "accounts_deletion_schedule_consistent" CHECK ((
        "accounts"."accounts"."status" = 'deletion_pending'
        AND "accounts"."accounts"."deletion_requested_at" IS NOT NULL
        AND "accounts"."accounts"."deletion_scheduled_for" IS NOT NULL
        AND "accounts"."accounts"."deletion_scheduled_for" > "accounts"."accounts"."deletion_requested_at"
      ) OR (
        "accounts"."accounts"."status" <> 'deletion_pending'
        AND "accounts"."accounts"."deletion_requested_at" IS NULL
        AND "accounts"."accounts"."deletion_scheduled_for" IS NULL
      ));