import "dotenv/config";
import { prisma } from "../src/config/prisma.js";

async function main() {
  console.log("Applying forward-only additive schema alterations for Phase 13 (Developer API Keys & Distributed Rate Limiting)...");
  await prisma.$executeRawUnsafe(`ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "maskedKey" VARCHAR(100);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP WITH TIME ZONE;`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "api_rate_limits" (
      "key" VARCHAR(255) PRIMARY KEY,
      "count" INT NOT NULL DEFAULT 1,
      "reset_at" TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_api_rate_limits_reset" ON "api_rate_limits" ("reset_at");
  `);
  console.log("Phase 13 database migration applied successfully!");
}

main()
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
