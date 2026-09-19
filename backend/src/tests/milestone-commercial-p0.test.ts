import { prisma } from "../config/prisma.js";
import app from "../app.js";
import { sanitizeCustomHead } from "../services/destinations/staticCompiler.js";
import { publishToWordPress } from "../services/wordpress/connector.service.js";
import { createWebsite } from "../services/website.service.js";

const db = prisma as any;

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, details || "");
    failed++;
  }
}

async function runCommercialP0Tests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO COMMERCIAL COMPLETION - MILESTONE 1 (P0)");
  console.log("Security Guards, Route Roles & Publishing Invariants");
  console.log("=================================================\n");

  const timestamp = Date.now();
  let normalUser: any;
  let adminUser: any;
  let testWebsite: any;

  try {
    // 1. Setup Test Users
    normalUser = await db.user.create({
      data: {
        email: `normal_p0_${timestamp}@example.com`,
        fullName: "Normal Customer",
        role: "USER",
        status: "ACTIVE",
      },
    });

    adminUser = await db.user.create({
      data: {
        email: `admin_p0_${timestamp}@example.com`,
        fullName: "Platform Admin",
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    testWebsite = await createWebsite({
      name: `P0 Security Test Site ${timestamp}`,
      slug: `p0-sec-${timestamp}`,
      userId: normalUser.id,
    });

    // ---------------------------------------------------------------------------
    // TEST SECTION 1: GAP-SEC-001 (Operations Routes Role Authorization)
    // ---------------------------------------------------------------------------
    console.log("--- 1. Operations Route Access Control (GAP-SEC-001) ---");

    // Test 1: Non-admin user is rejected from GET /api/v1/operations/jobs (403 Forbidden)
    const resUserJobs = await requestApp(app, "GET", "/api/v1/operations/jobs", normalUser);
    assert(
      resUserJobs.status === 403,
      "Test 1: Regular USER is strictly blocked from GET /api/v1/operations/jobs (403 Forbidden)",
      resUserJobs
    );

    // Test 2: Non-admin user is rejected from POST /api/v1/operations/jobs/process-next (403 Forbidden)
    const resUserProcess = await requestApp(app, "POST", "/api/v1/operations/jobs/process-next", normalUser);
    assert(
      resUserProcess.status === 403,
      "Test 2: Regular USER is strictly blocked from POST /api/v1/operations/jobs/process-next (403 Forbidden)",
      resUserProcess
    );

    // Test 3: Non-admin user is rejected from GET /api/v1/operations/alerts (403 Forbidden)
    const resUserAlerts = await requestApp(app, "GET", "/api/v1/operations/alerts", normalUser);
    assert(
      resUserAlerts.status === 403,
      "Test 3: Regular USER is strictly blocked from GET /api/v1/operations/alerts (403 Forbidden)",
      resUserAlerts
    );

    // Test 4: Admin user is authorized to GET /api/v1/operations/jobs (200 OK)
    const resAdminJobs = await requestApp(app, "GET", "/api/v1/operations/jobs", adminUser);
    assert(
      resAdminJobs.status === 200 && resAdminJobs.body?.success === true,
      "Test 4: Platform ADMIN is granted access to GET /api/v1/operations/jobs (200 OK)",
      resAdminJobs
    );

    // ---------------------------------------------------------------------------
    // TEST SECTION 2: GAP-SEC-002 (Invitation Routes Defense-in-Depth)
    // ---------------------------------------------------------------------------
    console.log("\n--- 2. Invitation Routes Defense-in-Depth (GAP-SEC-002) ---");

    // Test 5: Unshielded shorthand /invitations/:id/revoke is not accessible without website capability context
    const resShorthand = await requestApp(app, "POST", "/api/v1/websites/invitations/inv-123/revoke", normalUser);
    assert(
      resShorthand.status === 404 || resShorthand.status === 403,
      "Test 5: Unshielded shorthand /invitations/:inviteId/revoke route is eliminated (404/403)",
      resShorthand
    );

    // ---------------------------------------------------------------------------
    // TEST SECTION 3: GAP-SEC-003 (Static Compiler Head Tag Sanitization)
    // ---------------------------------------------------------------------------
    console.log("\n--- 3. Static Compiler Head Sanitization (GAP-SEC-003) ---");

    // Test 6: iframe and embed elements are stripped
    const dirtyHead1 = `<iframe src="https://attacker.com/evil"></iframe><link rel="stylesheet" href="fonts.css">`;
    const cleanHead1 = sanitizeCustomHead(dirtyHead1);
    assert(
      !cleanHead1.includes("<iframe") && cleanHead1.includes("<link rel="),
      "Test 6: sanitizeCustomHead strips dangerous <iframe> tags and preserves safe <link>",
      cleanHead1
    );

    // Test 7: Inline event handlers (onload, onerror) are stripped
    const dirtyHead2 = `<script src="https://cdn.example.com/lib.js" onload="alert('pwned')"></script>`;
    const cleanHead2 = sanitizeCustomHead(dirtyHead2);
    assert(
      !cleanHead2.includes("onload=") && cleanHead2.includes("src=\"https://cdn.example.com/lib.js\""),
      "Test 7: sanitizeCustomHead strips inline event handlers from scripts",
      cleanHead2
    );

    // Test 8: javascript: URI schemes are neutralized
    const dirtyHead3 = `<a href="javascript:alert(1)">Link</a>`;
    const cleanHead3 = sanitizeCustomHead(dirtyHead3);
    assert(
      !cleanHead3.includes("javascript:"),
      "Test 8: sanitizeCustomHead neutralizes javascript: URI schemes",
      cleanHead3
    );

    // ---------------------------------------------------------------------------
    // TEST SECTION 4: GAP-WP-001 (WordPress Failure Transparency)
    // ---------------------------------------------------------------------------
    console.log("\n--- 4. WordPress Publishing Invariant (GAP-WP-001) ---");

    // Configure connection with unreachable siteUrl
    await db.wordPressConnection.upsert({
      where: { websiteId: testWebsite.id },
      update: {
        siteUrl: "https://nonexistent-wp-server-998811.invalid",
        apiKeyHash: "test_key_hash",
        status: "CONNECTED",
      },
      create: {
        websiteId: testWebsite.id,
        userId: normalUser.id,
        siteUrl: "https://nonexistent-wp-server-998811.invalid",
        apiKeyHash: "test_key_hash",
        status: "CONNECTED",
      },
    });

    // Test 9: In strict mode, publishToWordPress throws when remote endpoint is unreachable
    process.env.FORGESTUDIO_WP_STRICT_SYNC = "true";
    let threwStrictError = false;
    try {
      await publishToWordPress(testWebsite.id, normalUser.id, "dep-strict-test");
    } catch (err: any) {
      threwStrictError = true;
      assert(
        err.statusCode === 502,
        "Test 9: publishToWordPress in strict mode throws 502 WP_HOST_UNREACHABLE on network failure",
        err.message
      );
    }
    delete process.env.FORGESTUDIO_WP_STRICT_SYNC;

    if (!threwStrictError) {
      assert(false, "Test 9: Expected publishToWordPress to throw when remote host unreachable");
    }

  } catch (err) {
    console.error("Fatal error in P0 test execution:", err);
    failed++;
  } finally {
    // Cleanup
    try {
      if (testWebsite?.id) {
        await db.wordPressConnection.deleteMany({ where: { websiteId: testWebsite.id } });
        await db.website.delete({ where: { id: testWebsite.id } });
      }
      if (normalUser?.id) await db.user.delete({ where: { id: normalUser.id } });
      if (adminUser?.id) await db.user.delete({ where: { id: adminUser.id } });
    } catch {}
  }

  console.log("\n=================================================");
  console.log(`P0 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

/**
 * Lightweight mock request helper for Express router without extra dependencies
 */
async function requestApp(
  expressApp: any,
  method: string,
  urlPath: string,
  user?: any,
  body?: any
): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const req: any = {
      method,
      url: urlPath,
      headers: {
        "content-type": "application/json",
      },
      cookies: {},
      query: {},
      params: {},
      body: body || {},
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
    };

    let statusCode = 200;
    const res: any = {
      locals: {
        user: user || null,
      },
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        resolve({ status: statusCode, body: data });
        return this;
      },
      send(data: any) {
        resolve({ status: statusCode, body: data });
        return this;
      },
      redirect(url: string) {
        resolve({ status: 302, body: { redirect: url } });
      },
    };

    expressApp.handle(req, res, (err: any) => {
      if (err) {
        resolve({ status: err.statusCode || 500, body: { error: err.message } });
      } else {
        resolve({ status: statusCode, body: null });
      }
    });
  });
}

runCommercialP0Tests();
