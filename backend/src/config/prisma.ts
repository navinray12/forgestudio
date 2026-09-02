import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
<<<<<<< HEAD
}

// Ensure PostgreSQL enum types and columns are updated for Email & WhatsApp OTP
async function ensureDbSchema() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'EMAIL_SIGNUP';`);
  } catch (e: any) {
    console.log("Migration check EMAIL_SIGNUP:", e?.message || e);
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'EMAIL_LOGIN';`);
  } catch (e: any) {
    console.log("Migration check EMAIL_LOGIN:", e?.message || e);
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "otp_verifications" ADD COLUMN IF NOT EXISTS "email" TEXT;`);
  } catch (e: any) {
    console.log("Migration check email column:", e?.message || e);
  }
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OtpChannel') THEN
          CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'WHATSAPP');
        END IF;
      END $$;
    `);
  } catch (e: any) {
    console.log("Migration check OtpChannel enum:", e?.message || e);
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "otp_verifications" ADD COLUMN IF NOT EXISTS "channel" "OtpChannel" DEFAULT 'EMAIL';`);
  } catch (e: any) {
    console.log("Migration check channel column:", e?.message || e);
  }
}

ensureDbSchema().catch((err) => {
  console.error("Failed to run schema auto-migration:", err);
});
=======
}
>>>>>>> 8d95dec (Initial project code)
