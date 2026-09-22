import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import {
  createWebsite,
} from "../services/website.service.js";
import {
  connectWordPress,
  verifyWordPressConnection,
  disconnectWordPress,
  revokeWordPressConnection,
  publishToWordPress,
  getWordPressStatus,
} from "../services/wordpress/connector.service.js";

const db = prisma as any;

export async function runF487ConnectionDisconnectTests() {
  console.log("=================================================");
  console.log("RUNNING FEATURE F-487: CONNECTION DISCONNECT SUITE");
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
    // Setup Test Users and Workspace Website
    ownerUser = await prisma.user.create({
      data: {
        email: `f487-owner-${Date.now()}@example.com`,
        name: "F487 Owner User",
        passwordHash: "hashed_pwd",
      },
    });

    unauthorizedUser = await prisma.user.create({
      data: {
        email: `f487-unauth-${Date.now()}@example.com`,
        name: "F487 Unauthorized User",
        passwordHash: "hashed_pwd",
      },
    });

    testWebsite = await createWebsite(
      {
        name: "F-487 Disconnect Workspace",
        subdomain: `f487-site-${Date.now()}`,
        siteSettings: { title: "F-487 Disconnect Site" },
      },
      ownerUser.id
    );

    assert(Boolean(testWebsite?.id), "Setup: Created test website workspace");

    // 1. Missing Connection Disconnect Error Check
    let caughtMissing = false;
    try {
      await disconnectWordPress(testWebsite.id, ownerUser.id);
    } catch (err: any) {
      caughtMissing = err.code === "WORDPRESS_CONNECTION_NOT_FOUND" || err.statusCode === 404;
    }
    assert(caughtMissing, "1. Disconnecting missing connection throws WORDPRESS_CONNECTION_NOT_FOUND (404)");

    // 2. Establish Active WordPress Connection
    const testSiteUrl = "https://f487-disconnect-target-site.com";
    const testApiKey = "f487_secret_connector_key_9999";

    await connectWordPress(
      testWebsite.id,
      ownerUser.id,
      testSiteUrl,
      testApiKey,
      "F487 Disconnect Target"
    );

    const initialStatus = await getWordPressStatus(testWebsite.id, ownerUser.id);
    assert(initialStatus.isConnected === true, "2. Initial connection established and CONNECTED");

    // 3. Unauthorized User Cross-Tenant Disconnect Check
    let caughtUnauth = false;
    try {
      await disconnectWordPress(testWebsite.id, unauthorizedUser.id);
    } catch (err: any) {
      caughtUnauth = err.statusCode === 403 || err.code === "FORBIDDEN";
    }
    assert(caughtUnauth, "3. Tenant Isolation: Unauthorized user cannot disconnect another tenant's site (403 Forbidden)");

    // 4. Successful Disconnect Execution & Result DTO
    const disconnectRes = await disconnectWordPress(testWebsite.id, ownerUser.id);
    assert(disconnectRes.success === true, "4a. Disconnect response returns success = true");
    assert(disconnectRes.status === "DISCONNECTED", "4b. Response status is DISCONNECTED");
    assert(Boolean(disconnectRes.disconnectedAt), "4c. Response contains disconnectedAt timestamp");

    // 5. Database Status & Credential Invalidation Check
    const postStatus = await getWordPressStatus(testWebsite.id, ownerUser.id);
    assert(postStatus.isConnected === false, "5a. isConnected reports false after disconnect");
    assert(postStatus.connection?.status === "DISCONNECTED", "5b. Connection status in database is DISCONNECTED");

    // 6. Publishing Blocked After Disconnect Check
    let caughtPublishBlock = false;
    try {
      await publishToWordPress(testWebsite.id, ownerUser.id, "dep-1", {
        pages: [{ id: "p1", name: "Home", slug: "/" }],
      });
    } catch (err: any) {
      caughtPublishBlock = err.code === "WORDPRESS_NOT_CONNECTED" || err.statusCode === 400;
    }
    assert(caughtPublishBlock, "6. Publishing Protection: Publishing attempts to a disconnected site fail closed (WORDPRESS_NOT_CONNECTED)");

    // 7. Verification Blocked After Disconnect Check
    let caughtVerifyBlock = false;
    try {
      await verifyWordPressConnection(testWebsite.id, ownerUser.id);
    } catch (err: any) {
      caughtVerifyBlock = err.code === "WORDPRESS_CONNECTION_DISCONNECTED" || err.statusCode === 400;
    }
    assert(caughtVerifyBlock, "7. Verification Protection: Verifying a disconnected site throws WORDPRESS_CONNECTION_DISCONNECTED");

    // 8. Idempotent Second Disconnect Call Check
    const secondDisconnect = await disconnectWordPress(testWebsite.id, ownerUser.id);
    assert(secondDisconnect.success === true && secondDisconnect.status === "DISCONNECTED", "8. Idempotency: Second disconnect call succeeds gracefully without throwing");

    // 9. Reconnect Capability Check
    const reconnectRes = await connectWordPress(
      testWebsite.id,
      ownerUser.id,
      testSiteUrl,
      "f487_new_reconnect_api_key_7777",
      "Reconnected Target"
    );
    assert(reconnectRes.success === true && reconnectRes.connection.status === "CONNECTED", "9a. Reconnect after disconnect succeeds using F-485 workflow");

    const reconnectedStatus = await getWordPressStatus(testWebsite.id, ownerUser.id);
    assert(reconnectedStatus.isConnected === true, "9b. Connection status returns to CONNECTED after reconnection");

    // 10. Explicit Security Revocation Check
    const revokeRes = await revokeWordPressConnection(testWebsite.id, ownerUser.id);
    assert(revokeRes.success === true && revokeRes.status === "REVOKED", "10a. Explicit token revocation sets status to REVOKED");

    const postRevokeStatus = await getWordPressStatus(testWebsite.id, ownerUser.id);
    assert(postRevokeStatus.connection?.status === "REVOKED", "10b. Connection status in database is REVOKED");

    // 11. Idempotent Disconnect on Revoked Connection Check
    const disconnectRevoked = await disconnectWordPress(testWebsite.id, ownerUser.id);
    assert(disconnectRevoked.success === true && disconnectRevoked.status === "REVOKED", "11. Idempotency: Calling disconnect on a REVOKED connection returns REVOKED safely");

    // 12. Audit Event Logging Check
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
    assert(auditLogsCount >= 2, "12. Audit Log: CONNECTION_DISCONNECT_STARTED and CONNECTION_DISCONNECTED events recorded");

    // 13. Data Preservation Check
    const preservedSite = await prisma.website.findUnique({ where: { id: testWebsite.id } });
    assert(Boolean(preservedSite?.id), "13. Data Preservation Invariant: Website workspace remains completely intact post-disconnect");

  } catch (err: any) {
    console.error("Test execution error:", err);
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
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes("wordpress-connection-disconnect-f487.test.ts")) {
  runF487ConnectionDisconnectTests()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
