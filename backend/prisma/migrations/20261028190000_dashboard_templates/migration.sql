CREATE TABLE IF NOT EXISTS dashboard_template_catalog (
 id uuid PRIMARY KEY,slug varchar(100) NOT NULL UNIQUE,name varchar(255) NOT NULL,description text NOT NULL,
 category varchar(100) NOT NULL,industry varchar(100) NOT NULL,styles text[] NOT NULL DEFAULT '{}',features text[] NOT NULL DEFAULT '{}',
 "templateData" jsonb NOT NULL,"isActive" boolean NOT NULL DEFAULT true,"displayOrder" integer NOT NULL DEFAULT 0,
 "createdAt" timestamptz NOT NULL DEFAULT now(),"updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dashboard_template_favorites (
 "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 "templateId" uuid NOT NULL REFERENCES dashboard_template_catalog(id) ON DELETE CASCADE,
 "createdAt" timestamptz NOT NULL DEFAULT now(),PRIMARY KEY("userId","templateId")
);
