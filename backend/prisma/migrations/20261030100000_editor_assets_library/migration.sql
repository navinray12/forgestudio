CREATE TABLE IF NOT EXISTS studio_asset_folders (
  id UUID PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("userId", name)
);
CREATE TABLE IF NOT EXISTS studio_asset_metadata (
  "assetId" UUID PRIMARY KEY REFERENCES media_assets(id) ON DELETE CASCADE,
  "folderId" UUID REFERENCES studio_asset_folders(id) ON DELETE SET NULL,
  category VARCHAR(30),
  "deletedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS studio_asset_folder_idx ON studio_asset_metadata("folderId");
