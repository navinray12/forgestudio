-- Additive community storage. Existing forum tables and records are never replaced.
DO $$ BEGIN CREATE TYPE "ForumTopicStatus" AS ENUM ('OPEN','LOCKED','SOLVED','ARCHIVED','HIDDEN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ForumTopicVisibility" AS ENUM ('PUBLIC','WORKSPACE','PRIVATE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS forum_categories (
 id uuid PRIMARY KEY, name varchar(100) NOT NULL, slug varchar(100) NOT NULL UNIQUE,
 description text, icon varchar(100), color varchar(30), "displayOrder" integer NOT NULL DEFAULT 0,
 "isActive" boolean NOT NULL DEFAULT true, "isPublic" boolean NOT NULL DEFAULT true,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS forum_topics (
 id uuid PRIMARY KEY, "topicNumber" varchar(100) NOT NULL UNIQUE, title varchar(255) NOT NULL, slug varchar(255) NOT NULL UNIQUE,
 content text NOT NULL, "categoryId" uuid NOT NULL REFERENCES forum_categories(id), "authorId" uuid NOT NULL REFERENCES users(id),
 "workspaceId" uuid, "websiteId" uuid, status "ForumTopicStatus" NOT NULL DEFAULT 'OPEN', visibility "ForumTopicVisibility" NOT NULL DEFAULT 'PUBLIC',
 "isPinned" boolean NOT NULL DEFAULT false, "isLocked" boolean NOT NULL DEFAULT false, "isFeatured" boolean NOT NULL DEFAULT false,
 "isSolved" boolean NOT NULL DEFAULT false, "acceptedAnswerId" uuid, "viewCount" integer NOT NULL DEFAULT 0, "replyCount" integer NOT NULL DEFAULT 0,
 "lastActivityAt" timestamptz NOT NULL DEFAULT now(), tags text[] DEFAULT '{}', "contextData" jsonb DEFAULT '{}',
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS forum_posts (
 id uuid PRIMARY KEY, "topicId" uuid NOT NULL REFERENCES forum_topics(id), "authorId" uuid NOT NULL REFERENCES users(id),
 "parentPostId" uuid REFERENCES forum_posts(id), content text NOT NULL, "isAcceptedAnswer" boolean NOT NULL DEFAULT false,
 "isHidden" boolean NOT NULL DEFAULT false, "editedAt" timestamptz, "editedById" uuid REFERENCES users(id),
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dashboard_forum_topic_listing ON forum_topics(visibility,status,"lastActivityAt" DESC);
CREATE INDEX IF NOT EXISTS dashboard_forum_visible_replies ON forum_posts("topicId","isHidden","createdAt");
-- Category definitions are configuration, never sample conversations or inflated counters.
INSERT INTO forum_categories(id,name,slug,description,"displayOrder") VALUES
 ('197f7cb1-8461-41d0-b9a7-98d2b5b55201','Announcements','announcements','Official news, updates and announcements from the ForgeStudio team.',0),
 ('197f7cb1-8461-41d0-b9a7-98d2b5b55202','General Discussion','general-discussion','Talk about anything related to design, technology, or the community.',1),
 ('197f7cb1-8461-41d0-b9a7-98d2b5b55203','Showcase & Feedback','showcase-feedback','Share your work, get feedback and showcase your creations.',2),
 ('197f7cb1-8461-41d0-b9a7-98d2b5b55204','Tips & Tutorials','tips-tutorials','Guides, design tricks, and step-by-step tutorials to help you build.',3),
 ('197f7cb1-8461-41d0-b9a7-98d2b5b55205','Questions & Help','questions-help','Ask the community for help with design, code, or your project.',4),
 ('197f7cb1-8461-41d0-b9a7-98d2b5b55206','Collaboration','collaboration','Find teammates, discuss projects, and build together.',5)
ON CONFLICT(slug) DO NOTHING;
