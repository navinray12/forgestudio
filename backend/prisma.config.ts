import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    url: process.env.DATABASE_URL || "postgresql://postgres:ci_dummy_password@127.0.0.1:5432/forgestudio_ci_disposable?schema=public",
  },
});