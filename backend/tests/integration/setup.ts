/**
 * @file Setup: regression or diagnostic checks for the behavior named by this file.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
// Run before importing application modules; no .env database is ever selected.
import { assertDisposableDatabase } from "../../../scripts/test-database-safety.mjs";
process.env.DATABASE_URL = assertDisposableDatabase(
  process.env.TEST_DATABASE_URL,
  process.env,
);
