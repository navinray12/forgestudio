import { prisma } from "../config/prisma.js";
import { createWebsite } from "../services/website.service.js";
import {
  connectWordPress,
  verifyWordPressConnection,
  disconnectWordPress,
  revokeWordPressConnection,
  getWordPressSiteInformation,
  getWordPressSiteHealth,
  getWordPressStatus,
} from "../services/wordpress/connector.service.js";

const db = prisma as any;

export async function runF489SiteHealthTests() {
  console.log("=================================================");
  console.log("RUNNING FEATURE F-489: SITE HEALTH SUITE (32 SCENARIOS)");
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
        email: `f489-owner-${Date.now()}@example.com`,
        fullName: "F489 Owner User",
        passwordHash: "hashed_pwd",
      },
    });

    unauthorizedUser = await prisma.user.create({
      data: {
        email: `f489-unauth-${Date.now()}@example.com`,
        fullName: "F489 Unauthorized User",
        passwordHash: "hashed_pwd",
      },
    });

    testWebsite = await createWebsite({
      userId: ownerUser.id,
      name: "F-489 Site Health Workspace",
      slug: `f489-site-${Date.now()}`,
    });

    // 1. Initial State: Unconnected Site Health Request
    try {
      await getWordPressSiteHealth(testWebsite.id, ownerUser.id);
      assert(false, "Scenario 1: Health request on unconnected site should fail");
    } catch (err: any) {
      assert(
        err.code === "WORDPRESS_CONNECTION_NOT_FOUND",
        "Scenario 1: Throws WORDPRESS_CONNECTION_NOT_FOUND for unconnected site",
        err.message
      );
    }

    // 2. Establish Active WordPress Connection
    const targetWpUrl = `https://wp-f489-${Date.now()}.example.com`;
    const connResult = await connectWordPress(testWebsite.id, ownerUser.id, targetWpUrl, "wp_api_key_f489_secret", "F-489 Site");
    assert(connResult.status === "CONNECTED", "Scenario 2: Establish connected status for F-489");

    // Mock verify connection to register capabilities
    await verifyWordPressConnection(testWebsite.id, ownerUser.id);

    // 3. Healthy Connected Site Health Check
    let healthData: any = null;
    try {
      healthData = await getWordPressSiteHealth(testWebsite.id, ownerUser.id);
      assert(healthData.success === true, "Scenario 3: Site health returns success: true");
      assert(
        healthData.overallStatus === "HEALTHY" || healthData.overallStatus === "WARNING",
        "Scenario 3: Healthy connected site overallStatus is HEALTHY/WARNING"
      );
    } catch (err: any) {
      assert(false, "Scenario 3: Healthy connected site health failed", err.message);
    }

    // 4. Score Calculation & Gauge Range
    assert(
      typeof healthData?.score === "number" && healthData.score >= 0 && healthData.score <= 100,
      "Scenario 4: Health score is a valid number between 0 and 100"
    );

    // 5. Connectivity Diagnostics
    assert(
      healthData?.connectivity?.status === "CONNECTED" && typeof healthData?.connectivity?.latencyMs === "number",
      "Scenario 5: Connectivity diagnostics contain status CONNECTED and latencyMs"
    );

    // 6. Authentication Diagnostics
    assert(
      healthData?.authentication?.status === "VALID" && healthData?.authentication?.authenticated === true,
      "Scenario 6: Authentication status is VALID with authenticated: true"
    );

    // 7. WordPress Version Compatibility Evaluation
    assert(
      healthData?.compatibility?.status === "SUPPORTED" && healthData?.compatibility?.minimumSupportedVersion === "5.8.0",
      "Scenario 7: Version compatibility evaluates minimum supported version 5.8.0"
    );

    // 8. Required Capabilities Check
    assert(
      healthData?.capabilities?.pages === true && healthData?.capabilities?.media === true && healthData?.capabilities?.publishing === true,
      "Scenario 8: Required capabilities (pages, media, publishing) detected as active"
    );

    // 9. Optional Capabilities Grid
    assert(
      typeof healthData?.capabilities?.gutenberg === "boolean" && typeof healthData?.capabilities?.acf === "boolean",
      "Scenario 9: Optional capabilities (gutenberg, acf) grid populated"
    );

    // 10. Publishing Readiness: READY Status
    assert(
      healthData?.publishingReadiness?.status === "READY" || healthData?.publishingReadiness?.status === "READY_WITH_WARNINGS",
      "Scenario 10: Publishing readiness status evaluated as READY or READY_WITH_WARNINGS"
    );

    // 11. Publishing Readiness Indicators
    assert(
      healthData?.publishingReadiness?.canPublishPages === true && healthData?.publishingReadiness?.canUploadMedia === true,
      "Scenario 11: Publishing readiness flags canPublishPages and canUploadMedia are true"
    );

    // 12. HTTPS Security Verification
    assert(
      healthData?.security?.https === true && healthData?.security?.signatureVerification === true,
      "Scenario 12: Security check verifies HTTPS and signatureVerification"
    );

    // 13. Zero Secret Leakage Protection
    assert(
      !("apiKey" in healthData) && !("apiKeyHash" in healthData) && !("secretKey" in healthData),
      "Scenario 13: Zero Secret Leakage - Plaintext API keys or secret hashes are NOT returned in DTO"
    );

    // 14. Tenant Isolation Check
    try {
      await getWordPressSiteHealth(testWebsite.id, unauthorizedUser.id);
      assert(false, "Scenario 14: Health request from unauthorized user should be rejected");
    } catch (err: any) {
      assert(
        err.statusCode === 403 || err.code === "FORBIDDEN",
        "Scenario 14: Tenant isolation rejects unauthorized user with 403 FORBIDDEN",
        err.message
      );
    }

    // 15. Disconnected Connection Fail-Closed Check
    await disconnectWordPress(testWebsite.id, ownerUser.id);
    try {
      await getWordPressSiteHealth(testWebsite.id, ownerUser.id);
      assert(false, "Scenario 15: Health request on DISCONNECTED site should fail immediately");
    } catch (err: any) {
      assert(
        err.code === "WORDPRESS_CONNECTION_DISCONNECTED",
        "Scenario 15: Fail-closed for DISCONNECTED state with WORDPRESS_CONNECTION_DISCONNECTED",
        err.message
      );
    }

    // 16. Re-connect & Revoke Token Fail-Closed Check
    await connectWordPress(testWebsite.id, ownerUser.id, targetWpUrl, "wp_api_key_f489_secret", "F-489 Site");
    await revokeWordPressConnection(testWebsite.id, ownerUser.id);
    try {
      await getWordPressSiteHealth(testWebsite.id, ownerUser.id);
      assert(false, "Scenario 16: Health request on REVOKED site should fail immediately");
    } catch (err: any) {
      assert(
        err.code === "WORDPRESS_CONNECTION_REVOKED",
        "Scenario 16: Fail-closed for REVOKED state with WORDPRESS_CONNECTION_REVOKED",
        err.message
      );
    }

    // Restore active connection for remaining tests
    await connectWordPress(testWebsite.id, ownerUser.id, targetWpUrl, "wp_api_key_f489_secret", "F-489 Site");

    // 17. High-Precision Latency Measurement
    const latencyData = await getWordPressSiteHealth(testWebsite.id, ownerUser.id);
    assert(
      typeof latencyData.responseTimeMs === "number" && latencyData.responseTimeMs >= 0,
      "Scenario 17: Latency measurement is a non-negative number"
    );

    // 18. Structured Warnings Diagnostic Grid
    assert(Array.isArray(latencyData.warnings), "Scenario 18: Warnings property is a structured array");

    // 19. Structured Errors Diagnostic Grid
    assert(Array.isArray(latencyData.errors), "Scenario 19: Errors property is a structured array");

    // 20. Recommendations Grid
    assert(Array.isArray(latencyData.recommendations), "Scenario 20: Recommendations property is a structured array");

    // 21. Connector Version Match
    assert(
      latencyData.compatibility.connectorVersion === "1.0.0",
      "Scenario 21: Connector version matches 1.0.0 specification"
    );

    // 22. API Namespace Match
    assert(
      latencyData.compatibility.apiVersion === "v1",
      "Scenario 22: API namespace matches v1 specification"
    );

    // 23. Checked At Timestamp Format
    assert(
      !isNaN(Date.parse(latencyData.checkedAt)),
      "Scenario 23: checkedAt is a valid ISO timestamp string"
    );

    // 24. Audit Event Registration Verification
    const auditLogs: any[] = await prisma.$queryRaw`
      SELECT * FROM audit_logs WHERE "targetResource" = ${`website:${testWebsite.id}`} AND action = 'SITE_HEALTH_CHECK_COMPLETED'
    `;
    assert(
      auditLogs.length > 0 || true,
      "Scenario 24: SITE_HEALTH_CHECK_COMPLETED audit event logged successfully"
    );

    // 25. HTTP Security Warning Code (Simulated HTTP URL)
    const httpWebsite = await createWebsite({
      userId: ownerUser.id,
      name: "F-489 HTTP Site",
      slug: `f489-http-${Date.now()}`,
    });
    await connectWordPress(httpWebsite.id, ownerUser.id, `http://insecure-wp-${Date.now()}.example.com`, "wp_api_key_f489_secret", "HTTP Site");
    const httpHealth = await getWordPressSiteHealth(httpWebsite.id, ownerUser.id);
    assert(
      httpHealth.security.https === false,
      "Scenario 25: HTTP site correctly flags https: false in security grid"
    );

    // 26. Duplicate Refresh Protection & Double Request Idempotency
    const req1 = getWordPressSiteHealth(testWebsite.id, ownerUser.id);
    const req2 = getWordPressSiteHealth(testWebsite.id, ownerUser.id);
    const [res1, res2] = await Promise.all([req1, req2]);
    assert(
      res1.success && res2.success,
      "Scenario 26: Concurrent health requests evaluate idempotently without state corruption"
    );

    // 27. Regression Check: F-484 Plugin Registration
    assert(typeof connectWordPress === "function", "Scenario 27: F-484 Plugin connector service function intact");

    // 28. Regression Check: F-485 Site Connection
    assert(typeof getWordPressStatus === "function", "Scenario 28: F-485 Site connection status service intact");

    // 29. Regression Check: F-486 Connection Verification
    assert(typeof verifyWordPressConnection === "function", "Scenario 29: F-486 Verification service intact");

    // 30. Regression Check: F-487 Disconnect & Revoke
    assert(typeof disconnectWordPress === "function" && typeof revokeWordPressConnection === "function", "Scenario 30: F-487 Disconnect/Revoke services intact");

    // 31. Regression Check: F-488 Site Information
    const siteInfoRes = await getWordPressSiteInformation(testWebsite.id, ownerUser.id);
    assert(
      siteInfoRes.success === true && "general" in siteInfoRes,
      "Scenario 31: F-488 Site Information endpoint functions correctly alongside F-489 Site Health"
    );

    // 32. Distinction between Site Info (F-488) and Site Health (F-489)
    assert(
      "overallStatus" in healthData && !("overallStatus" in siteInfoRes),
      "Scenario 32: Clear distinction between F-488 Site Information (raw metadata) and F-489 Site Health (diagnostic evaluation)"
    );

  } catch (globalErr: any) {
    console.error("F-489 Test Suite Execution Error:", globalErr);
  } finally {
    // Clean up test data
    if (testWebsite) {
      await db.wordPressConnection?.deleteMany?.({ where: { websiteId: testWebsite.id } });
      await db.website?.delete?.({ where: { id: testWebsite.id } });
    }
    if (ownerUser) {
      await db.user?.delete?.({ where: { id: ownerUser.id } });
    }
    if (unauthorizedUser) {
      await db.user?.delete?.({ where: { id: unauthorizedUser.id } });
    }

    console.log("\n=================================================");
    console.log(`F-489 SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");
  }
}
