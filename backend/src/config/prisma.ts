import "dotenv/config";
import { PrismaClient } from "../generated/prisma/index.js";
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

  await ensureDemoUsers();
}

async function ensureDemoUsers() {
  try {
    const { hashPassword } = await import("../utils/password.js");
    const demoEmail = "demo@forgestudio.com";
    const exampleEmail = "user@example.com";
    const defaultPassword = "Password123!";

    const existingDemo = await prisma.user.findFirst({
      where: { email: demoEmail },
    });

    const hash = await hashPassword(defaultPassword);

    if (!existingDemo) {
      await prisma.user.create({
        data: {
          fullName: "Demo Admin User",
          email: demoEmail,
          passwordHash: hash,
          role: "ADMIN",
          status: "ACTIVE",
          emailVerified: true,
        },
      });
      console.log(`[SEED] Created default demo user: ${demoEmail}`);
    } else if (!existingDemo.passwordHash) {
      await prisma.user.update({
        where: { id: existingDemo.id },
        data: { passwordHash: hash, status: "ACTIVE" },
      });
    }

    const existingExample = await prisma.user.findFirst({
      where: { email: exampleEmail },
    });

    if (!existingExample) {
      await prisma.user.create({
        data: {
          fullName: "Test User",
          email: exampleEmail,
          passwordHash: hash,
          role: "USER",
          status: "ACTIVE",
          emailVerified: true,
        },
      });
      console.log(`[SEED] Created default test user: ${exampleEmail}`);
    } else if (!existingExample.passwordHash) {
      await prisma.user.update({
        where: { id: existingExample.id },
        data: { passwordHash: hash, status: "ACTIVE" },
      });
    }
    const demoUser = await prisma.user.findFirst({
      where: { email: demoEmail },
    });

    if (demoUser) {
      const FIXED_WEBSITE_ID = "75048c20-07b4-4a7e-b126-9c84e94afa8e";
      const existingSite = await prisma.website.findUnique({
        where: { id: FIXED_WEBSITE_ID },
      });

      if (!existingSite) {
        await prisma.website.create({
          data: {
            id: FIXED_WEBSITE_ID,
            name: "Demo Portfolio Website",
            slug: "demo-portfolio-website",
            userId: demoUser.id,
            status: "PUBLISHED",
            editorData: {
              components: [
                { id: "hero-1", type: "Hero", props: { title: "Welcome to ForgeStudio" } },
              ],
            },
            performanceSettings: {
              lazyLoading: true,
              imageOptimization: true,
              cssMinification: true,
            },
          },
        });
        console.log(`[SEED] Created default demo website with ID: ${FIXED_WEBSITE_ID}`);
      }
    }
  } catch (e: any) {
    console.log("Demo user seed check:", e?.message || e);
  }
}

ensureDbSchema().catch((err) => {
  console.error("Failed to run schema auto-migration:", err);
});