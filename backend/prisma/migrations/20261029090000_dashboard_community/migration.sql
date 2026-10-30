-- Reuse public forum topics/replies; this migration adds only social interaction data.
CREATE TABLE IF NOT EXISTS dashboard_community_likes (
 "topicId" uuid NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,"userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 "createdAt" timestamptz NOT NULL DEFAULT now(),PRIMARY KEY("topicId","userId")
);
CREATE TABLE IF NOT EXISTS dashboard_community_follows (
 "followerId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,"creatorId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 "createdAt" timestamptz NOT NULL DEFAULT now(),PRIMARY KEY("followerId","creatorId"),CHECK("followerId"<>"creatorId")
);
CREATE TABLE IF NOT EXISTS forum_bookmarks (
 id uuid PRIMARY KEY,"topicId" uuid NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,"userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 "createdAt" timestamptz NOT NULL DEFAULT now(),UNIQUE("topicId","userId")
);
CREATE TABLE IF NOT EXISTS dashboard_community_assets (
 "topicId" uuid PRIMARY KEY REFERENCES forum_topics(id) ON DELETE CASCADE,"templateId" uuid REFERENCES templates(id) ON DELETE SET NULL,
 "resourceUrl" varchar(2000),"resourceName" varchar(180),"createdAt" timestamptz NOT NULL DEFAULT now()
);
-- Events are trusted staff-managed records; no sample/past events are inserted.
CREATE TABLE IF NOT EXISTS dashboard_community_events (
 id uuid PRIMARY KEY,title varchar(180) NOT NULL,kind varchar(80) NOT NULL DEFAULT 'Workshop',
 "startsAt" timestamptz NOT NULL,url varchar(2000),"isActive" boolean NOT NULL DEFAULT true,
 "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dashboard_community_event_start ON dashboard_community_events("isActive","startsAt");
INSERT INTO forum_categories(id,name,slug,description,"displayOrder") VALUES('f1745550-689b-42d5-a7d4-fc0491d1cd90','Plugins','plugins','Discuss and share resources for WebStudio plugins.',6) ON CONFLICT(slug) DO NOTHING;
