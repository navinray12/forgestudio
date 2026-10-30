-- Identity migration: additive structure plus explicit invalidation of unclassifiable
-- pre-migration sessions and OTPs. Apply with the migration identity in an approved
-- maintenance window. Every active browser must sign in again. Do not rollback to
-- user-ID-only OTP/password routes. Forward repair preserves the epoch fence.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "authEpoch" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "assurance" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "audience" TEXT NOT NULL DEFAULT 'TENANT',
ADD COLUMN     "authEpoch" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "authMethod" TEXT NOT NULL DEFAULT 'legacy',
ADD COLUMN     "authTime" TIMESTAMP(3),
ADD COLUMN     "mfaVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "auth_challenges" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "kind" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "authEpoch" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "email" TEXT,
    "otpHash" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerKey" TEXT,
    "initiatingSessionId" UUID,

    CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_rate_buckets" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_rate_buckets_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateTable
CREATE TABLE "oidc_identities" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "issuer" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oidc_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_challenges_secretHash_key" ON "auth_challenges"("secretHash");

-- CreateIndex
CREATE INDEX "auth_challenges_userId_createdAt_idx" ON "auth_challenges"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "auth_challenges_expiresAt_idx" ON "auth_challenges"("expiresAt");

-- CreateIndex
CREATE INDEX "identity_rate_buckets_expiresAt_idx" ON "identity_rate_buckets"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "oidc_identities_issuer_subject_key" ON "oidc_identities"("issuer", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "oidc_identities_userId_issuer_key" ON "oidc_identities"("userId", "issuer");

-- AddForeignKey
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oidc_identities" ADD CONSTRAINT "oidc_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE auth_challenges ADD CONSTRAINT auth_challenge_kind CHECK (kind IN ('LOGIN','SIGNUP','OIDC'));
ALTER TABLE auth_challenges ADD CONSTRAINT auth_challenge_state CHECK (status IN ('PENDING','DELIVERING','READY','CONSUMED','FAILED'));
ALTER TABLE auth_challenges ADD CONSTRAINT auth_challenge_attempts CHECK (attempts >= 0 AND attempts <= 5);
ALTER TABLE identity_rate_buckets ADD CONSTRAINT identity_rate_positive CHECK (attempts >= 1 AND attempts <= 1000000);
ALTER TABLE users ADD CONSTRAINT identity_epoch_positive CHECK ("authEpoch" > 0);
ALTER TABLE sessions ADD CONSTRAINT session_assurance CHECK (assurance IN ('none','email-otp','mfa','phishing-resistant'));
ALTER TABLE sessions ADD CONSTRAINT session_auth_method CHECK ("authMethod" IN ('legacy','local','oidc'));
ALTER TABLE sessions ADD CONSTRAINT session_audience CHECK (audience IN ('TENANT','CONTROL'));
UPDATE sessions SET "revokedAt" = COALESCE("revokedAt", now()) WHERE "authMethod" = 'legacy';
DELETE FROM otp_verifications;
DELETE FROM password_reset_tokens;
REVOKE ALL ON auth_challenges, identity_rate_buckets, oidc_identities FROM PUBLIC;
COMMIT;
