-- Durable transactional webhook outbox. Secrets are encrypted by the application master key.
CREATE TABLE studio.webhook_endpoints (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] NOT NULL CHECK(cardinality(events) BETWEEN 1 AND 50),
  secret_iv bytea NOT NULL,
  secret_ciphertext bytea NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_id,url)
);
CREATE INDEX studio_webhook_endpoints_site ON studio.webhook_endpoints(site_id,enabled);

CREATE TABLE studio.webhook_events (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  event_type varchar(100) NOT NULL,
  payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_webhook_events_site_time ON studio.webhook_events(site_id,created_at DESC);

CREATE TABLE studio.webhook_deliveries (
  id uuid PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES studio.webhook_events(id) ON DELETE CASCADE,
  endpoint_id uuid NOT NULL REFERENCES studio.webhook_endpoints(id) ON DELETE CASCADE,
  state varchar(20) NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED','DELIVERING','DELIVERED','DEAD')),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 20),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  response_status integer,
  response_excerpt varchar(500),
  last_error varchar(160),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id,endpoint_id)
);
CREATE INDEX studio_webhook_delivery_due ON studio.webhook_deliveries(state,next_attempt_at) WHERE state IN ('QUEUED','DELIVERING');
CREATE INDEX studio_webhook_delivery_endpoint_time ON studio.webhook_deliveries(endpoint_id,created_at DESC);
