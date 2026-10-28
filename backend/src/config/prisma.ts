import "dotenv/config";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Resolves the exact connection string Prisma and pgPool will use.
 * In test mode (NODE_ENV === 'test') or when TEST_DATABASE_URL is set,
 * TEST_DATABASE_URL is strictly prioritized.
 */
export function resolveActiveDatabaseUrl(): string {
  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.TEST_DATABASE_URL);
  const selected = (isTest && process.env.TEST_DATABASE_URL)
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;

  if (!selected) {
    throw new Error("DATABASE_URL or TEST_DATABASE_URL environment variable is required.");
  }
  return selected;
}

const connectionString = resolveActiveDatabaseUrl();
// Synchronize environment so child processes or external drivers use identical connection
process.env.DATABASE_URL = connectionString;

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
