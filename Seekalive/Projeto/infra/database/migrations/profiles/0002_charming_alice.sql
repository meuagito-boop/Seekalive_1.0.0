CREATE TABLE "profiles"."account_profiles" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"first_name" varchar(80),
	"last_name" varchar(80),
	"display_name" varchar(100) NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"location_label" varchar(160),
	"website_url" varchar(2048),
	"public_name_changed_at" timestamp with time zone,
	"is_private" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles"."account_profiles" ADD CONSTRAINT "account_profiles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "profiles"."account_profiles" (
	"account_id",
	"first_name",
	"last_name",
	"display_name",
	"bio",
	"location_label",
	"website_url",
	"public_name_changed_at",
	"is_private",
	"created_at",
	"updated_at"
)
SELECT
	"id",
	"first_name",
	"last_name",
	"display_name",
	"bio",
	"location_label",
	"website_url",
	"public_name_changed_at",
	"is_private",
	"created_at",
	"updated_at"
FROM "accounts"."accounts";
--> statement-breakpoint
ALTER TABLE "accounts"."accounts"
	DROP COLUMN "first_name",
	DROP COLUMN "last_name",
	DROP COLUMN "display_name",
	DROP COLUMN "bio",
	DROP COLUMN "location_label",
	DROP COLUMN "website_url",
	DROP COLUMN "public_name_changed_at",
	DROP COLUMN "is_private";