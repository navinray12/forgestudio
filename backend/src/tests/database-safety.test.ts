import assert from "node:assert";
import {
  sanitizeDatabaseUrl,
  validateDisposableDatabaseUrl,
  assertSafeDisposableDatabase,
  assertDatabaseIsolation,
} from "../utils/database-safety.js";

async function runDatabaseSafetyTests() {
  console.log("=================================================");
  console.log("TESTING DATABASE SAFETY & DISPOSABLE ISOLATION");
  console.log("=================================================\n");

  const origNodeEnv = process.env.NODE_ENV;

  try {
    // 1. Password Masking
    console.log("[TEST 1] Password Masking...");
    const urlWithSecret = "postgresql://postgres:SuperSecretPassword123!@localhost:5432/test_db";
    const sanitized = sanitizeDatabaseUrl(urlWithSecret);
    assert(!sanitized.includes("SuperSecretPassword123!"), "Password must never be printed in sanitized URL");
    assert(sanitized.includes("***"), "Password should be replaced with ***");
    console.log("  ✓ Password properly masked in logs:", sanitized);

    // 2. Ordinary development database rejection
    console.log("\n[TEST 2] Ordinary Development Database Rejection...");
    const ordinaryDevUrls = [
      "postgresql://postgres:pass@localhost:5432/elementor_saas?schema=public",
      "postgresql://postgres:pass@127.0.0.1:5432/forgestudio",
      "postgresql://postgres:pass@localhost:5432/postgres",
      "postgresql://postgres:pass@localhost:5432/development",
    ];

    for (const devUrl of ordinaryDevUrls) {
      const res = validateDisposableDatabaseUrl(devUrl);
      assert.strictEqual(res.safe, false, `Ordinary dev database must be rejected: ${devUrl}`);
      assert(res.error?.includes("rejected"), `Error message must explain rejection for: ${devUrl}`);
    }
    console.log("  ✓ Ordinary development databases (including elementor_saas and postgres) strictly rejected");

    // 3. ALLOW_DISPOSABLE_TEST_DB cannot authorize non-test DB
    console.log("\n[TEST 3] ALLOW_DISPOSABLE_TEST_DB Cannot Override Test Designation...");
    process.env.ALLOW_DISPOSABLE_TEST_DB = "true";
    const ordinaryWithFlag = "postgresql://postgres:pass@localhost:5432/elementor_saas";
    const resFlag = validateDisposableDatabaseUrl(ordinaryWithFlag);
    assert.strictEqual(resFlag.safe, false, "ALLOW_DISPOSABLE_TEST_DB must not authorize ordinary dev database");
    delete process.env.ALLOW_DISPOSABLE_TEST_DB;
    console.log("  ✓ Confirmed ALLOW_DISPOSABLE_TEST_DB alone cannot authorize ordinary development database");

    // 4. Remote and Cloud Database Rejection
    console.log("\n[TEST 4] Remote & Cloud Host Rejection...");
    const remoteUrls = [
      "postgresql://postgres:pass@rds.amazonaws.com:5432/app_test",
      "postgresql://postgres:pass@192.168.1.100:5432/app_e2e",
      "postgresql://postgres:pass@db.production.io:5432/disposable_db",
    ];

    for (const remoteUrl of remoteUrls) {
      const res = validateDisposableDatabaseUrl(remoteUrl);
      assert.strictEqual(res.safe, false, `Remote host must be rejected: ${remoteUrl}`);
      assert(res.error?.includes("Remote database host"), "Error must cite remote host rejection");
    }
    console.log("  ✓ Remote and cloud host targets strictly rejected");

    // 5. Production Environment Rejection
    console.log("\n[TEST 5] Production Environment Rejection...");
    process.env.NODE_ENV = "production";
    const testUrlInProd = "postgresql://postgres:pass@localhost:5432/elementor_saas_test";
    const resProd = validateDisposableDatabaseUrl(testUrlInProd);
    assert.strictEqual(resProd.safe, false, "Must reject even valid test database in production environment");
    assert(resProd.error?.includes("NODE_ENV is set to 'production'"), "Error must cite production environment");
    process.env.NODE_ENV = "test";
    console.log("  ✓ Production environment strictly blocked");

    // 6. Valid Dedicated Disposable Databases Accepted
    console.log("\n[TEST 6] Valid Disposable Databases Accepted...");
    const validTestUrls = [
      "postgresql://postgres:pass@localhost:5432/elementor_saas_test",
      "postgresql://postgres:pass@127.0.0.1:5432/forgestudio_disposable_fresh?schema=public",
      "postgresql://postgres:pass@localhost:5432/test_elementor",
      "postgresql://postgres:pass@localhost:5432/forgestudio_e2e",
    ];

    for (const validUrl of validTestUrls) {
      const res = validateDisposableDatabaseUrl(validUrl);
      assert.strictEqual(res.safe, true, `Valid disposable database must be accepted: ${validUrl}`);
      assertSafeDisposableDatabase(validUrl);
    }
    console.log("  ✓ Dedicated disposable databases containing test/e2e/disposable verified safe");

    // 7. Database Target Isolation & Mismatch Detection
    console.log("\n[TEST 7] Target Mismatch & Isolation Assertion...");
    const expectedTarget = "postgresql://postgres:pass@localhost:5432/elementor_saas_test";
    const mismatchedTarget = "postgresql://postgres:pass@localhost:5432/forgestudio_disposable_fresh";

    // Matching URLs pass isolation check
    assertDatabaseIsolation(expectedTarget, expectedTarget);
    console.log("  ✓ Identical test targets pass isolation verification");

    // Mismatched URLs fail with fatal isolation error
    let mismatchCaught = false;
    try {
      assertDatabaseIsolation(expectedTarget, mismatchedTarget);
    } catch (err: any) {
      mismatchCaught = true;
      assert(err.message.includes("Database Target Mismatch"), "Error must indicate mismatch");
      assert(!err.message.includes("pass"), "Error message must never contain credentials");
    }
    assert(mismatchCaught, "Mismatched database targets must throw isolation violation error");
    console.log("  ✓ Mismatched database targets successfully rejected with fatal isolation error");

    console.log("\n=================================================");
    console.log("ALL DATABASE SAFETY TESTS PASSED (7/7)");
    console.log("=================================================\n");
  } finally {
    process.env.NODE_ENV = origNodeEnv;
  }
}

runDatabaseSafetyTests().catch((err) => {
  console.error("\n❌ Database safety test FAILED:", err);
  process.exit(1);
});
