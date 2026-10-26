import "dotenv/config";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import pg from "pg";

if (process.env.ALLOW_DISPOSABLE_DB_REHEARSAL !== "true") {
  throw new Error("Set ALLOW_DISPOSABLE_DB_REHEARSAL=true to create and remove a disposable database");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const sourceUrl = new URL(process.env.DATABASE_URL);
const databaseName = `forgestudio_rehearsal_${crypto.randomBytes(5).toString("hex")}`;
if (!/^forgestudio_rehearsal_[a-f0-9]{10}$/.test(databaseName)) {
  throw new Error("Refusing to use an unsafe disposable database name");
}

const maintenanceUrl = new URL(sourceUrl);
maintenanceUrl.pathname = "/postgres";
const disposableUrl = new URL(sourceUrl);
disposableUrl.pathname = `/${databaseName}`;

const admin = new pg.Client({ connectionString: maintenanceUrl.toString() });

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false, env });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  await run(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
    ...process.env,
    DATABASE_URL: disposableUrl.toString(),
  });
  const verification = new pg.Client({ connectionString: disposableUrl.toString() });
  await verification.connect();
  try {
    const result = await verification.query(
      `SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const versionColumn = await verification.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'websites' AND column_name = 'draftVersion'`
    );
    const criticalSchema = await verification.query(
      `SELECT
         to_regclass('public.developer_api_keys') IS NOT NULL AS developer_api_keys,
         to_regclass('public.form_submissions') IS NOT NULL AS form_submissions,
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'form_submissions' AND column_name = 'metadata') AS form_metadata,
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wordpress_connections' AND column_name = 'pluginVersion') AS wp_version`
    );
    const critical = criticalSchema.rows[0];
    if (
      result.rows[0].count < 20 ||
      versionColumn.rowCount !== 1 ||
      !critical.developer_api_keys ||
      !critical.form_submissions ||
      !critical.form_metadata ||
      !critical.wp_version
    ) {
      throw new Error("Migration rehearsal produced an incomplete Phase 1 schema");
    }

    // Representative upgrade/backfill check: an existing website created before
    // optimistic concurrency must survive the additive migration with version 0.
    const userId = crypto.randomUUID();
    const websiteId = crypto.randomUUID();
    await verification.query(
      `INSERT INTO users (id, "fullName", email, status, role, "createdAt", "updatedAt")
       VALUES ($1, 'Migration Test', $2, 'ACTIVE', 'USER', NOW(), NOW())`,
      [userId, `migration-${userId}@example.test`]
    );
    await verification.query(
      `INSERT INTO websites (id, "userId", name, slug, status, "editorData", "createdAt", "updatedAt")
       VALUES ($1, $2, 'Existing Site', $3, 'DRAFT', '{"version":1,"elements":[]}'::jsonb, NOW(), NOW())`,
      [websiteId, userId, `existing-${websiteId}`]
    );
    await verification.query(`ALTER TABLE websites DROP COLUMN "draftVersion"`);
    const upgradeSql = await readFile(
      "prisma/migrations/20261026010000_add_website_draft_version/migration.sql",
      "utf8"
    );
    await verification.query(upgradeSql);
    const upgraded = await verification.query(
      `SELECT "draftVersion", name FROM websites WHERE id = $1`,
      [websiteId]
    );
    if (upgraded.rows[0]?.draftVersion !== 0 || upgraded.rows[0]?.name !== "Existing Site") {
      throw new Error("Representative website data did not survive the concurrency migration");
    }

    console.log(`Migration rehearsal passed (${result.rows[0].count} public tables; existing data preserved)`);
  } finally {
    await verification.end();
  }
} finally {
  if (!admin._ending) {
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [databaseName]
    ).catch(() => undefined);
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`).catch(() => undefined);
    await admin.end();
  }
}
