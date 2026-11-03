-- Additive settings only. Existing credentials and sessions are not changed by setup.
CREATE TABLE IF NOT EXISTS dashboard_security (
 "userId" uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 "passwordChangedAt" timestamptz,"enabledAt" timestamptz,"secretCipher" text,
 "pendingCipher" text,"pendingExpiresAt" timestamptz,"pendingSessionId" uuid,
 "lastCounter" bigint NOT NULL DEFAULT -1,"recoveryHashes" jsonb NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS dashboard_security_challenges (
 "tokenHash" text PRIMARY KEY,"userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 "expiresAt" timestamptz NOT NULL,attempts integer NOT NULL DEFAULT 0,"userAgent" varchar(500)
);
CREATE INDEX IF NOT EXISTS dashboard_security_challenge_expiry ON dashboard_security_challenges("expiresAt");
CREATE TABLE IF NOT EXISTS dashboard_session_devices (
 "sessionId" uuid PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,"userAgent" varchar(500)
);
