-- Extend consent-gated first-party analytics beyond page views and conversions.
ALTER TABLE studio.analytics_events DROP CONSTRAINT IF EXISTS analytics_events_event_check;
ALTER TABLE studio.analytics_events ADD CONSTRAINT analytics_events_event_check CHECK(event IN ('PAGEVIEW','CONVERSION','CLICK','FORM_SUBMIT','CUSTOM_EVENT'));
ALTER TABLE studio.analytics_events ADD COLUMN attributes jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(attributes)='object');
CREATE INDEX studio_analytics_event_type_time ON studio.analytics_events(site_id,event,created_at DESC);
