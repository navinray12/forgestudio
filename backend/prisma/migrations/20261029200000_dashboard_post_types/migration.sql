CREATE TABLE IF NOT EXISTS dashboard_post_type_settings (
 "postTypeId" UUID PRIMARY KEY REFERENCES custom_post_types(id) ON DELETE CASCADE,
 singular TEXT NOT NULL, plural TEXT NOT NULL, "hasArchive" BOOLEAN NOT NULL DEFAULT false
);
