/**
 * @file Database infrastructure: database readiness. Shared by API and worker processes; schema changes belong in Prisma migrations.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { prisma } from "./prisma.js";

/** Read-only schema probe. DDL belongs exclusively to the migration job. */
export async function checkDatabaseReadiness(): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET LOCAL statement_timeout = '3000ms'`;
      await tx.$queryRaw`SELECT id, status, "nextAttemptAt" FROM wordpress_webhook_receipts LIMIT 0`;
      await tx.$queryRaw`SELECT email, channel FROM otp_verifications LIMIT 0`;
      await tx.$queryRaw`SELECT "draftRevision" FROM websites LIMIT 0`;
      await tx.$queryRaw`SELECT "mutationId", "acceptedRevision" FROM draft_save_receipts LIMIT 0`;
      await tx.$queryRaw`SELECT 'EMAIL_LOGIN'::"OtpPurpose", 'EMAIL_SIGNUP'::"OtpPurpose"`;
    },
    { timeout: 4000, maxWait: 3000 },
  );
}
