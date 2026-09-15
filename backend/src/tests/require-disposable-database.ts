/**
 * @file Require disposable database: regression or diagnostic checks for the behavior named by this file.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
// Imported first by historical scripts, before their database dependency.
// These scripts remain diagnostic only; maintained tests live in backend/tests.
import "dotenv/config";

const candidate = process.env.TEST_DATABASE_URL;
let parsed: URL | undefined;
try { parsed = candidate ? new URL(candidate) : undefined; } catch { /* Reject below. */ }
if (process.env.NODE_ENV !== "test" || process.env.FORGESTUDIO_DISPOSABLE_DATABASE !== "1"
  || !parsed || !["postgres:", "postgresql:"].includes(parsed.protocol)
  || !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
  || !/^\/forgestudio_test_[a-z0-9_]+$/.test(parsed.pathname)
  || decodeURIComponent(parsed.username) !== "forgestudio_test" || parsed.search || parsed.hash) {
  throw new Error("Historical database scripts require an explicitly disposable local TEST_DATABASE_URL. Customer databases are forbidden.");
}
process.env.DATABASE_URL = candidate;
