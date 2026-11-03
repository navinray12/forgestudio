CREATE TABLE IF NOT EXISTS dashboard_notification_preferences (
 "userId" uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 desktop boolean NOT NULL DEFAULT true,badge boolean NOT NULL DEFAULT true,"timeoutMinutes" integer NOT NULL DEFAULT 10 CHECK("timeoutMinutes" IN(1,5,10,15,30,60)),
 "communicationEmails" boolean NOT NULL DEFAULT true,"announcementEmails" boolean NOT NULL DEFAULT false,"muteSounds" boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 0,"updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dashboard_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 "eventKey" varchar(180) NOT NULL,category varchar(30) NOT NULL CHECK(category IN('COMMUNICATION','ANNOUNCEMENT')),
 title varchar(180) NOT NULL,body varchar(2000) NOT NULL,href varchar(500) NOT NULL DEFAULT '/dashboard',
 "forumPostId" uuid REFERENCES forum_posts(id) ON DELETE CASCADE,"supportMessageId" uuid REFERENCES support_ticket_messages(id) ON DELETE CASCADE,
 "createdAt" timestamptz NOT NULL DEFAULT now(),"readAt" timestamptz,
 "emailStatus" varchar(20) NOT NULL DEFAULT 'QUEUED' CHECK("emailStatus" IN('QUEUED','SENDING','SENT','SKIPPED','FAILED')),
 "emailAttempts" integer NOT NULL DEFAULT 0,"nextAttemptAt" timestamptz NOT NULL DEFAULT now(),"leaseToken" uuid,"leaseUntil" timestamptz,
 UNIQUE("userId","eventKey")
);
CREATE INDEX IF NOT EXISTS dashboard_notifications_inbox ON dashboard_notifications("userId","createdAt" DESC);
CREATE INDEX IF NOT EXISTS dashboard_notifications_email ON dashboard_notifications("emailStatus","nextAttemptAt");
-- New real replies only: no historical backfill or fabricated notifications. Retries remain idempotent.
CREATE OR REPLACE FUNCTION dashboard_notify_forum_reply() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT NEW."isHidden" THEN
 INSERT INTO dashboard_notifications("userId","eventKey",category,title,body,href,"forumPostId")
 SELECT t."authorId",'forum-reply:'||NEW.id,'COMMUNICATION','New community reply','Someone replied to your community discussion.',
 '/dashboard?section=community&post='||t.id,NEW.id
 FROM forum_topics t JOIN forum_categories c ON c.id=t."categoryId" JOIN users u ON u.id=t."authorId"
 WHERE t.id=NEW."topicId" AND t."authorId"<>NEW."authorId" AND u.status='ACTIVE' AND NOT NEW."isHidden"
 AND t.visibility='PUBLIC' AND t.status IN('OPEN','LOCKED','SOLVED') AND c."isActive" AND c."isPublic"
 ON CONFLICT("userId","eventKey") DO NOTHING;
 END IF;RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS dashboard_notification_forum_insert ON forum_posts;
CREATE TRIGGER dashboard_notification_forum_insert AFTER INSERT ON forum_posts FOR EACH ROW EXECUTE FUNCTION dashboard_notify_forum_reply();
CREATE OR REPLACE FUNCTION dashboard_notify_support_reply() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.type='PUBLIC_REPLY' THEN
 INSERT INTO dashboard_notifications("userId","eventKey",category,title,body,href,"supportMessageId")
 SELECT t."userId",'support-reply:'||NEW.id,'COMMUNICATION','Support replied','Your support request has a new reply.',
 '/dashboard?section=help',NEW.id FROM support_tickets t JOIN users u ON u.id=t."userId"
 WHERE t.id=NEW."ticketId" AND t."userId"<>NEW."authorId" AND u.status='ACTIVE'
 ON CONFLICT("userId","eventKey") DO NOTHING;
 END IF;RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS dashboard_notification_support_insert ON support_ticket_messages;
CREATE TRIGGER dashboard_notification_support_insert AFTER INSERT ON support_ticket_messages FOR EACH ROW EXECUTE FUNCTION dashboard_notify_support_reply();
