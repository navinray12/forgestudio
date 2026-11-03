-- Payment identities are server-provisioned after verified provider customer creation.
-- Never store PAN/CVC or accept customer IDs from a user-facing request.
CREATE TABLE IF NOT EXISTS dashboard_billing_customers (
 "userId" uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 provider varchar(30) NOT NULL DEFAULT 'stripe' CHECK(provider='stripe'),
 "providerCustomerId" varchar(100) NOT NULL UNIQUE CHECK("providerCustomerId" ~ '^cus_[a-zA-Z0-9]+$'),
 "createdAt" timestamptz NOT NULL DEFAULT now()
);
-- Reuse the existing support tables without changing their schema or records.
-- These compatible minimal definitions also support installations without support storage.
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
INSERT INTO support_categories(id,name,slug,description) VALUES('de3ded01-977c-4193-a8c7-19137c55d802','Billing & Subscriptions','billing-subscriptions','Questions about account billing and subscriptions') ON CONFLICT(slug) DO NOTHING;
CREATE INDEX IF NOT EXISTS dashboard_billing_support_owner ON support_tickets("userId","categoryId","createdAt" DESC);
