CREATE TABLE "account_username_reservations" (
	"username" varchar(20) PRIMARY KEY NOT NULL,
	"account_id" uuid,
	"reserved_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "public_name_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "username_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "account_username_reservations" ADD CONSTRAINT "account_username_reservations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_username_reservations_account_id_index" ON "account_username_reservations" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "account_username_reservations_expiry_index" ON "account_username_reservations" USING btree ("reserved_until");