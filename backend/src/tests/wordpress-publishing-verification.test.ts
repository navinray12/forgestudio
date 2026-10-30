import { prisma } from "../config/prisma.js";
import { publishWebsite, getWebsiteDeployments, verifyDeployment } from "../services/publishing.service.js";
import { createWebsite } from "../services/website.service.js";
import { WordPressPublisher, setWordPressHttpRequester, WordPressHttpRequester } from "../services/destinations/wordpress.publisher.js";
import { destinationRegistry } from "../services/destinations/registry.js";

const db = prisma as any;

function assert(condition: any, testName: string, detail?: string) {
  if (Boolean(condition)) {
    console.log(`[PASS] ${testName}`);
    return true;
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ""}`);
    return false;
  }
}

// Mock WordPress HTTP responder
function createMockWpRequester(options: {
  apiStatus?: number;
  apiSuccess?: boolean;
  pageStatus?: number;
  postStatusField?: string;
  publicUrlStatus?: number;
  publicUrlHtml?: string;
  timeoutOnApi?: boolean;
} = {}): WordPressHttpRequester {
  return async (url: string, reqOpts: any) => {
    if (options.timeoutOnApi && url.includes("/wp-json/forgestudio/v1/verify")) {
      const err = new Error("Connection timed out after 5000ms");
      (err as any).code = "ETIMEDOUT";
      throw err;
    }

    // 1. API verify endpoint
    if (url.includes("/wp-json/forgestudio/v1/verify")) {
      const status = options.apiStatus !== undefined ? options.apiStatus : 200;
      return {
        status,
        ok: status >= 200 && status < 300,
        json: async () => ({
          success: options.apiSuccess !== undefined ? options.apiSuccess : status === 200,
          data: {
            wordpressVersion: "6.7.1",
            pluginVersion: "1.2.0",
            siteTitle: "Mock WordPress Site",
          },
        }),
        text: async () => JSON.stringify({ success: true }),
      };
    }

    // 2. Content page endpoint
    if (url.includes("/wp-json/forgestudio/v1/pages/")) {
      const status = options.pageStatus !== undefined ? options.pageStatus : 200;
      return {
        status,
        ok: status >= 200 && status < 300,
        json: async () => ({
          success: status === 200,
          data: {
            id: 1001,
            title: "Home Page",
            slug: "home",
            status: options.postStatusField || "publish",
          },
        }),
        text: async () => JSON.stringify({ status }),
      };
    }

    // 3. Public site URL endpoint
    const pubStatus = options.publicUrlStatus !== undefined ? options.publicUrlStatus : 200;
    const pubHtml = options.publicUrlHtml !== undefined
      ? options.publicUrlHtml
      : "<!DOCTYPE html><html lang='en'><head><title>WordPress Site</title></head><body><h1>Hello from WordPress</h1></body></html>";

    return {
      status: pubStatus,
      ok: pubStatus >= 200 && pubStatus < 300,
      json: async () => ({}),
      text: async () => pubHtml,
    };
  };
}

async function runWordPressVerificationTests() {
  console.log("=== Starting Feature 15 — WordPress Publishing Verification Test Suite ===\n");

  let passed = 0;
  let failed = 0;

  const testUser = await db.user.create({
    data: {
      email: `wp-verify-test-${Date.now()}@forgestudio.local`,
      fullName: "WP Verify Tester",
      status: "ACTIVE",
      role: "ADMIN",
    },
  });

  const otherUser = await db.user.create({
    data: {
      email: `wp-unauth-${Date.now()}@forgestudio.local`,
      fullName: "Unauth User",
      status: "ACTIVE",
      role: "USER",
    },
  });

  const website = await createWebsite({
    name: "WP Verification Test Website",
    slug: `wp-verify-test-${Date.now()}`,
    userId: testUser.id,
    editorData: {
      version: 1,
      homePageId: "home",
      pages: [
        {
          id: "home",
          name: "Home Page",
          title: "Home Page",
          slug: "/",
          isHome: true,
          elements: [
            {
              id: "h1",
              type: "heading",
              content: "Welcome to WordPress Site",
              styles: { color: "#111827", fontSize: "32px" },
            },
          ],
        },
      ],
      elements: [
        {
          id: "h1",
          type: "heading",
          content: "Welcome to WordPress Site",
        },
      ],
    },
  });

  // Create an active WordPress connection for this website
  const wpConnection = await db.wordPressConnection.create({
    data: {
      website: { connect: { id: website.id } },
      user: { connect: { id: testUser.id } },
      siteUrl: "https://example-wp-site.com",
      wpSiteName: "Example WP Site",
      apiKeyHash: "wp_secret_hash_token_abc123xyz999",
      pluginVersion: "1.2.0",
      status: "CONNECTED",
      capabilities: {
        canPublishPages: true,
        canUploadMedia: true,
        supportsGutenberg: true,
      },
    },
  });

  const publisher = new WordPressPublisher();

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Destination Publisher Interface & Registration
    // -------------------------------------------------------------------------
    console.log("--- Test Group 1: Architecture & Interface Registration ---");
    const registered = destinationRegistry.getPublisher("WORDPRESS");
    if (assert(registered !== undefined && registered.destinationType === "WORDPRESS", "WordPressPublisher is registered with destinationType 'WORDPRESS'")) passed++; else failed++;
    if (assert(typeof publisher.verify === "function", "WordPressPublisher implements verify method")) passed++; else failed++;

    // -------------------------------------------------------------------------
    // TEST 2: Website & Deployment Validation
    // -------------------------------------------------------------------------
    console.log("\n--- Test Group 2: Existence & Ownership Validation ---");

    // 2a. Non-existent website
    const resBadSite = await publisher.verify("non-existent-site-id-9999", "deploy-123");
    if (assert(!resBadSite.verified && resBadSite.statusCode === 404, "Verify fails with 404 for non-existent website")) passed++; else failed++;

    // 2b. Unauthorized user
    const resForbidden = await publisher.verify(website.id, "deploy-123", { userId: otherUser.id });
    if (assert(!resForbidden.verified && resForbidden.statusCode === 403, "Verify fails with 403 for unauthorized user")) passed++; else failed++;

    // 2c. Non-existent deployment
    const resBadDeploy = await publisher.verify(website.id, "non-existent-deployment-id-9999", { userId: testUser.id });
    if (assert(!resBadDeploy.verified && resBadDeploy.statusCode === 404, "Verify fails with 404 for non-existent deployment")) passed++; else failed++;

    // Create a real deployment for testing
    const testDeployment = await db.deployment.create({
      data: {
        websiteId: website.id,
        version: 1,
        status: "BUILDING",
        destinationType: "WORDPRESS",
        destinationRef: "https://example-wp-site.com/home",
        metadata: {
          siteUrl: "https://example-wp-site.com",
          primaryPageUrl: "https://example-wp-site.com/home",
          pageMappings: [
            { forgePageId: "home", wpPostId: 1001, wpPostSlug: "home", wpPostUrl: "https://example-wp-site.com/home" }
          ],
        },
      },
    });

    // 2d. Destination type mismatch
    const sftpDeployment = await db.deployment.create({
      data: {
        websiteId: website.id,
        version: 2,
        status: "BUILDING",
        destinationType: "SFTP",
      },
    });
    const resTypeMismatch = await publisher.verify(website.id, sftpDeployment.id, { userId: testUser.id });
    if (assert(!resTypeMismatch.verified && resTypeMismatch.statusCode === 400, "Verify fails with 400 on deployment destinationType mismatch")) passed++; else failed++;

    // 2e. Version mismatch
    const resVersionMismatch = await publisher.verify(website.id, testDeployment.id, { userId: testUser.id, version: 99 });
    if (assert(!resVersionMismatch.verified && resVersionMismatch.statusCode === 409, "Verify fails with 409 on version mismatch")) passed++; else failed++;

    // 2f. Rolled-back deployment
    const rolledBackDeploy = await db.deployment.create({
      data: {
        websiteId: website.id,
        version: 3,
        status: "ROLLED_BACK",
        destinationType: "WORDPRESS",
      },
    });
    const resRolledBack = await publisher.verify(website.id, rolledBackDeploy.id, { userId: testUser.id });
    if (assert(!resRolledBack.verified && resRolledBack.statusCode === 409, "Verify fails with 409 for ROLLED_BACK deployment")) passed++; else failed++;

    // 2g. Build failed deployment
    const buildFailedDeploy = await db.deployment.create({
      data: {
        websiteId: website.id,
        version: 4,
        status: "BUILD_FAILED",
        destinationType: "WORDPRESS",
      },
    });
    const resBuildFailed = await publisher.verify(website.id, buildFailedDeploy.id, { userId: testUser.id });
    if (assert(!resBuildFailed.verified && resBuildFailed.statusCode === 422, "Verify fails with 422 for BUILD_FAILED deployment")) passed++; else failed++;

    // -------------------------------------------------------------------------
    // TEST 3: WordPress Connection & URL / SSRF Validation
    // -------------------------------------------------------------------------
    console.log("\n--- Test Group 3: WordPress Connection & URL Validation ---");

    // Temporarily disconnect WordPress connection
    await db.wordPressConnection.update({
      where: { id: wpConnection.id },
      data: { status: "DISCONNECTED" },
    });
    const resDisconnected = await publisher.verify(website.id, testDeployment.id, { userId: testUser.id });
    if (assert(!resDisconnected.verified && resDisconnected.statusCode === 404, "Verify fails with 404 when WordPress connection is DISCONNECTED")) passed++; else failed++;

    // Restore connection
    await db.wordPressConnection.update({
      where: { id: wpConnection.id },
      data: { status: "CONNECTED" },
    });

    // -------------------------------------------------------------------------
    // TEST 4: Tier 1 REST API Verification Failures
    // -------------------------------------------------------------------------
    console.log("\n--- Test Group 4: Tier 1 REST API Verification Failures ---");

    // 4a. API 401 Unauthorized
    setWordPressHttpRequester(createMockWpRequester({ apiStatus: 401 }));
    const resApi401 = await publisher.verify(website.id, testDeployment.id, { userId: testUser.id });
    if (assert(!resApi401.verified && resApi401.statusCode === 401, "Tier 1: Verify returns 401 on WordPress API authentication failure")) passed++; else failed++;
    const deployAfter401 = await db.deployment.findUnique({ where: { id: testDeployment.id } });
    if (assert(deployAfter401.status === "VERIFICATION_FAILED", "Deployment status updated to VERIFICATION_FAILED on Tier 1 failure")) passed++; else failed++;

    // 4b. API 504 Timeout
    setWordPressHttpRequester(createMockWpRequester({ timeoutOnApi: true }));
    const resApiTimeout = await publisher.verify(website.id, testDeployment.id, { userId: testUser.id });
    if (assert(!resApiTimeout.verified && resApiTimeout.statusCode === 504, "Tier 1: Verify returns 504 on WordPress API timeout")) passed++; else failed++;

    // 4c. Configuration-only verification (without deploymentId)
    setWordPressHttpRequester(createMockWpRequester({ apiStatus: 200 }));
    const resConfigOnly = await publisher.verify(website.id, "", { userId: testUser.id });
    if (assert(resConfigOnly.verified && resConfigOnly.details?.status === "CONFIG_VERIFIED", "Configuration-only verification returns verified without deployment record")) passed++; else failed++;

    // -------------------------------------------------------------------------
    // TEST 5: Tier 2 Content Verification Failures
    // -------------------------------------------------------------------------
    console.log("\n--- Test Group 5: Tier 2 Content Verification Failures ---");

    // 5a. Remote page 404 missing
    setWordPressHttpRequester(createMockWpRequester({ apiStatus: 200, pageStatus: 404 }));
    const resPage404 = await publisher.verify(website.id, testDeployment.id, { userId: testUser.id });
    if (assert(!resPage404.verified && resPage404.statusCode === 422, "Tier 2: Verify returns 422 when remote mapped post is missing (404)")) passed++; else failed++;

    // 5b. Remote page status not 'publish' (e.g. 'draft')
    setWordPressHttpRequester(createMockWpRequester({ apiStatus: 200, pageStatus: 200, postStatusField: "draft" }));
    const resPostDraft = await publisher.verify(website.id, testDeployment.id, { userId: testUser.id });
    if (assert(!resPostDraft.verified && resPostDraft.statusCode === 422, "Tier 2: Verify returns 422 when remote mapped post status is 'draft'")) passed++; else failed++;

    // -------------------------------------------------------------------------
    // TEST 6: Tier 3 Public URL Verification Failures
    // -------------------------------------------------------------------------
    console.log("\n--- Test Group 6: Tier 3 Public URL Verification Failures ---");

    // 6a. Public URL 404
    setWordPressHttpRequester(createMockWpRequester({ apiStatus: 200, pageStatus: 200, publicUrlStatus: 404 }));
    const resPub404 = await publisher.verify(website.id, testDeployment.id, { userId: testUser.id });
    if (assert(!resPub404.verified && resPub404.statusCode === 404, "Tier 3: Verify returns 404 when public URL is not found")) passed++; else failed++;

    // 6b. Public URL returns non-HTML
    setWordPressHttpRequester(createMockWpRequester({ apiStatus: 200, pageStatus: 200, publicUrlStatus: 200, publicUrlHtml: "Raw text without HTML tags" }));
    const resPubNonHtml = await publisher.verify(website.id, testDeployment.id, { userId: testUser.id });
    if (assert(!resPubNonHtml.verified && resPubNonHtml.statusCode === 422, "Tier 3: Verify returns 422 when public URL lacks valid HTML structure")) passed++; else failed++;

    // -------------------------------------------------------------------------
    // TEST 7: Full 3-Tier Verification Success
    // -------------------------------------------------------------------------
    console.log("\n--- Test Group 7: Full 3-Tier Verification Success ---");
    setWordPressHttpRequester(createMockWpRequester({
      apiStatus: 200,
      pageStatus: 200,
      postStatusField: "publish",
      publicUrlStatus: 200,
      publicUrlHtml: "<!DOCTYPE html><html><head><title>Verified Site</title></head><body><h1>Content</h1></body></html>",
    }));

    const resSuccess = await publisher.verify(website.id, testDeployment.id, { userId: testUser.id });
    if (assert(resSuccess.verified && resSuccess.statusCode === 200, "Full 3-tier verify returns verified: true with HTTP 200")) passed++; else failed++;
    if (assert(resSuccess.details?.apiVerification?.verified === true, "Details include successful Tier 1 apiVerification")) passed++; else failed++;
    if (assert(resSuccess.details?.contentVerification?.verified === true, "Details include successful Tier 2 contentVerification")) passed++; else failed++;
    if (assert(resSuccess.details?.publicUrlVerification?.verified === true, "Details include successful Tier 3 publicUrlVerification")) passed++; else failed++;

    const deployAfterSuccess = await db.deployment.findUnique({ where: { id: testDeployment.id } });
    if (assert(deployAfterSuccess.status === "PUBLISHED", "Deployment status in DB updated to PUBLISHED")) passed++; else failed++;
    if (assert(Boolean(deployAfterSuccess.metadata?.verificationDetails), "Deployment metadata persists verification details")) passed++; else failed++;

    // -------------------------------------------------------------------------
    // TEST 8: Repeated Verification & Idempotency
    // -------------------------------------------------------------------------
    console.log("\n--- Test Group 8: Repeated Verification & Idempotency ---");
    const countBefore = await db.deployment.count({ where: { websiteId: website.id } });
    const repeatRes = await verifyDeployment(website.id, testDeployment.id, testUser.id);
    const countAfter = await db.deployment.count({ where: { websiteId: website.id } });

    if (assert(repeatRes.verified === true, "Repeated verifyDeployment succeeds")) passed++; else failed++;
    const deployAfterRepeat = await db.deployment.findUnique({ where: { id: testDeployment.id } });
    if (assert(deployAfterRepeat?.version === testDeployment.version, "Repeated verification preserved existing monotonic version")) passed++; else failed++;

    // -------------------------------------------------------------------------
    // TEST 9: Secret Sanitization
    // -------------------------------------------------------------------------
    console.log("\n--- Test Group 9: Secret Sanitization in Errors & Logs ---");
    // Ensure apiKeyHash is never present in verification details or error outputs
    const resString = JSON.stringify(resSuccess);
    if (assert(!resString.includes("wp_secret_hash_token_abc123xyz999"), "Secrets and API key hashes are not leaked in verification results")) passed++; else failed++;

  } finally {
    // Cleanup mock requester
    setWordPressHttpRequester(null);

    // Cleanup test data
    await db.deployment.deleteMany({ where: { websiteId: website.id } });
    await db.wordPressPageMapping.deleteMany({ where: { websiteId: website.id } });
    await db.wordPressConnection.deleteMany({ where: { websiteId: website.id } });
    await db.website.delete({ where: { id: website.id } }).catch(() => {});
    await db.user.delete({ where: { id: testUser.id } }).catch(() => {});
    await db.user.delete({ where: { id: otherUser.id } }).catch(() => {});
  }

  console.log(`\n==================================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runWordPressVerificationTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
