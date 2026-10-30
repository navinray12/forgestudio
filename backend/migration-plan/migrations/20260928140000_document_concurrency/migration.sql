BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE websites ADD COLUMN IF NOT EXISTS "documentVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS "performanceSettings" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE websites ADD CONSTRAINT websites_document_version_positive CHECK ("documentVersion" > 0);
-- Every writer, including transitional legacy publishing/revision adapters,
-- advances the same version. A stale browser cannot overwrite their changes.
CREATE FUNCTION forge_advance_document_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW."editorData", NEW.name, NEW.slug, NEW.status, NEW."performanceSettings")
     IS DISTINCT FROM (OLD."editorData", OLD.name, OLD.slug, OLD.status, OLD."performanceSettings") THEN
    IF OLD."documentVersion" = 2147483647 THEN
      RAISE EXCEPTION 'document_version_exhausted' USING ERRCODE = '54000';
    END IF;
    NEW."documentVersion" := OLD."documentVersion" + 1;
    NEW."updatedAt" := clock_timestamp();
  ELSE
    NEW."documentVersion" := OLD."documentVersion";
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER websites_advance_document_version BEFORE UPDATE ON websites
FOR EACH ROW EXECUTE FUNCTION forge_advance_document_version();
COMMIT;
