import { defineConfig, env } from "prisma/config";
// Explicit URL only: never silently fall back to the shared DATABASE_URL.
export default defineConfig({
  schema: "../prisma/schema.prisma",
  migrations: { path: "./migrations" },
  datasource: { url: env("MIGRATION_PLAN_DATABASE_URL") },
});
