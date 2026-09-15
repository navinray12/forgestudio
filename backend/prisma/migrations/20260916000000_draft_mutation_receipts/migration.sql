ALTER TABLE websites ADD COLUMN "draftRevision" UUID NOT NULL DEFAULT gen_random_uuid();

CREATE TABLE draft_save_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "websiteId" UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  "actorId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "mutationId" VARCHAR(128) NOT NULL,
  "requestHash" VARCHAR(64) NOT NULL,
  "acceptedRevision" UUID NOT NULL,
  "documentHash" VARCHAR(64) NOT NULL,
  "document" JSONB NOT NULL,
  "acceptedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  CONSTRAINT draft_save_receipts_scope_key UNIQUE ("websiteId", "actorId", "mutationId")
);
CREATE INDEX draft_save_receipts_expiry_idx ON draft_save_receipts ("expiresAt");
CREATE INDEX draft_save_receipts_history_idx ON draft_save_receipts ("websiteId", "acceptedAt", id);

-- Cover legacy/SDK/restore writes too: no writer can silently bypass the draft token.
-- Live activation does not invalidate a draft save precondition.
CREATE FUNCTION advance_website_draft_revision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_document jsonb; new_document jsonb;
BEGIN
  old_document := CASE WHEN jsonb_typeof(OLD."editorData") = 'string' THEN (OLD."editorData" #>> '{}')::jsonb ELSE OLD."editorData" END;
  new_document := CASE WHEN jsonb_typeof(NEW."editorData") = 'string' THEN (NEW."editorData" #>> '{}')::jsonb ELSE NEW."editorData" END;
  IF (old_document - 'publishedData' - 'publishing') IS DISTINCT FROM (new_document - 'publishedData' - 'publishing') THEN
    NEW."draftRevision" := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER websites_draft_revision BEFORE UPDATE ON websites FOR EACH ROW EXECUTE FUNCTION advance_website_draft_revision();
