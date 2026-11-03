-- Additive dashboard metadata. No content, publication status or deployment changes.
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMPTZ(6);
