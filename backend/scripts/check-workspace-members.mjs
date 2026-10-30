// Read-only deployment readiness probe. Does not import Prisma's startup schema repair code.
import "dotenv/config";
import pg from "pg";
const configuration = Object.fromEntries(["DATABASE_URL", "FRONTEND_URL", "SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"].map(name => [name, Boolean(process.env[name])]));
configuration.SMTP_FROM = Boolean(process.env.SMTP_FROM || process.env.SMTP_USER);
configuration.WORKSPACE_INVITATION_TOKEN_KEY = /^[a-f0-9]{64}$/i.test(process.env.WORKSPACE_INVITATION_TOKEN_KEY || "");
let originValid = false;
try { const url = new URL(process.env.FRONTEND_URL); originValid = !url.username && !url.password && !url.search && !url.hash && url.pathname === "/" && (url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))); } catch { /* Report only validity, never configuration secrets. */ }
configuration.FRONTEND_URL = originValid;
const port = Number(process.env.SMTP_PORT || 587); configuration.SMTP_PORT = Number.isInteger(port) && port > 0 && port < 65536;
const result = { configuration, database: null, ready: false };
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
try {
  if (!process.env.DATABASE_URL) throw Object.assign(new Error(), { code: "DATABASE_URL_MISSING" });
  const schema = await pool.query(`SELECT to_regclass('public.workspace_email_invitations') IS NOT NULL AS invitation_table,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspaces' AND column_name='membersVersion') AS members_version,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspaces' AND column_name='lifecycleStatus') AS workspace_lifecycle`);
  const migrations = await pool.query('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL');
  result.database = { reachable: true, ...schema.rows[0], unfinishedMigrations: migrations.rows.map(row => row.migration_name) };
  result.ready = Object.values(configuration).every(Boolean) && Object.values(schema.rows[0]).every(Boolean) && migrations.rows.length === 0;
} catch (error) { result.database = { reachable: false, code: error.code || "DATABASE_CHECK_FAILED" }; }
finally { await pool.end(); }
console.log(JSON.stringify(result, null, 2));
if (!result.ready) process.exitCode = 1;
