ALTER TABLE "accounts"."accounts" DROP CONSTRAINT "accounts_deletion_schedule_consistent";--> statement-breakpoint
DROP INDEX "accounts"."accounts_username_unique";--> statement-breakpoint
ALTER TABLE "accounts"."accounts" ADD COLUMN "deletion_retention_until" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "accounts_retention_due_idx" ON "accounts"."accounts" USING btree ("deletion_retention_until","id") WHERE "status" = 'deletion_retained';--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_username_unique" ON "accounts"."accounts" USING btree ("username") WHERE "status" <> 'deletion_retained';--> statement-breakpoint
ALTER TABLE "accounts"."accounts" ADD CONSTRAINT "accounts_deletion_schedule_consistent" CHECK ((
        "status" = 'deletion_pending'
        AND "deletion_requested_at" IS NOT NULL
        AND "deletion_scheduled_for" IS NOT NULL
        AND "deletion_scheduled_for" > "deletion_requested_at"
        AND "deletion_retention_until" IS NULL
      ) OR (
        "status" = 'deletion_retained'
        AND "deletion_requested_at" IS NOT NULL
        AND "deletion_scheduled_for" IS NOT NULL
        AND "deletion_scheduled_for" > "deletion_requested_at"
        AND "deletion_retention_until" > "deletion_scheduled_for"
      ) OR (
        "status" NOT IN ('deletion_pending', 'deletion_retained')
        AND "deletion_requested_at" IS NULL
        AND "deletion_scheduled_for" IS NULL
        AND "deletion_retention_until" IS NULL
      ));
