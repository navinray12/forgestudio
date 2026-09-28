import "dotenv/config";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not defined");

// Startup must never rewrite migration history, mutate the schema, or reset user passwords.
// Run reviewed migrations with `prisma migrate deploy` before starting the application.
const globalDatabase = globalThis as unknown as { prisma?: PrismaClient; pgPool?: pg.Pool };
export const pgPool = globalDatabase.pgPool ?? new pg.Pool({ connectionString });
export const prisma = globalDatabase.prisma ?? new PrismaClient({ adapter: new PrismaPg(pgPool) });
if (process.env.NODE_ENV !== "production") {
  globalDatabase.pgPool = pgPool;
  globalDatabase.prisma = prisma;
}
export default prisma;
