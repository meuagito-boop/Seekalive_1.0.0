-- SEEKALIVE CORE — PROPOSED, NOT APPLIED.
-- Documentation only; NOT a migration or a representation of a live database.
-- Static dependency review only. PostgreSQL with pgcrypto; no PostGIS required.
-- No grants/RLS policies are supplied: never expose these tables to browsers.
-- Authorization, privacy, retention and cross-row publication rules require
-- server-side transactions; see data-dictionary.md before implementation.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL CHECK (char_length(username) BETWEEN 1 AND 50),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 100),
  account_type text NOT NULL CHECK (account_type IN ('personal', 'commercial')),
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 2000),
  location_label text, website_url text,
  avatar_asset_id uuid, cover_asset_id uuid,
  is_verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (id, account_type)
);
CREATE UNIQUE INDEX accounts_username_ci ON accounts (lower(username));

-- LEGACY OIDC DRAFT, NOT SELECTED. Replace with the custom API credential model
-- before any migration; this table is documentation-only and must not be applied.
CREATE TABLE auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  provider text NOT NULL CHECK (btrim(provider) <> ''),
  subject text NOT NULL CHECK (btrim(subject) <> ''),
  verified_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, subject),
  UNIQUE (id, account_id)
);
CREATE INDEX auth_identities_account ON auth_identities(account_id);

-- This session FK currently binds to the legacy OIDC draft above. Revise it to
-- bind directly to custom API credentials/account before any migration.
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  auth_identity_id uuid NOT NULL REFERENCES auth_identities(id),
  token_hash bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > created_at),
  FOREIGN KEY (auth_identity_id, account_id) REFERENCES auth_identities(id, account_id)
);
CREATE INDEX sessions_account ON sessions(account_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);

CREATE TABLE account_settings (
  account_id uuid PRIMARY KEY REFERENCES accounts(id),
  private_profile boolean NOT NULL DEFAULT false,
  messages_from text NOT NULL DEFAULT 'everyone'
    CHECK (messages_from IN ('everyone', 'circles', 'nobody')),
  read_receipts boolean NOT NULL DEFAULT true,
  locale text NOT NULL DEFAULT 'pt-BR',
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  key text PRIMARY KEY CHECK (btrim(key) <> ''),
  label text NOT NULL,
  domain text NOT NULL CHECK (domain IN ('business', 'event', 'shop')),
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE cities (
  ibge_id varchar(7) PRIMARY KEY CHECK (ibge_id ~ '^[0-9]{7}$'),
  name text NOT NULL,
  state_code varchar(2) NOT NULL CHECK (state_code ~ '^[A-Z]{2}$'),
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo'
);
CREATE INDEX cities_name_state ON cities(lower(name), state_code);

CREATE TABLE business_profiles (
  account_id uuid PRIMARY KEY REFERENCES accounts(id),
  -- Constant discriminator + composite FK enforces commercial identity,
  -- including preventing account-type downgrade while a profile exists.
  account_type text NOT NULL DEFAULT 'commercial' CHECK (account_type = 'commercial'),
  category_key text NOT NULL REFERENCES categories(key),
  city_id varchar(7) NOT NULL REFERENCES cities(ibge_id),
  discovery_kind text NOT NULL CHECK (discovery_kind IN ('place', 'provider')),
  address text,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  price_level smallint CHECK (price_level BETWEEN 1 AND 4),
  amenities text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  service_options jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(service_options) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (account_id, account_type) REFERENCES accounts(id, account_type)
);
CREATE INDEX business_profiles_discovery ON business_profiles(city_id, category_key, discovery_kind);

CREATE TABLE business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id uuid NOT NULL REFERENCES business_profiles(account_id),
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  opens_at time NOT NULL,
  closes_at time NOT NULL,
  CHECK (closes_at > opens_at),
  UNIQUE (business_account_id, weekday, opens_at)
);
CREATE TABLE business_hour_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id uuid NOT NULL REFERENCES business_profiles(account_id),
  local_date date NOT NULL,
  is_closed boolean NOT NULL,
  opens_at time,
  closes_at time,
  CHECK ((is_closed AND opens_at IS NULL AND closes_at IS NULL) OR
    (NOT is_closed AND opens_at IS NOT NULL AND closes_at IS NOT NULL AND closes_at > opens_at)),
  UNIQUE (business_account_id, local_date)
);
CREATE TABLE business_service_areas (
  business_account_id uuid NOT NULL REFERENCES business_profiles(account_id),
  city_id varchar(7) NOT NULL REFERENCES cities(ibge_id),
  PRIMARY KEY (business_account_id, city_id)
);
CREATE INDEX business_service_areas_city ON business_service_areas(city_id);

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_account_id uuid NOT NULL REFERENCES accounts(id),
  object_key text NOT NULL UNIQUE CHECK (btrim(object_key) <> ''),
  kind text NOT NULL CHECK (kind IN ('image', 'video')),
  mime_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size > 0),
  width integer CHECK (width > 0),
  height integer CHECK (height > 0),
  duration_ms bigint CHECK (duration_ms >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'quarantined')),
  purpose text NOT NULL CHECK (purpose IN ('avatar', 'cover', 'post', 'business_gallery', 'event', 'shop')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);
CREATE INDEX media_assets_owner ON media_assets(owner_account_id, purpose, created_at);
CREATE INDEX media_assets_pending ON media_assets(expires_at) WHERE status <> 'ready';
ALTER TABLE accounts ADD CONSTRAINT accounts_avatar_fk
  FOREIGN KEY (avatar_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL;
ALTER TABLE accounts ADD CONSTRAINT accounts_cover_fk
  FOREIGN KEY (cover_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL;

CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES accounts(id),
  content text NOT NULL DEFAULT '' CHECK (char_length(content) <= 280),
  format text NOT NULL CHECK (format IN ('text', 'media', 'article')),
  audience text NOT NULL CHECK (audience IN ('public', 'circles', 'private')),
  article_title text,
  article_body text,
  parent_post_id uuid REFERENCES posts(id),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'removed', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (parent_post_id IS NULL OR parent_post_id <> id),
  CHECK ((format = 'article' AND article_title IS NOT NULL AND article_body IS NOT NULL
    AND char_length(btrim(article_title)) BETWEEN 1 AND 160
    AND char_length(btrim(article_body)) BETWEEN 1 AND 50000)
    OR (format <> 'article' AND article_title IS NULL AND article_body IS NULL))
);
CREATE INDEX posts_author_time ON posts(author_id, created_at DESC, id);
CREATE INDEX posts_public_time ON posts(created_at DESC, id)
  WHERE audience = 'public' AND status = 'published';
CREATE INDEX posts_parent ON posts(parent_post_id);

CREATE TABLE post_media (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES media_assets(id),
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 7),
  alt_text text CHECK (char_length(alt_text) <= 2000),
  PRIMARY KEY (post_id, asset_id),
  UNIQUE (post_id, position)
);
CREATE INDEX post_media_asset ON post_media(asset_id);
CREATE TABLE post_mentions (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  mentioned_account_id uuid NOT NULL REFERENCES accounts(id),
  PRIMARY KEY (post_id, mentioned_account_id)
);
CREATE INDEX post_mentions_account ON post_mentions(mentioned_account_id, post_id);
CREATE TABLE hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_tag text NOT NULL UNIQUE CHECK (char_length(normalized_tag) BETWEEN 1 AND 100)
);
CREATE TABLE post_hashtags (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES hashtags(id),
  PRIMARY KEY (post_id, hashtag_id)
);
CREATE INDEX post_hashtags_tag ON post_hashtags(hashtag_id, post_id);

CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id),
  author_id uuid NOT NULL REFERENCES accounts(id),
  parent_comment_id uuid,
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'removed', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, post_id),
  FOREIGN KEY (parent_comment_id, post_id) REFERENCES comments(id, post_id),
  CHECK (parent_comment_id IS NULL OR parent_comment_id <> id)
);
CREATE INDEX comments_post_time ON comments(post_id, created_at, id);
CREATE INDEX comments_parent ON comments(parent_comment_id, post_id);
CREATE INDEX comments_author ON comments(author_id);
CREATE TABLE comment_likes (
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, account_id)
);
CREATE INDEX comment_likes_account ON comment_likes(account_id);
CREATE TABLE post_likes (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, account_id)
);
CREATE INDEX post_likes_account ON post_likes(account_id);
CREATE TABLE reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id),
  account_id uuid NOT NULL REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, account_id)
);
CREATE INDEX reposts_account_time ON reposts(account_id, created_at DESC);

CREATE TABLE follows (
  follower_id uuid NOT NULL REFERENCES accounts(id),
  followed_id uuid NOT NULL REFERENCES accounts(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);
CREATE INDEX follows_inbound ON follows(followed_id, status, follower_id);
-- Círculo não é persistido como relação própria: a associação existe somente
-- quando há dois seguimentos aceitos, um em cada direção. Remover qualquer
-- uma das duas linhas de follows remove a associação derivada.
CREATE TABLE blocks (
  blocker_id uuid NOT NULL REFERENCES accounts(id),
  blocked_id uuid NOT NULL REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX blocks_reverse ON blocks(blocked_id, blocker_id);
CREATE TABLE mutes (
  muter_id uuid NOT NULL REFERENCES accounts(id),
  muted_id uuid NOT NULL REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (muter_id, muted_id),
  CHECK (muter_id <> muted_id)
);
CREATE INDEX mutes_reverse ON mutes(muted_id);

CREATE TABLE business_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id uuid NOT NULL REFERENCES business_profiles(account_id),
  reviewer_id uuid NOT NULL REFERENCES accounts(id),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL CHECK (char_length(btrim(comment)) BETWEEN 10 AND 500),
  reply_content text CHECK (char_length(btrim(reply_content)) BETWEEN 3 AND 500),
  replied_at timestamptz,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'removed', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_account_id, reviewer_id),
  CHECK (business_account_id <> reviewer_id),
  CHECK ((reply_content IS NULL) = (replied_at IS NULL))
);
CREATE INDEX business_reviews_reviewer ON business_reviews(reviewer_id);
CREATE INDEX business_reviews_time ON business_reviews(business_account_id, created_at DESC);

CREATE TABLE seek_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_account_id uuid NOT NULL REFERENCES business_profiles(account_id),
  city_id varchar(7) NOT NULL REFERENCES cities(ibge_id),
  category_key text NOT NULL REFERENCES categories(key),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '',
  venue text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  timezone text NOT NULL,
  price_minor bigint NOT NULL CHECK (price_minor >= 0),
  currency varchar(3) NOT NULL DEFAULT 'BRL' CHECK (currency ~ '^[A-Z]{3}$'),
  cover_asset_id uuid REFERENCES media_assets(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'ended', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX seek_events_city_time ON seek_events(city_id, status, starts_at);
CREATE INDEX seek_events_organizer ON seek_events(organizer_account_id);
CREATE TABLE event_interests (
  event_id uuid NOT NULL REFERENCES seek_events(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, account_id)
);
CREATE INDEX event_interests_account ON event_interests(account_id);

CREATE TABLE shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_account_id uuid NOT NULL REFERENCES business_profiles(account_id),
  category_key text REFERENCES categories(key),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '',
  tag text,
  price_minor bigint NOT NULL CHECK (price_minor >= 0),
  old_price_minor bigint CHECK (old_price_minor >= 0),
  currency varchar(3) NOT NULL DEFAULT 'BRL' CHECK (currency ~ '^[A-Z]{3}$'),
  cover_asset_id uuid REFERENCES media_assets(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'unavailable', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (old_price_minor IS NULL OR old_price_minor >= price_minor)
);
CREATE INDEX shop_items_seller ON shop_items(seller_account_id, status);
CREATE INDEX shop_items_category ON shop_items(category_key, status);

-- Targets now exist; one reference per post matches the current singular DTO.
CREATE TABLE post_references (
  post_id uuid PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  business_account_id uuid REFERENCES business_profiles(account_id),
  shop_item_id uuid REFERENCES shop_items(id),
  referenced_post_id uuid REFERENCES posts(id),
  seek_event_id uuid REFERENCES seek_events(id),
  CHECK (num_nonnulls(business_account_id, shop_item_id, referenced_post_id, seek_event_id) = 1),
  CHECK (referenced_post_id IS NULL OR referenced_post_id <> post_id)
);
CREATE INDEX post_references_business ON post_references(business_account_id);
CREATE INDEX post_references_shop ON post_references(shop_item_id);
CREATE INDEX post_references_post ON post_references(referenced_post_id);
CREATE INDEX post_references_event ON post_references(seek_event_id);

CREATE TABLE saved_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  post_id uuid REFERENCES posts(id),
  business_account_id uuid REFERENCES business_profiles(account_id),
  event_id uuid REFERENCES seek_events(id),
  shop_item_id uuid REFERENCES shop_items(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(post_id, business_account_id, event_id, shop_item_id) = 1)
);
CREATE UNIQUE INDEX saved_resources_post ON saved_resources(account_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX saved_resources_business ON saved_resources(account_id, business_account_id) WHERE business_account_id IS NOT NULL;
CREATE UNIQUE INDEX saved_resources_event ON saved_resources(account_id, event_id) WHERE event_id IS NOT NULL;
CREATE UNIQUE INDEX saved_resources_shop ON saved_resources(account_id, shop_item_id) WHERE shop_item_id IS NOT NULL;
CREATE INDEX saved_resources_timeline ON saved_resources(account_id, created_at DESC);

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_id uuid NOT NULL REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversations_creator ON conversations(created_by_id);
CREATE TABLE conversation_participants (
  conversation_id uuid NOT NULL REFERENCES conversations(id),
  account_id uuid NOT NULL REFERENCES accounts(id),
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  last_read_at timestamptz,
  PRIMARY KEY (conversation_id, account_id),
  CHECK (left_at IS NULL OR left_at >= joined_at)
);
CREATE INDEX conversation_participants_account ON conversation_participants(account_id, conversation_id);
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id),
  sender_id uuid NOT NULL REFERENCES accounts(id),
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  FOREIGN KEY (conversation_id, sender_id) REFERENCES conversation_participants(conversation_id, account_id)
);
CREATE INDEX messages_timeline ON messages(conversation_id, created_at, id);
CREATE INDEX messages_sender ON messages(sender_id);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES accounts(id),
  actor_id uuid REFERENCES accounts(id),
  kind text NOT NULL CHECK (kind IN ('follow', 'like', 'comment', 'repost', 'mention')),
  post_id uuid REFERENCES posts(id),
  comment_id uuid REFERENCES comments(id),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(post_id, comment_id) <= 1)
);
CREATE INDEX notifications_inbox ON notifications(recipient_id, created_at DESC, id);
CREATE INDEX notifications_unread ON notifications(recipient_id) WHERE read_at IS NULL;
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  endpoint text NOT NULL UNIQUE CHECK (endpoint LIKE 'https://%'),
  p256dh text NOT NULL,
  auth_secret_ciphertext bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX push_subscriptions_account ON push_subscriptions(account_id);

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES accounts(id),
  reported_account_id uuid REFERENCES accounts(id),
  post_id uuid REFERENCES posts(id),
  comment_id uuid REFERENCES comments(id),
  message_id uuid REFERENCES messages(id),
  business_review_id uuid REFERENCES business_reviews(id),
  event_id uuid REFERENCES seek_events(id),
  shop_item_id uuid REFERENCES shop_items(id),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (num_nonnulls(reported_account_id, post_id, comment_id, message_id,
    business_review_id, event_id, shop_item_id) = 1)
);
CREATE INDEX reports_queue ON reports(status, created_at);
CREATE INDEX reports_reporter ON reports(reporter_id);
CREATE TABLE moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id),
  moderator_id uuid NOT NULL REFERENCES accounts(id),
  action text NOT NULL CHECK (action IN ('dismiss', 'remove', 'restore', 'warn', 'suspend', 'reinstate')),
  reason text NOT NULL CHECK (btrim(reason) <> ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);
CREATE INDEX moderation_actions_report ON moderation_actions(report_id, created_at);
CREATE INDEX moderation_actions_moderator ON moderation_actions(moderator_id);
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES accounts(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  request_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  retain_until timestamptz NOT NULL,
  CHECK (retain_until > created_at)
);
CREATE INDEX audit_logs_resource ON audit_logs(resource_type, resource_id, created_at);
CREATE INDEX audit_logs_retention ON audit_logs(retain_until);
CREATE TABLE outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  available_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error_code text
);
CREATE INDEX outbox_events_pending ON outbox_events(available_at, id) WHERE processed_at IS NULL;
CREATE TABLE idempotency_keys (
  account_id uuid NOT NULL REFERENCES accounts(id),
  operation text NOT NULL,
  key text NOT NULL CHECK (char_length(key) BETWEEN 1 AND 200),
  request_hash bytea NOT NULL CHECK (octet_length(request_hash) = 32),
  status text NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  response_status smallint CHECK (response_status BETWEEN 100 AND 599),
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (account_id, operation, key),
  CHECK (expires_at > created_at)
);
CREATE INDEX idempotency_keys_expiry ON idempotency_keys(expires_at);
CREATE TABLE webhook_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  payload_hash bytea NOT NULL CHECK (octet_length(payload_hash) = 32),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  expires_at timestamptz NOT NULL,
  UNIQUE (provider, provider_event_id),
  CHECK (expires_at > received_at)
);
CREATE INDEX webhook_receipts_expiry ON webhook_receipts(expires_at);
CREATE TABLE privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  kind text NOT NULL CHECK (kind IN ('export', 'delete', 'rectify')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'processing', 'completed', 'rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL,
  completed_at timestamptz,
  export_object_key text,
  export_expires_at timestamptz,
  CHECK (due_at > requested_at),
  CHECK ((export_object_key IS NULL) = (export_expires_at IS NULL)),
  CHECK (export_object_key IS NULL OR kind = 'export')
);
CREATE INDEX privacy_requests_queue ON privacy_requests(status, due_at);
CREATE INDEX privacy_requests_account ON privacy_requests(account_id, requested_at DESC);
