DO $migration$
BEGIN
  IF to_regclass('seek.business_profiles') IS NOT NULL
     AND to_regclass('profiles.business_profiles') IS NOT NULL THEN
    RAISE EXCEPTION
      'Both seek.business_profiles and profiles.business_profiles exist; resolve data ownership before migrating.';
  ELSIF to_regclass('seek.business_profiles') IS NOT NULL THEN
    ALTER TABLE seek.business_profiles SET SCHEMA profiles;
  ELSE
    CREATE TABLE profiles.business_profiles (
      account_id uuid PRIMARY KEY NOT NULL,
      category_key varchar(40) NOT NULL,
      discovery_kind varchar(16) NOT NULL,
      address varchar(250) NOT NULL,
      postal_code varchar(20) NOT NULL,
      city_name varchar(120) NOT NULL,
      state_name varchar(100) NOT NULL,
      country_name varchar(100) NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT business_profiles_account_id_accounts_id_fk
        FOREIGN KEY (account_id)
        REFERENCES accounts.accounts(id)
        ON DELETE cascade
        ON UPDATE no action
    );
  END IF;
END
$migration$;