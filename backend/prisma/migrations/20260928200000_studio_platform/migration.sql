-- Additive: existing editor and custom-post-type data are never rewritten.
CREATE TABLE studio.workspace_invites (
  id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email varchar(254) NOT NULL, role varchar(20) NOT NULL CHECK (role IN ('ADMIN','MEMBER')),
  state varchar(20) NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','ACCEPTED','REVOKED')),
  invited_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  accepted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL, revision integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX studio_invite_pending ON studio.workspace_invites(workspace_id, lower(email)) WHERE state='PENDING';
CREATE INDEX studio_invite_inbox ON studio.workspace_invites(lower(email),state,expires_at);
CREATE TABLE studio.mail_outbox (
  id uuid PRIMARY KEY, invite_id uuid NOT NULL REFERENCES studio.workspace_invites(id) ON DELETE CASCADE,
  state varchar(20) NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED','SENT','FAILED','CANCELLED')),
  attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_outbox_due ON studio.mail_outbox(state,next_attempt_at);

CREATE TABLE studio.site_locales (
  site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  code varchar(35) NOT NULL, name varchar(80) NOT NULL, enabled boolean NOT NULL DEFAULT false,
  PRIMARY KEY(site_id,code), CHECK (code <> 'en' OR enabled)
);
INSERT INTO studio.site_locales(site_id,code,name,enabled) SELECT id,'en','English',true FROM public.websites;
CREATE FUNCTION studio.initialize_locales() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO studio.site_locales(site_id,code,name,enabled) VALUES(NEW.id,'en','English',true);
 RETURN NEW;
END; $$;
CREATE TRIGGER studio_initialize_locales AFTER INSERT ON public.websites FOR EACH ROW EXECUTE FUNCTION studio.initialize_locales();

CREATE TABLE studio.collections (
  id uuid PRIMARY KEY, site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL, slug varchar(120) NOT NULL,
  fields jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(fields)='array'), revision integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_id,slug), UNIQUE(id,site_id)
);
CREATE TABLE studio.content_items (
  id uuid PRIMARY KEY, site_id uuid NOT NULL, collection_id uuid NOT NULL,
  group_id uuid NOT NULL, locale varchar(35) NOT NULL DEFAULT 'en',
  name varchar(200) NOT NULL, slug varchar(160) NOT NULL, draft jsonb NOT NULL DEFAULT '{}',
  live jsonb, revision integer NOT NULL DEFAULT 0, live_revision integer,
  archived boolean NOT NULL DEFAULT false, ready boolean NOT NULL DEFAULT false,
  scheduled_at timestamptz, scheduled_revision integer, scheduled_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(collection_id,site_id) REFERENCES studio.collections(id,site_id) ON DELETE CASCADE,
  FOREIGN KEY(site_id,locale) REFERENCES studio.site_locales(site_id,code),
  UNIQUE(collection_id,locale,slug), UNIQUE(collection_id,group_id,locale),
  CHECK (live IS NULL OR (jsonb_typeof(live)='object' AND live_revision IS NOT NULL)),
  CHECK (NOT archived OR live IS NULL),
  CHECK ((scheduled_at IS NULL) = (scheduled_revision IS NULL))
);
CREATE UNIQUE INDEX studio_live_slug ON studio.content_items(collection_id,locale,(live->>'slug')) WHERE live IS NOT NULL;
CREATE INDEX studio_items_site ON studio.content_items(site_id,collection_id,locale,updated_at DESC);
CREATE INDEX studio_items_scheduled ON studio.content_items(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE TABLE studio.content_revisions (
  id uuid PRIMARY KEY, item_id uuid NOT NULL REFERENCES studio.content_items(id) ON DELETE CASCADE,
  revision integer NOT NULL, snapshot jsonb NOT NULL, author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(item_id,revision)
);
CREATE TABLE studio.page_translations (
  site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  page_id varchar(150) NOT NULL, locale varchar(35) NOT NULL,
  draft jsonb NOT NULL DEFAULT '{}', live jsonb, revision integer NOT NULL DEFAULT 0,
  published_revision integer, published_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(site_id,page_id,locale), FOREIGN KEY(site_id,locale) REFERENCES studio.site_locales(site_id,code)
);
CREATE TABLE studio.design_snapshots (
  id uuid PRIMARY KEY, site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL, design jsonb NOT NULL, hash char(64) NOT NULL,
  author_id uuid REFERENCES public.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_snapshots_site ON studio.design_snapshots(site_id,created_at DESC);
CREATE TABLE studio.comment_threads (
  id uuid PRIMARY KEY, site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  page_id varchar(150), element_id varchar(150), content text NOT NULL CHECK(length(content) BETWEEN 1 AND 4000),
  resolved boolean NOT NULL DEFAULT false, revision integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_threads_site ON studio.comment_threads(site_id,created_at DESC);
CREATE TABLE studio.comment_replies (
  id uuid PRIMARY KEY, thread_id uuid NOT NULL REFERENCES studio.comment_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK(length(content) BETWEEN 1 AND 4000), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_replies_thread ON studio.comment_replies(thread_id,created_at);

CREATE TABLE studio.verified_domains (
  id uuid PRIMARY KEY, site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  hostname varchar(253) NOT NULL, challenge varchar(80) NOT NULL,
  state varchar(20) NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','VERIFIED')),
  checked_at timestamptz, verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_id,hostname)
);
CREATE UNIQUE INDEX studio_domains_claimed ON studio.verified_domains(hostname) WHERE state='VERIFIED';

CREATE TABLE studio.analytics_settings (
  site_id uuid PRIMARY KEY REFERENCES public.websites(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false
);
CREATE TABLE studio.analytics_events (
  id uuid NOT NULL, site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  event varchar(20) NOT NULL CHECK(event IN ('PAGEVIEW','CONVERSION')),
  path varchar(300) NOT NULL, experiment_id uuid, variant varchar(80), visitor_hash char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(site_id,id)
);
CREATE INDEX studio_analytics_time ON studio.analytics_events(site_id,created_at DESC);
CREATE TABLE studio.experiments (
  id uuid PRIMARY KEY, site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL, state varchar(20) NOT NULL DEFAULT 'DRAFT' CHECK(state IN ('DRAFT','RUNNING','PAUSED','CONCLUDED')),
  variants jsonb NOT NULL, revision integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE studio.analytics_events ADD FOREIGN KEY(experiment_id) REFERENCES studio.experiments(id) ON DELETE SET NULL;

CREATE TABLE studio.products (
  id uuid PRIMARY KEY, site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL, description text NOT NULL DEFAULT '',
  price_minor integer NOT NULL CHECK(price_minor BETWEEN 1 AND 100000000), currency varchar(3) NOT NULL,
  stripe_price_id varchar(120) NOT NULL, active boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,site_id)
);
CREATE TABLE studio.checkout_orders (
  id uuid PRIMARY KEY, site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  product_id uuid NOT NULL, quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 20),
  total_minor integer NOT NULL, currency varchar(3) NOT NULL,
  provider_session varchar(150) UNIQUE,
  state varchar(30) NOT NULL DEFAULT 'CREATING' CHECK(state IN ('CREATING','CHECKOUT','PAID','EXPIRED','FAILED')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(product_id,site_id) REFERENCES studio.products(id,site_id)
);
CREATE TABLE studio.payment_events (
  provider_event varchar(150) PRIMARY KEY, received_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE studio.checkout_orders ADD COLUMN stripe_account varchar(150) NOT NULL DEFAULT 'platform';
ALTER TABLE studio.checkout_orders ADD COLUMN checkout_url text;
ALTER TABLE studio.checkout_orders ADD COLUMN price_id varchar(120) NOT NULL DEFAULT '';
ALTER TABLE studio.experiments ADD COLUMN path varchar(300) NOT NULL DEFAULT '/';
ALTER TABLE studio.experiments ADD COLUMN target_element_id varchar(150) NOT NULL DEFAULT 'heading';
CREATE UNIQUE INDEX studio_one_running_experiment ON studio.experiments(site_id,path) WHERE state='RUNNING';
