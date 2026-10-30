-- Optional provenance only; existing snippets remain unchanged and classify as CUSTOM.
CREATE TABLE IF NOT EXISTS dashboard_code_snippet_metadata (
 "snippetId" UUID PRIMARY KEY REFERENCES custom_code_snippets(id) ON DELETE CASCADE,
 source TEXT NOT NULL CHECK (source IN ('TEMPLATE','THIRD_PARTY')),
 "templateId" TEXT NOT NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
