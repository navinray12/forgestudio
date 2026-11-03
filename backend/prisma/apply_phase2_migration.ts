import "dotenv/config";
import { prisma } from "../src/config/prisma.js";

async function main() {
  console.log("Applying forward-only schema alterations for Phase 2...");
  await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspendedBy" UUID;`);

  await prisma.$executeRawUnsafe(`ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "moderationStatus" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE';`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "moderationReason" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMPTZ(6);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "moderatedBy" UUID;`);

  await prisma.$executeRawUnsafe(`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "actorRole" VARCHAR(50);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "result" VARCHAR(20) NOT NULL DEFAULT 'SUCCESS';`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "reason" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "correlationId" VARCHAR(100);`);
  console.log("Phase 2 database columns applied successfully!");
}

main()
  .catch((err) => {
    console.error("Migration error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
