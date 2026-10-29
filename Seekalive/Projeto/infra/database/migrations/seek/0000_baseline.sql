CREATE SCHEMA IF NOT EXISTS "seek";
--> statement-breakpoint
CREATE TABLE "seek"."business_profiles" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"category_key" varchar(40) NOT NULL,
	"discovery_kind" varchar(16) NOT NULL,
	"address" varchar(250) NOT NULL,
	"postal_code" varchar(20) NOT NULL,
	"city_name" varchar(120) NOT NULL,
	"state_name" varchar(100) NOT NULL,
	"country_name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seek"."business_profiles" ADD CONSTRAINT "business_profiles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts"."accounts"("id") ON DELETE cascade ON UPDATE no action;