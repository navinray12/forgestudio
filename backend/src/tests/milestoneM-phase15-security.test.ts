import { prisma } from "../config/prisma.js";
import { isSafeUrl, validateSafeUrl } from "../utils/ssrf.validator.js";
import { connectWordPress } from "../services/wordpress/connector.service.js";
import { createMediaAsset, getMediaAssetById } from "../services/media.service.js";
import { createWebsite } from "../services/website.service.js";
import { createApiKey, listApiKeys } from "../services/apiKey.service.js";
import { processFormSubmission } from "../services/form/form.service.js";

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

async function runMilestoneMTests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO MILESTONE M VERIFICATION SUITE");
  console.log("Phase 15: Security, Anti-SSRF & Isolation Audit");
  console.log("=================================================\n");

  let tenantA: any = null;
  let tenantB: any = null;
  let siteA: any = null;
  let siteB: any = null;

  try {
    // 0. Setup test users
    tenantA = await db.user.create({
      data: {
        email: `tenant-a-${Date.now()}@example.com`,
        fullName: "Tenant Alpha",
        status: "ACTIVE",
      },
    });

    tenantB = await db.user.create({
      data: {
        email: `tenant-b-${Date.now()}@example.com`,
        fullName: "Tenant Beta",
        status: "ACTIVE",
      },
    });

    siteA = await createWebsite({
      name: "Site Alpha",
      slug: `site-alpha-${Date.now()}`,
      userId: tenantA.id,
    });

    siteB = await createWebsite({
      name: "Site Beta",
      slug: `site-beta-${Date.now()}`,
      userId: tenantB.id,
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Anti-SSRF URL Validator Core
    // ─────────────────────────────────────────────────────────────
    console.log("--- Test 1: Anti-SSRF Validator Core Defense ---");

    const dangerousUrls = [
      "http://127.0.0.1",
      "http://127.0.0.1:8080/admin",
      "http://localhost",
      "http://localhost:3000",
      "http://169.254.169.254/latest/meta-data",
      "http://169.254.169.254",
      "http://10.0.0.1/internal",
      "http://172.16.0.1",
      "http://192.168.1.1/router-login",
      "file:///etc/passwd",
      "ftp://ftp.example.com",
      "gopher://127.0.0.1:70",
      "javascript:alert(1)",
    ];

    let allDangerousBlocked = true;
    for (const url of dangerousUrls) {
      const check = isSafeUrl(url);
      if (check.safe) {
        console.error(`[FAIL] Expected ${url} to be BLOCKED, but was allowed!`);
        allDangerousBlocked = false;
      }
    }
    assert(allDangerousBlocked, "T1.1: Loopback, cloud metadata (169.254.169.254), RFC1918, and non-HTTP protocols are all blocked");

    const validUrls = [
      "https://api.mycompany.com/webhook",
      "https://hooks.slack.com/services/T00/B00/XXXX",
      "https://wordpress.production.org/wp-json",
      "http://public-webhook-consumer.org/endpoint",
    ];

    let allValidAllowed = true;
    for (const url of validUrls) {
      const check = isSafeUrl(url);
      if (!check.safe) {
        console.error(`[FAIL] Expected safe URL ${url} to be allowed, but was blocked!`);
        allValidAllowed = false;
      }
    }
    assert(allValidAllowed, "T1.2: Valid public HTTPS and HTTP endpoints are permitted");

    // validateSafeUrl should throw AppError on dangerous URL
    let threwSafeUrlError = false;
    try {
      validateSafeUrl("http://169.254.169.254/secret");
    } catch (e: any) {
      threwSafeUrlError = true;
    }
    assert(threwSafeUrlError, "T1.3: validateSafeUrl throws AppError on cloud metadata attempt");

    // ─────────────────────────────────────────────────────────────
    // TEST 2: WordPress Connector SSRF Defense
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 2: WordPress Connector SSRF Defense ---");

    let wpSsrfBlocked = false;
    try {
      await connectWordPress(siteA.id, tenantA.id, "http://127.0.0.1:9000", "my_secret_token_12345");
    } catch (err: any) {
      wpSsrfBlocked =
        err.code === "SSRF_VALIDATION_FAILED" ||
        err.message?.includes("failed security validation") ||
        err.message?.includes("private or loopback");
    }
    assert(wpSsrfBlocked, "T2.1: WordPress connection to loopback 127.0.0.1 is rejected with SSRF safety error");

    let wpMetadataBlocked = false;
    try {
      await connectWordPress(siteA.id, tenantA.id, "http://169.254.169.254/meta", "my_secret_token_12345");
    } catch (err: any) {
      wpMetadataBlocked =
        err.code === "SSRF_VALIDATION_FAILED" ||
        err.message?.includes("failed security validation") ||
        err.message?.includes("private or loopback");
    }
    assert(wpMetadataBlocked, "T2.2: WordPress connection to cloud metadata IP is rejected with SSRF safety error");

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Form Webhook SSRF Defense
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 3: Form Webhook SSRF Defense ---");

    // Process a form submission with an unsafe loopback webhook
    const ssrfSubmissionResult = await processFormSubmission({
      websiteId: siteA.id,
      formId: "contact-form-ssrf",
      formName: "Security Audit Form",
      fields: { name: "Alice", email: "alice@example.com" },
      actions: {
        submitActions: ["database", "webhook"],
        webhookConfig: {
          endpointUrl: "http://127.0.0.1:5000/internal-admin",
        },
      },
      metadata: { ip: "203.0.113.195" },
    });

    assert(
      ssrfSubmissionResult.success === true &&
        ssrfSubmissionResult.actionsExecuted?.webhook === false,
      "T3.1: Form submission successfully recorded while unsafe webhook to 127.0.0.1 is safely aborted without dispatching",
      ssrfSubmissionResult
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Media Asset Tenant Isolation
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 4: Media Asset Tenant Isolation ---");

    // Tenant A uploads an asset
    const assetA = await createMediaAsset({
      userId: tenantA.id,
      websiteId: siteA.id,
      filename: "alpha-banner.png",
      originalName: "banner.png",
      mimeType: "image/png",
      sizeBytes: 10240,
      url: "https://storage.forgestudio.io/alpha/banner.png",
      width: 1200,
      height: 630,
      altText: "Alpha Site Banner",
    });

    assert(Boolean(assetA?.id), "T4.1: Tenant A successfully creates media asset");

    // Tenant B attempts to fetch Tenant A's asset with tenant isolation
    let tenantBBlocked = false;
    try {
      await getMediaAssetById(assetA.id, tenantB.id);
    } catch (err: any) {
      tenantBBlocked = err.code === "MEDIA_NOT_FOUND" || err.statusCode === 404;
    }
    assert(
      tenantBBlocked,
      "T4.2: Tenant B cannot access Tenant A's media asset (strictly rejected with 404 MEDIA_NOT_FOUND)"
    );

    // Tenant A can fetch their own asset
    const ownFetchResult = await getMediaAssetById(assetA.id, tenantA.id);
    assert(
      ownFetchResult !== null && ownFetchResult.id === assetA.id,
      "T4.3: Tenant A successfully fetches their own media asset"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 5: API Key Tenant Isolation
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 5: API Key Tenant Isolation ---");

    const keyResA = await createApiKey(tenantA.id, "Alpha API Key", ["websites:read"]);
    const keyResB = await createApiKey(tenantB.id, "Beta API Key", ["websites:read"]);

    const tenantAKeys = await listApiKeys(tenantA.id);
    const tenantBKeys = await listApiKeys(tenantB.id);

    const crossContamination =
      tenantAKeys.some((k: any) => k.id === keyResB.apiKey.id) ||
      tenantBKeys.some((k: any) => k.id === keyResA.apiKey.id);

    assert(
      !crossContamination && tenantAKeys.length >= 1 && tenantBKeys.length >= 1,
      "T5.1: API keys maintain complete tenant isolation (no cross-tenant key leakage)"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Granular Capability Governance
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- Test 6: Granular Capability Governance ---");

    // Verify raw secret is never stored directly
    const storedKeyRecord = await db.developerApiKey.findUnique({
      where: { id: keyResA.apiKey.id },
    });

    assert(
      storedKeyRecord &&
        !storedKeyRecord.tokenHash.startsWith("fsk_") &&
        storedKeyRecord.tokenHash.length === 64, // SHA-256 hex string length
      "T6.1: API keys are securely hashed with SHA-256 (raw secret never persisted to database)"
    );

  } catch (err: any) {
    console.error("Test execution failed with unexpected error:", err);
    failed++;
  } finally {
    // Cleanup test artifacts
    try {
      if (siteA) await db.website.delete({ where: { id: siteA.id } }).catch(() => {});
      if (siteB) await db.website.delete({ where: { id: siteB.id } }).catch(() => {});
      if (tenantA) await db.user.delete({ where: { id: tenantA.id } }).catch(() => {});
      if (tenantB) await db.user.delete({ where: { id: tenantB.id } }).catch(() => {});
    } catch {}
  }

  console.log("\n=================================================");
  console.log(`MILESTONE M RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runMilestoneMTests();
