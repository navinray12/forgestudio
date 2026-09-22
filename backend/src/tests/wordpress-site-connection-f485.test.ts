import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import {
  createWebsite,
  getWebsiteById,
} from "../services/website.service.js";
import {
  connectWordPress,
  getWordPressStatus,
  verifyWordPressConnection,
  disconnectWordPress,
  revokeWordPressConnection,
  validateAndNormalizeWordPressUrl,
} from "../services/wordpress/connector.service.js";

const db = prisma as any;

export async function runF485SiteConnectionTests() {
  console.log("=================================================");
  console.log("RUNNING FEATURE F-485: SITE CONNECTION SUITE");
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
  let testWebsite1: any = null;
  let testWebsite2: any = null;

  try {
    // Setup Test Users and Websites
    ownerUser = await prisma.user.create({
      data: {
        email: `f485-owner-${Date.now()}@example.com`,
        name: "F485 Owner User",
        passwordHash: "hashed_pwd",
      },
    });

    unauthorizedUser = await prisma.user.create({
      data: {
        email: `f485-unauth-${Date.now()}@example.com`,
        name: "F485 Unauthorized User",
        passwordHash: "hashed_pwd",
      },
    });

    testWebsite1 = await createWebsite(
      {
        name: "F-485 Primary Website Workspace",
        subdomain: `f485-site1-${Date.now()}`,
        siteSettings: { title: "F-485 Test Site 1" },
      },
      ownerUser.id
    );

    testWebsite2 = await createWebsite(
      {
        name: "F-485 Secondary Website Workspace",
        subdomain: `f485-site2-${Date.now()}`,
        siteSettings: { title: "F-485 Test Site 2" },
      },
      ownerUser.id
    );

    assert(Boolean(testWebsite1?.id && testWebsite2?.id), "Setup: Created test website workspaces");

    // 1. URL Validation & Normalization
    const normUrl = validateAndNormalizeWordPressUrl("  https://my-wp-brand.com/blog/  ");
    assert(normUrl === "https://my-wp-brand.com/blog", "1. Valid URL normalized correctly (removed trailing slash)");

    // 2. Invalid URL Structure Protection
    let caughtInvalidUrl = false;
    try {
      validateAndNormalizeWordPressUrl("not-a-valid-url-format-at-all!#");
    } catch (err: any) {
      caughtInvalidUrl = err.code === "WORDPRESS_URL_INVALID" || err.message.includes("Invalid");
    }
    assert(caughtInvalidUrl, "2. Rejects invalid URL structure with WORDPRESS_URL_INVALID");

    // 3. SSRF Protection: Loopback, Private IPs & Metadata
    let caughtSsrfLocalhost = false;
    try {
      validateAndNormalizeWordPressUrl("http://localhost:8080/wp");
    } catch (err: any) {
      caughtSsrfLocalhost = err.code === "WORDPRESS_URL_INVALID" || err.message.includes("SSRF Protection");
    }
    assert(caughtSsrfLocalhost, "3a. SSRF Protection blocks localhost");

    let caughtSsrfPrivateIp = false;
    try {
      validateAndNormalizeWordPressUrl("http://192.168.1.50/wp-admin");
    } catch (err: any) {
      caughtSsrfPrivateIp = err.code === "WORDPRESS_URL_INVALID" || err.message.includes("SSRF Protection");
    }
    assert(caughtSsrfPrivateIp, "3b. SSRF Protection blocks private IP ranges (192.168.x.x)");

    let caughtSsrfMetadata = false;
    try {
      validateAndNormalizeWordPressUrl("http://169.254.169.254/latest/meta-data/");
    } catch (err: any) {
      caughtSsrfMetadata = err.code === "WORDPRESS_URL_INVALID" || err.message.includes("SSRF Protection");
    }
    assert(caughtSsrfMetadata, "3c. SSRF Protection blocks AWS cloud metadata IP (169.254.169.254)");

    // 4. Zero Plaintext API Key Storage Invariant & Valid Connection Lifecycle
    const testSiteUrl = "https://f485-live-wordpress-destination.com";
    const testApiKey = "f485_secret_connector_api_key_999";
    const expectedHash = crypto.createHash("sha256").update(testApiKey).digest("hex");

    const connDto = await connectWordPress(
      testWebsite1.id,
      ownerUser.id,
      testSiteUrl,
      testApiKey,
      "F485 WP Destination"
    );

    assert(connDto.status === "CONNECTED", "4a. Initial connection succeeded with status CONNECTED");
    assert(connDto.siteUrl === testSiteUrl, "4b. Normalized siteUrl stored on DTO");

    let rawDbConn: any = null;
    if (db?.wordPressConnection?.findUnique) {
      rawDbConn = await db.wordPressConnection.findUnique({ where: { websiteId: testWebsite1.id } });
    } else {
      const rows: any[] = await prisma.$queryRaw`SELECT * FROM wordpress_connections WHERE "websiteId" = ${testWebsite1.id}::uuid`;
      rawDbConn = rows[0];
    }
    assert(rawDbConn.apiKeyHash === expectedHash, "4c. Invariant: Plaintext API key is hashed with SHA-256 before storage");
    assert(rawDbConn.apiKey === undefined, "4d. Invariant: Plaintext API key is never persisted in database");

    // 5. Duplicate Connection Prevention Across Projects
    let caughtDuplicate = false;
    try {
      await connectWordPress(
        testWebsite2.id,
        ownerUser.id,
        testSiteUrl, // Same site URL
        testApiKey,
        "Duplicate Site"
      );
    } catch (err: any) {
      caughtDuplicate = err.code === "WORDPRESS_CONNECTION_EXISTS" || err.statusCode === 409;
    }
    assert(caughtDuplicate, "5. Duplicate Connection Prevention: Rejects connecting same WP URL to another website (409 Conflict)");

    // 6. Verification Endpoint & Health Check
    const verifyRes = await verifyWordPressConnection(testWebsite1.id, ownerUser.id);
    assert(verifyRes.verified === true, "6a. Verification endpoint returns verified = true");
    assert(verifyRes.status === "CONNECTED", "6b. Status remains CONNECTED after verification");

    // 7. Revoke Connection Flow
    const revokeRes = await revokeWordPressConnection(testWebsite1.id, ownerUser.id);
    assert(revokeRes.success === true, "7a. Revoking connection returned success = true");
    assert(revokeRes.status === "REVOKED", "7b. Status changed to REVOKED");

    const postRevokeStatus = await getWordPressStatus(testWebsite1.id, ownerUser.id);
    assert(postRevokeStatus.connection?.status === "REVOKED", "7c. Status endpoint reflects REVOKED status");
    assert(Boolean(postRevokeStatus.connection?.revokedAt), "7d. RevokedAt timestamp is populated");

    // 8. Reconnect Flow after Revocation / Disconnection
    const reconnectDto = await connectWordPress(
      testWebsite1.id,
      ownerUser.id,
      testSiteUrl,
      testApiKey,
      "F485 WP Destination Reconnected"
    );
    assert(reconnectDto.status === "CONNECTED", "8a. Reconnect flow successfully restores status to CONNECTED");

    // 9. Safe Disconnection Flow
    const disconnectRes = await disconnectWordPress(testWebsite1.id, ownerUser.id);
    assert(disconnectRes.success === true, "9a. Disconnect returned success = true");

    const postDisconnectStatus = await getWordPressStatus(testWebsite1.id, ownerUser.id);
    assert(postDisconnectStatus.connection?.status === "DISCONNECTED", "9b. Status endpoint reflects DISCONNECTED");

    // Invariant: Verify ForgeStudio website workspace and data preserved
    const websiteAfterDisconnect = await getWebsiteById(testWebsite1.id, ownerUser.id);
    assert(Boolean(websiteAfterDisconnect?.id), "9c. Invariant: Website workspace data preserved after disconnection");

    // 10. RBAC & Tenant Isolation Enforcement
    let caughtRbacError = false;
    try {
      await connectWordPress(
        testWebsite1.id,
        unauthorizedUser.id,
        "https://unauthorized-destination.com",
        "secret_key_12345678"
      );
    } catch (err: any) {
      caughtRbacError = err.statusCode === 403 || err.code === "FORBIDDEN" || err.message.includes("permission");
    }
    assert(caughtRbacError, "10. Tenant Isolation & RBAC: Unauthorized user cannot connect or modify WordPress destination (403 Forbidden)");

    // 11. Audit Logging Verification
    let auditLogsCount = 0;
    if (db?.auditLog?.count) {
      auditLogsCount = await db.auditLog.count({
        where: { targetResource: `website:${testWebsite1.id}` },
      });
    } else {
      const rows: any[] = await prisma.$queryRaw`
        SELECT COUNT(*)::int as count FROM audit_logs WHERE "targetResource" = ${`website:${testWebsite1.id}`}
      `;
      auditLogsCount = rows[0]?.count || 0;
    }
    assert(auditLogsCount > 0, `11. Audit Events Logged: Generated ${auditLogsCount} audit logs during site connection lifecycle`);

  } catch (err: any) {
    console.error("Test execution threw error:", err);
    failed++;
  } finally {
    // Cleanup
    if (testWebsite1?.id) {
      await prisma.$executeRawUnsafe(`DELETE FROM wordpress_page_mappings WHERE "websiteId" = $1::uuid`, testWebsite1.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM wordpress_connections WHERE "websiteId" = $1::uuid`, testWebsite1.id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM audit_logs WHERE "targetResource" = $1`, `website:${testWebsite1.id}`).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM websites WHERE id = $1::uuid`, testWebsite1.id).catch(() => {});
    }
    if (testWebsite2?.id) {
      await prisma.$executeRawUnsafe(`DELETE FROM websites WHERE id = $1::uuid`, testWebsite2.id).catch(() => {});
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
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes("wordpress-site-connection-f485.test.ts")) {
  runF485SiteConnectionTests()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
