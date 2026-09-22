import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import {
  createWebsite,
  getWebsiteById,
} from "../services/website.service.js";
import {
  connectWordPress,
  verifyWordPressConnection,
  revokeWordPressConnection,
  disconnectWordPress,
  getWordPressStatus,
} from "../services/wordpress/connector.service.js";

const db = prisma as any;

export async function runF486ConnectionVerificationTests() {
  console.log("=================================================");
  console.log("RUNNING FEATURE F-486: CONNECTION VERIFICATION SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ""}`);
      failed++;
    }
  }

  let ownerUser: any = null;
  let unauthorizedUser: any = null;
  let testWebsite: any = null;

  try {
    // Setup Test Users and Website
    ownerUser = await prisma.user.create({
      data: {
        email: `f486-owner-${Date.now()}@example.com`,
        name: "F486 Owner User",
        passwordHash: "hashed_pwd",
      },
    });

    unauthorizedUser = await prisma.user.create({
      data: {
        email: `f486-unauth-${Date.now()}@example.com`,
        name: "F486 Unauthorized User",
        passwordHash: "hashed_pwd",
      },
    });

    testWebsite = await createWebsite(
      {
        name: "F-486 Verification Workspace",
        subdomain: `f486-site-${Date.now()}`,
        siteSettings: { title: "F-486 Verification Site" },
      },
      ownerUser.id
    );

    assert(Boolean(testWebsite?.id), "Setup: Created test website workspace");

    // 1. Missing Connection Verification
    let caughtMissing = false;
    try {
      await verifyWordPressConnection(testWebsite.id, ownerUser.id);
    } catch (err: any) {
      caughtMissing = err.code === "WORDPRESS_CONNECTION_NOT_FOUND" || err.statusCode === 404;
    }
    assert(caughtMissing, "1. Missing connection throws WORDPRESS_CONNECTION_NOT_FOUND (404)");

    // 2. Connect Active WordPress Connection
    const testSiteUrl = "https://f486-live-wordpress-target.com";
    const testApiKey = "f486_secret_connector_api_key_8888";
    const expectedApiKeyHash = crypto.createHash("sha256").update(testApiKey).digest("hex");

    await connectWordPress(
      testWebsite.id,
      ownerUser.id,
      testSiteUrl,
      testApiKey,
      "F486 Remote Site"
    );

    // 3. Healthy Verification Execution & Response Metrics
    const verifyRes = await verifyWordPressConnection(testWebsite.id, ownerUser.id);
    assert(verifyRes.success === true, "3a. Verification response returns success = true");
    assert(verifyRes.verification?.healthy === true, "3b. Health status is reported as healthy = true");
    assert(verifyRes.verification?.status === "CONNECTED", "3c. Connection status is CONNECTED");
    assert(typeof verifyRes.verification?.responseTimeMs === "number" && verifyRes.verification.responseTimeMs >= 0, "3d. High-precision roundtrip latency (responseTimeMs) measured");
    assert(verifyRes.verification?.pluginVersion === "1.0.0", "3e. Verified plugin version is 1.0.0");
    assert(verifyRes.verification?.apiVersion === "v1", "3f. Verified API version is v1");

    // 4. Dynamic Capability Detection
    const caps = verifyRes.verification?.capabilities || [];
    assert(Array.isArray(caps) && caps.length >= 3, "4a. Dynamic capabilities returned as an array");
    assert(caps.includes("pages") && caps.includes("media") && caps.includes("publishing"), "4b. Verified capabilities include core WordPress functions ('pages', 'media', 'publishing')");

    // 5. Successful Database Update Verification
    let dbConn: any = null;
    if (db?.wordPressConnection?.findUnique) {
      dbConn = await db.wordPressConnection.findUnique({ where: { websiteId: testWebsite.id } });
    } else {
      const rows: any[] = await prisma.$queryRaw`SELECT * FROM wordpress_connections WHERE "websiteId" = ${testWebsite.id}::uuid`;
      dbConn = rows[0];
    }
    assert(Boolean(dbConn?.lastVerifiedAt), "5a. lastVerifiedAt timestamp is persisted in database");
    assert(dbConn.status === "CONNECTED", "5b. Connection status in database remains CONNECTED");
    assert(dbConn.failureReason === null || dbConn.failureReason === undefined, "5c. failureReason is cleared on healthy verification");

    // 6. Audit Logging Verification
    let auditLogsCount = 0;
    if (db?.auditLog?.count) {
      auditLogsCount = await db.auditLog.count({
        where: { targetResource: `website:${testWebsite.id}` },
      });
    } else {
      const rows: any[] = await prisma.$queryRaw`
        SELECT COUNT(*)::int as count FROM audit_logs WHERE "targetResource" = ${`website:${testWebsite.id}`}
      `;
      auditLogsCount = rows[0]?.count || 0;
    }
    assert(auditLogsCount > 0, "6. Audit log created for CONNECTION_VERIFIED event");

    // 7. Tenant Isolation & Authorization Check
    let caughtUnauth = false;
    try {
      await verifyWordPressConnection(testWebsite.id, unauthorizedUser.id);
    } catch (err: any) {
      caughtUnauth = err.statusCode === 403 || err.code === "FORBIDDEN";
    }
    assert(caughtUnauth, "7. Tenant Isolation: Unauthorized user cannot trigger verification (403 Forbidden)");

    // 8. Revoked Connection Check
    await revokeWordPressConnection(testWebsite.id, ownerUser.id);

    let caughtRevoked = false;
    try {
      await verifyWordPressConnection(testWebsite.id, ownerUser.id);
    } catch (err: any) {
      caughtRevoked = err.code === "WORDPRESS_CONNECTION_REVOKED" || err.statusCode === 400;
    }
    assert(caughtRevoked, "8. Revoked connection check throws WORDPRESS_CONNECTION_REVOKED");

    // 9. Reconnect and Test Disconnected State Check
    await connectWordPress(testWebsite.id, ownerUser.id, testSiteUrl, testApiKey, "Reconnected Site");
    await disconnectWordPress(testWebsite.id, ownerUser.id);

    let caughtDisconnected = false;
    try {
      await verifyWordPressConnection(testWebsite.id, ownerUser.id);
    } catch (err: any) {
      caughtDisconnected = err.code === "WORDPRESS_CONNECTION_DISCONNECTED" || err.statusCode === 400;
    }
    assert(caughtDisconnected, "9. Disconnected connection check throws WORDPRESS_CONNECTION_DISCONNECTED");

    // 10. Reconnect & Rate Limiting Enforcement
    await connectWordPress(testWebsite.id, ownerUser.id, testSiteUrl, testApiKey, "Rate Limit Site");
    let caughtRateLimit = false;
    try {
      // Fire 12 consecutive requests to exceed 10 req/min limit
      for (let i = 0; i < 12; i++) {
        await verifyWordPressConnection(testWebsite.id, ownerUser.id);
      }
    } catch (err: any) {
      caughtRateLimit = err.statusCode === 429 || err.code === "RATE_LIMIT_EXCEEDED";
    }
    assert(caughtRateLimit, "10. Rate limiting blocks excessive verification requests (> 10 req/min) with 429 RATE_LIMIT_EXCEEDED");

  } catch (err: any) {
    console.error("Test execution threw error:", err);
    failed++;
  } finally {
    // Cleanup
    if (testWebsite?.id) {
      await prisma.$executeRawUnsafe(`DELETE FROM wordpress_connections WHERE "websiteId" = $1::uuid`, testWebsite.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM audit_logs WHERE "targetResource" = $1`, `website:${testWebsite.id}`).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM websites WHERE id = $1::uuid`, testWebsite.id).catch(() => {});
    }
    if (ownerUser?.id) {
      await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = $1::uuid`, ownerUser.id).catch(() => {});
    }
    if (unauthorizedUser?.id) {
      await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = $1::uuid`, unauthorizedUser.id).catch(() => {});
    }
  }

  console.log("\n=================================================");
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes("wordpress-connection-verification-f486.test.ts")) {
  runF486ConnectionVerificationTests()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
