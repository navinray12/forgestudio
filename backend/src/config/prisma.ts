import "dotenv/config";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
  process.env.DATABASE_URL ||
  (process.env.NODE_ENV === "test" ? process.env.TEST_DATABASE_URL : undefined);

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required.");
}

export const pgPool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pgPool);

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

/**
 * Validates that required database schema tables and columns are present.
 * Production fails safely by throwing if migrations have not been applied.
 */
export async function validateDatabaseSchema(): Promise<void> {
  const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT (
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') AND
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'websites') AND
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'otp_verifications') AND
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'otp_verifications' AND column_name = 'channel')
    ) AS "exists";
  `;

  if (!result || !result[0]?.exists) {
    throw new Error(
      "Database schema validation failed: core tables or columns are missing. Please run 'prisma migrate deploy'."
    );
  }
}

export async function initializeDatabaseBootstrap(): Promise<void> {
  await validateDatabaseSchema();
}

export default prisma;
