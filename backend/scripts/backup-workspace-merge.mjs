import "dotenv/config";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

// Full read-only pg_dump keeps dependent data available if a future workspace merge is approved.
const url = new URL(process.env.DATABASE_URL || "");
const binaryDir = process.env.PG_BIN_DIR || "C:\\Program Files\\PostgreSQL\\18\\bin";
const backupDir = path.join(os.tmpdir(), "forgestudio-workspace-merge");
mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(backupDir, `before-merge-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.dump`);
const pgEnv = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)) };
if (url.searchParams.has("sslmode")) pgEnv.PGSSLMODE = url.searchParams.get("sslmode");
const dump = spawnSync(path.join(binaryDir, "pg_dump.exe"), ["--format=custom", "--file", backupPath], { env: pgEnv, encoding: "utf8" });
if (dump.status !== 0) throw new Error(`pg_dump failed: ${dump.stderr}`);
const listing = spawnSync(path.join(binaryDir, "pg_restore.exe"), ["--list", backupPath], { env: pgEnv, encoding: "utf8" });
if (listing.status !== 0) throw new Error(`Backup listing failed: ${listing.stderr}`);
const bytes = readFileSync(backupPath);
const manifest = { backupPath, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"),
  archiveEntries: listing.stdout.split(/\r?\n/).filter(line => /^\d+;/.test(line)).length,
  createdAt: new Date().toISOString(), database: pgEnv.PGDATABASE };
writeFileSync(`${backupPath}.json`, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
