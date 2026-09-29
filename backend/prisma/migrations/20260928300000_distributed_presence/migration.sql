-- Cross-instance collaboration presence leases. PostgreSQL is authoritative for active peer discovery;
-- LISTEN/NOTIFY is used only as ephemeral fan-out and never as the only copy of state.
CREATE TABLE studio.presence_leases (
  socket_id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL,
  display_name varchar(160) NOT NULL,
  color varchar(80) NOT NULL,
  cursor jsonb,
  selected_element_id varchar(150),
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(cursor IS NULL OR jsonb_typeof(cursor)='object')
);
CREATE INDEX studio_presence_site_expiry ON studio.presence_leases(site_id,expires_at);
CREATE INDEX studio_presence_instance ON studio.presence_leases(instance_id);
