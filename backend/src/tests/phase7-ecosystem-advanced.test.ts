import { prisma } from "../config/prisma.js";
import { createWebsite } from "../services/website.service.js";
import { connectWordPress } from "../services/wordpress/connector.service.js";
import {
  bulkVerifyWebsites,
  bulkSyncWebsites,
  bulkDeleteWebsites,
} from "../services/bulkOperations.service.js";
import {
  measureSitePerformance,
  getPerformanceSummary,
} from "../services/sitePerformance.service.js";
import {
  optimizeImage,
  getOptimizationStats,
} from "../services/imageOptimization.service.js";
import {
  getRemoteAdminOverview,
  generateWpAdminSso,
  optimizeRemoteDatabase,
} from "../services/wordpress/wpAdmin.service.js";
import { changeUserPlan } from "../services/subscription.service.js";

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

async function runAdvancedEcosystemTests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO ADVANCED ECOSYSTEM SUITE");
  console.log("Phase 2: F-430, F-431, F-433/434, F-429/432");
  console.log("=================================================\n");

  let testUser: any = null;
  let siteA: any = null;
  let siteB: any = null;

  try {
    // 0. Setup test user
    const userEmail = `ecosystem_tester_${Date.now()}@example.com`;
    testUser = await db.user.create({
      data: {
        email: userEmail,
        passwordHash: "secure_hash",
        fullName: "Ecosystem Test Lead",
        role: "USER",
        optimizationCredits: 250,
      },
    });

    assert(!!testUser.id, "Test User created with 250 default optimization credits");

    // Upgrade test user to Professional plan (allows 10 websites)
    await changeUserPlan(testUser.id, "professional");

    // Create 2 test websites
    siteA = await createWebsite({
      name: "Ecosystem Site Alpha",
      slug: `site-alpha-${Date.now()}`,
      userId: testUser.id,
    });

    siteB = await createWebsite({
      name: "Ecosystem Site Beta",
      slug: `site-beta-${Date.now()}`,
      userId: testUser.id,
    });

    assert(!!siteA.id && !!siteB.id, "Created Site Alpha and Site Beta for multi-site tests");

    // Link Site A to WordPress
    await connectWordPress(
      siteA.id,
      testUser.id,
      "https://my-remote-wp.test",
      "fs_live_secure_api_key_test",
      "Alpha WordPress"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 1: F-430 Bulk Site Management Operations
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [F-430] Testing Bulk Site Operations ---");

    const verifyResults = await bulkVerifyWebsites(testUser.id, [siteA.id, siteB.id]);
    assert(verifyResults.length === 2, "Bulk Verify returned results for both sites");

    const verifiedA = verifyResults.find((r) => r.websiteId === siteA.id);
    const verifiedB = verifyResults.find((r) => r.websiteId === siteB.id);

    assert(verifiedA?.status === "SUCCESS", "Site A with WP connection verified successfully", verifiedA);
    assert(verifiedB?.status === "SKIPPED", "Site B without WP connection gracefully skipped with note", verifiedB);

    const syncResults = await bulkSyncWebsites(testUser.id, [siteA.id, siteB.id]);
    assert(syncResults.length === 2, "Bulk Sync executed for both sites");
    const syncA = syncResults.find((r) => r.websiteId === siteA.id);
    const syncB = syncResults.find((r) => r.websiteId === siteB.id);
    assert(syncA?.status === "SUCCESS", "Site A page sync reported success", syncA);
    assert(syncB?.status === "SKIPPED", "Site B sync skipped due to lack of WP link", syncB);

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 2: F-431 Site Performance Monitoring & TTFB
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [F-431] Testing Site Performance Monitoring ---");

    const auditResult = await measureSitePerformance(siteA.id, testUser.id);
    assert(auditResult.metric.responseTimeMs > 0, "Response time measured > 0ms", auditResult.metric.responseTimeMs);
    assert(auditResult.metric.ttfbMs > 0, "TTFB measured > 0ms", auditResult.metric.ttfbMs);
    assert(auditResult.metric.score >= 20 && auditResult.metric.score <= 100, `Score calculated in valid range: ${auditResult.metric.score}`);
    assert(["EXCELLENT", "GOOD", "NEEDS_IMPROVEMENT", "POOR"].includes(auditResult.rating), `Rating categorized: ${auditResult.rating}`);
    assert(auditResult.webVitals.lcpMs > 0 && auditResult.webVitals.fidMs > 0, "Core Web Vitals (LCP, FID, CLS) estimated properly");

    const perfSummary = await getPerformanceSummary(siteA.id, testUser.id);
    assert(perfSummary.totalAudits >= 1, "Performance summary reflects recorded audit history");
    assert(perfSummary.uptimePercentage >= 90, `Uptime SLA computed: ${perfSummary.uptimePercentage}%`);

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 3: F-433 & F-434 Image Optimization & Credits System
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [F-433 & F-434] Testing Image Optimization & Credits Engine ---");

    // 1x1 Transparent PNG base64 for compression test
    const samplePngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M9QzwAEjAwMDAwAFAAC/wb4n7cAAAAASUVORK5CYII=",
      "base64"
    );

    const optResult = await optimizeImage(siteA.id, testUser.id, {
      imageBuffer: samplePngBuffer,
      fileName: "test-pixel.png",
      originalBytes: 1500,
    });

    assert(optResult.format === "webp", `Asset converted to format: ${optResult.format}`);
    assert(optResult.optimizedBytes > 0, `Optimized buffer length > 0: ${optResult.optimizedBytes} bytes`);
    assert(optResult.remainingCredits === 249, `Credit deducted from 250 to 249: ${optResult.remainingCredits}`);

    const optStats = await getOptimizationStats(siteA.id, testUser.id);
    assert(optStats.totalImagesOptimized >= 1, `Total images optimized tracked: ${optStats.totalImagesOptimized}`);
    assert(optStats.remainingCredits === 249, `Remaining credit balance verified via stats API: ${optStats.remainingCredits}`);

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 4: F-429 & F-432 Remote WP Admin & Database Optimization
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [F-429 & F-432] Testing Remote WP Admin & DB Maintenance ---");

    const overview = await getRemoteAdminOverview(siteA.id, testUser.id);
    assert(overview.connected === true, "Remote WP overview confirms connected state");
    assert(overview.plugins.length >= 1, `Remote plugin inventory retrieved (${overview.plugins.length} plugins found)`);
    assert(overview.database.tablesCount > 0, `Database overview reports ${overview.database.tablesCount} tables`);

    const sso = await generateWpAdminSso(siteA.id, testUser.id);
    assert(sso.ssoUrl.includes("forgestudio_sso="), "Magic 1-Click SSO access token URL generated properly", sso.ssoUrl);
    assert(new Date(sso.expiresAt).getTime() > Date.now(), "SSO expiration is set in the future");

    const dbCleanup = await optimizeRemoteDatabase(siteA.id, testUser.id, {
      cleanRevisions: true,
      cleanTransients: true,
      optimizeTables: true,
      emptyTrash: true,
    });

    assert(dbCleanup.success === true, "Database cleanup reported success");
    assert(dbCleanup.spaceReclaimedMb > 0, `Reclaimed disk space computed: ${dbCleanup.spaceReclaimedMb} MB`);
    assert(dbCleanup.remainingCredits === 248, `DB cleanup deducted 1 optimization credit (249 -> 248): ${dbCleanup.remainingCredits}`);

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 5: Bulk Deletion Test
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [F-430] Testing Bulk Deletion ---");

    const deleteResults = await bulkDeleteWebsites(testUser.id, [siteA.id, siteB.id]);
    assert(deleteResults.length === 2, "Bulk Delete returned entries for both sites");
    assert(deleteResults.every((r) => r.status === "SUCCESS"), "Both sites deleted cleanly");

    // Nullify references so teardown doesn't double-delete
    siteA = null;
    siteB = null;

  } catch (err: any) {
    console.error("[CRITICAL ERROR IN SUITE]", err);
    failed++;
  } finally {
    // Teardown
    console.log("\n--- Cleaning up test artifacts ---");
    if (siteA?.id) {
      try { await db.website.delete({ where: { id: siteA.id } }); } catch {}
    }
    if (siteB?.id) {
      try { await db.website.delete({ where: { id: siteB.id } }); } catch {}
    }
    if (testUser?.id) {
      try { await db.user.delete({ where: { id: testUser.id } }); } catch {}
    }

    console.log(`\n=================================================`);
    console.log(`FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log(`=================================================`);

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  }
}

runAdvancedEcosystemTests();
