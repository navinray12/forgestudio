-- Account preferences are independent of workspace settings and website/editor data.
CREATE TABLE IF NOT EXISTS dashboard_account_profiles (
 "userId" uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 "firstName" varchar(60) NOT NULL DEFAULT '',"lastName" varchar(60) NOT NULL DEFAULT '',
 city varchar(120) NOT NULL DEFAULT '',timezone varchar(100) NOT NULL DEFAULT 'UTC',
 "dateFormat" varchar(40) NOT NULL DEFAULT 'dd/MM/yyyy HH:mm',
 "dailyHours" integer NOT NULL DEFAULT 7 CHECK("dailyHours" BETWEEN 1 AND 16),
 "coreMinHours" integer NOT NULL DEFAULT 3 CHECK("coreMinHours" BETWEEN 0 AND 16),
 "coreMaxHours" integer NOT NULL DEFAULT 6 CHECK("coreMaxHours" BETWEEN 0 AND 16),
 "workFunction" varchar(120) NOT NULL DEFAULT '',"jobTitle" varchar(120) NOT NULL DEFAULT '',
 "avatarData" text,version integer NOT NULL DEFAULT 1,
 "updatedAt" timestamptz NOT NULL DEFAULT now(),
 CHECK("coreMinHours" <= "coreMaxHours" AND "coreMaxHours" <= "dailyHours")
);
