-- Additive Help catalog and public suggestions. Existing support records remain intact.
CREATE TABLE IF NOT EXISTS dashboard_help_topics (
 slug varchar(80) PRIMARY KEY,title varchar(100) NOT NULL,description varchar(300) NOT NULL,
 "sortOrder" integer NOT NULL DEFAULT 0,"isPublished" boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS dashboard_help_articles (
 slug varchar(100) PRIMARY KEY,"topicSlug" varchar(80) NOT NULL REFERENCES dashboard_help_topics(slug),
 title varchar(180) NOT NULL,body text NOT NULL,keywords text NOT NULL DEFAULT '',
 "isFaq" boolean NOT NULL DEFAULT false,"sortOrder" integer NOT NULL DEFAULT 0,
 "isPublished" boolean NOT NULL DEFAULT true,"updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dashboard_feature_requests (
 id uuid PRIMARY KEY,"userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title varchar(180) NOT NULL,description text NOT NULL,status varchar(30) NOT NULL DEFAULT 'OPEN',
 "isPublished" boolean NOT NULL DEFAULT true,"createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dashboard_feature_votes (
 "requestId" uuid NOT NULL REFERENCES dashboard_feature_requests(id) ON DELETE CASCADE,
 "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,"createdAt" timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY("requestId","userId")
);
CREATE INDEX IF NOT EXISTS dashboard_help_article_topic ON dashboard_help_articles("topicSlug","isPublished","sortOrder");
CREATE INDEX IF NOT EXISTS dashboard_feature_public ON dashboard_feature_requests("isPublished","createdAt" DESC);
-- Minimal compatible support baseline for installations without the existing support tables.
CREATE TABLE IF NOT EXISTS support_categories (
 id uuid PRIMARY KEY,name varchar(100) NOT NULL,slug varchar(100) NOT NULL UNIQUE,description varchar(500),
 "isActive" boolean NOT NULL DEFAULT true,"sortOrder" integer NOT NULL DEFAULT 0,
 "createdAt" timestamptz NOT NULL DEFAULT now(),"updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS support_tickets (
 id uuid PRIMARY KEY,"ticketNumber" varchar(100) NOT NULL UNIQUE,"userId" uuid NOT NULL REFERENCES users(id),
 "categoryId" uuid NOT NULL REFERENCES support_categories(id),subject varchar(255) NOT NULL,description text NOT NULL,
 status varchar(40) NOT NULL DEFAULT 'NEW',priority varchar(30) NOT NULL DEFAULT 'NORMAL',source varchar(30) NOT NULL DEFAULT 'WEB',
 tags text[] DEFAULT '{}',"createdAt" timestamptz NOT NULL DEFAULT now(),"updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS support_ticket_messages (
 id uuid PRIMARY KEY,"ticketId" uuid NOT NULL REFERENCES support_tickets(id),"authorId" uuid NOT NULL REFERENCES users(id),
 type varchar(30) NOT NULL DEFAULT 'PUBLIC_REPLY',content text NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT now(),"updatedAt" timestamptz NOT NULL DEFAULT now()
);
INSERT INTO support_categories(id,name,slug,description) VALUES
 ('15613b4a-6155-484e-9598-d4abef5c1431','General Help','dashboard-help','Help with Web Studio and the dashboard') ON CONFLICT(slug) DO NOTHING;
CREATE INDEX IF NOT EXISTS dashboard_help_ticket_owner ON support_tickets("userId","createdAt" DESC);
-- Product guidance, not sample support conversations or fabricated engagement.
INSERT INTO dashboard_help_topics(slug,title,description,"sortOrder") VALUES
 ('getting-started','Getting Started','Learn the basics and set up your workspace.',0),
 ('pages-templates','Pages & Templates','Create, edit and manage your pages.',1),
 ('elements-blocks','Elements & Blocks','Use and customize elements in your designs.',2),
 ('plugins-integrations','Plugins & Integrations','Connect with your favorite tools.',3),
 ('account-billing','Account & Billing','Manage your plan, payments and invoices.',4),
 ('troubleshooting','Troubleshooting','Solve common issues quickly.',5)
 ON CONFLICT(slug) DO NOTHING;
INSERT INTO dashboard_help_articles(slug,"topicSlug",title,body,keywords,"isFaq","sortOrder") VALUES
 ('create-first-site','getting-started','How do I create my first website?','Open Sites, select the workspace where the site belongs, then choose New site. Enter a site name and complete the creation form. Open the new site to start editing. Save your changes and preview the result before publishing.','getting started build a website new site workspace',true,0),
 ('own-domain','pages-templates','Can I use my own domain?','Custom-domain setup depends on your site deployment and hosting configuration. Open the hosting or domain controls for the site and use the connection details shown there. If the controls you need are unavailable, create a support ticket with the site address and your deployment type.','domains custom domain hosting dns',true,1),
 ('publish-site','pages-templates','How do I publish my website?','Open your site in the editor, save your work and use Preview to review it. Choose Publish and follow the publishing options shown for that site. Your account permissions, plan and hosting configuration determine which publishing options are available. If publishing fails, include the displayed error in a support ticket.','publish deploy build a website preview',true,2),
 ('install-plugins','plugins-integrations','How to install and use plugins?','Open Website tools and select Plugin Hub. Review a plugin and its compatibility information before using the available installation or configuration controls. A resource shared by another community member is a link for review, not an automatic plugin installation. Open a site in the editor to use its supported elements and integrations.','plugins integrations plugin hub',true,3),
 ('upgrade-plan','account-billing','How do I upgrade my plan?','Use Upgrade in the header to open the available plans. Review the plan details and follow the account actions shown there. Open Billing for your recorded subscription and invoice details. If payment management is unavailable, create a support ticket rather than assuming that a payment was completed.','billing upgrade subscriptions plan',true,4),
 ('payment-methods','account-billing','What payment methods are available?','Payment-method availability depends on the billing provider connected to your account. Open Billing to view the payment details actually supplied by that provider. If payment management is not connected, the dashboard shows an unavailable state. Do not submit card numbers or security codes in a support message.','billing payments invoices card',true,5),
 ('technical-issue','troubleshooting','I''m facing a technical issue. What should I do?','Record what you were trying to do, the steps that caused the issue and any error message. Retry the failed request if a retry control is shown. If the issue continues, create a support ticket with those details and the affected site address. Do not include passwords, authenticator setup keys, recovery codes or payment credentials.','errors troubleshooting technical issue support',true,6),
 ('workspace-basics','getting-started','Choose and manage a workspace','Use the workspace menu on the Sites dashboard to choose a workspace. Sites and archived sites are filtered to that workspace. Use Members to manage access where your workspace role permits it. Account preferences and the public Community feed are independent of workspace selection.','getting started workspace members access',false,7),
 ('template-library','pages-templates','Find and use templates','Open Libraries & Templates from the dashboard, then browse or search the available templates. Use the preview to inspect a design. Saving a template creates an independent copy for your account. Open a site in the editor to insert a saved template into that site.','templates pages library design',false,8),
 ('elements-basics','elements-blocks','Work with elements and blocks','Open a site in the editor to work with its elements and blocks. Select an element to inspect the editing controls available for that element type. Preview the page at different viewport sizes and save your changes before publishing. Dashboard tool shortcuts that require an open site are unavailable until you enter the editor.','elements blocks design editor responsive',false,9),
 ('account-security','account-billing','Manage your account and security','Open Settings or My Account to edit your account preferences. Open Security to change an existing password, enroll an authenticator and manage active sessions. Changing your password or authenticator settings signs out other devices. Keep the recovery codes shown during authenticator enrollment somewhere safe.','account security password 2fa sessions',false,10),
 ('archive-restore','troubleshooting','Archive and restore a site','Use the Archive action on a site card to move the site out of All sites. Open Archive in the same workspace to find it, then use Restore to return it to All sites. Archiving preserves website content and editor data and does not take a published site offline.','archive restore missing sites workspace',false,11)
 ON CONFLICT(slug) DO NOTHING;
