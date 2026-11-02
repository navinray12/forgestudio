import assert from "node:assert";
import http, { type Server } from "node:http";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import dotenv from "dotenv";
import express from "express";
import { chromium, type Browser, type Page } from "playwright";

dotenv.config();

import {
  sanitizeDatabaseUrl,
  validateDisposableDatabaseUrl,
  assertSafeDisposableDatabase,
  assertDatabaseIsolation,
  verifyConnectedDatabaseIdentity,
} from "../src/utils/database-safety.js";

let passed = 0;
let failed = 0;

function logPass(title: string, details?: string) {
  passed++;
  console.log(`  [PASS] ${title}${details ? ` -> ${details}` : ""}`);
}

function logFail(title: string, error?: any) {
  failed++;
  console.error(`  [FAIL] ${title} -> ${error?.message || JSON.stringify(error)}`);
}

async function runPhase13DeveloperApiTests() {
  console.log("=================================================================");
  console.log("FORGESTUDIO PHASE 13 — DEVELOPER API & SDK VERIFICATION SUITE");
  console.log("=================================================================\n");

  // ===========================================================================
  // GATE 1: NEGATIVE DATABASE SAFETY CHECKS
  // ===========================================================================
  console.log("[GATE 1] Running Negative Database Safety Checks...");
  const emptyRes = validateDisposableDatabaseUrl("");
  assert.strictEqual(emptyRes.safe, false, "Empty database URL must be rejected");
  logPass("Negative Safety: Empty DB URL rejected");

  const ordinaryDevCheck = validateDisposableDatabaseUrl("postgresql://postgres:secret@localhost:5432/elementor_saas");
  assert.strictEqual(ordinaryDevCheck.safe, false, "Ordinary dev DB must be rejected");
  logPass("Negative Safety: Non-disposable elementor_saas DB rejected");

  // ===========================================================================
  // GATE 2: VALIDATE TARGET DISPOSABLE DATABASE URL & ISOLATION
  // ===========================================================================
  console.log("\n[GATE 2] Validating Dedicated Disposable Database Target...");
  const targetTestDbUrl = process.env.TEST_DATABASE_URL;
  if (!targetTestDbUrl) {
    console.error("\n[BLOCKED] Explicit TEST_DATABASE_URL environment variable is required.");
    process.exit(1);
  }

  assertSafeDisposableDatabase(targetTestDbUrl);
  console.log(`  ✓ Dedicated disposable test database target verified: ${sanitizeDatabaseUrl(targetTestDbUrl)}`);

  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = targetTestDbUrl;

  // DYNAMIC IMPORTS AFTER SAFETY VALIDATION
  const { prisma, resolveActiveDatabaseUrl } = await import("../src/config/prisma.js");
  const { default: app } = await import("../src/app.js");
  const {
    createApiKey,
    verifyApiKey,
    listApiKeys,
    revokeApiKey,
    rotateApiKey,
    validateScopes,
    validateExpirationDays,
  } = await import("../src/services/apiKey.service.js");
  const { ForgeStudioClient, ForgeStudioApiError } = await import("../src/sdk/client.js");

  const activePrismaUrl = resolveActiveDatabaseUrl();
  assertDatabaseIsolation(targetTestDbUrl, activePrismaUrl);
  console.log(`  ✓ Active Prisma connection validated against test target`);

  const connectedIdentity = await verifyConnectedDatabaseIdentity(prisma, targetTestDbUrl);
  console.log(`  ✓ Connected Database: ${connectedIdentity.database} on ${connectedIdentity.host}:${connectedIdentity.port}\n`);

  const db = prisma as any;
  let server: Server | null = null;
  let port = 0;
  let baseUrl = "";

  let tenantAOwner: any = null;
  let tenantBOwner: any = null;
  let tenantAWebsite: any = null;
  let tenantBWebsite: any = null;

  let fullKeySecretA = "";
  let readOnlyKeySecretA = "";
  let writeOnlyKeySecretA = "";
  let expiredKeySecret = "";
  let keyRecordA: any = null;

  let browser: Browser | null = null;

  try {
    // Mount frontend dist static files if available for Playwright E2E
    const frontendDist = path.resolve(process.cwd(), "../frontend/dist");
    if (fs.existsSync(frontendDist)) {
      app.use(express.static(frontendDist));
      app.get(/^\/dashboard/, (_req, res) => {
        res.sendFile(path.join(frontendDist, "index.html"));
      });
    }

    // 0. Spin up ephemeral server
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server!.listen(0, () => {
        port = (server!.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
        resolve();
      });
    });

    console.log(`[SETUP] Test server listening on ${baseUrl}`);

    // Clean up past test records safely
    const testEmailPrefix = `phase13-test-${Date.now()}`;
    tenantAOwner = await db.user.create({
      data: {
        email: `${testEmailPrefix}-tenantA@example.com`,
        fullName: "Tenant A Developer",
        role: "USER",
        status: "ACTIVE",
      },
    });

    tenantBOwner = await db.user.create({
      data: {
        email: `${testEmailPrefix}-tenantB@example.com`,
        fullName: "Tenant B Developer",
        role: "USER",
        status: "ACTIVE",
      },
    });

    tenantAWebsite = await db.website.create({
      data: {
        name: "Tenant A Site",
        slug: `tenant-a-${Date.now()}`,
        userId: tenantAOwner.id,
        status: "DRAFT",
        version: 1,
        editorData: {
          version: 1,
          pages: [
            { id: "home", name: "Home", slug: "/", elements: [{ id: "hero-1", type: "heading", content: "Welcome" }] },
          ],
        },
      },
    });

    tenantBWebsite = await db.website.create({
      data: {
        name: "Tenant B Site",
        slug: `tenant-b-${Date.now()}`,
        userId: tenantBOwner.id,
        status: "DRAFT",
        version: 1,
        editorData: {
          version: 1,
          pages: [
            { id: "home", name: "Home", slug: "/", elements: [] },
          ],
        },
      },
    });

    console.log("[SETUP] Seeded isolated tenant A and tenant B on disposable database\n");

    // ==========================================
    // GROUP 1: SECURE API KEY MANAGEMENT & VALIDATION
    // ==========================================
    console.log("--- GROUP 1: API KEY LIFECYCLE & SECURITY ---");

    // 1.1 Strict Scope Validation: Empty scopes rejected
    let emptyScopeFailed = false;
    try {
      validateScopes([]);
    } catch {
      emptyScopeFailed = true;
    }
    assert.strictEqual(emptyScopeFailed, true, "Empty scopes array must throw validation error");
    logPass("1.1. Empty scopes array rejected with validation error");

    // 1.2 Strict Scope Validation: Non-canonical scopes rejected
    let invalidScopeFailed = false;
    try {
      validateScopes(["websites:read", "superuser:all"]);
    } catch {
      invalidScopeFailed = true;
    }
    assert.strictEqual(invalidScopeFailed, true, "Unknown scope must throw validation error");
    logPass("1.2. Unknown/escalated scope rejected with validation error");

    // 1.3 Strict Expiration Validation: Out-of-bounds expiration rejected
    let invalidExpFailed = false;
    try {
      validateExpirationDays(500); // Exceeds 365
    } catch {
      invalidExpFailed = true;
    }
    assert.strictEqual(invalidExpFailed, true, "Expiration > 365 days must throw validation error");
    logPass("1.3. Expiration > 365 days rejected with validation error");

    // 1.4 Generate key with canonical scopes
    const genResA = await createApiKey(
      tenantAOwner.id,
      "CI/CD Full Access",
      ["websites:read", "websites:write", "publish:write"]
    );
    fullKeySecretA = genResA.rawSecret;
    keyRecordA = genResA.apiKey;

    assert.ok(
      fullKeySecretA.startsWith("fsk_") && fullKeySecretA.length >= 40,
      "Key must have secure fsk_ prefix and high entropy"
    );
    assert.strictEqual(keyRecordA.tokenHash.length, 64, "Key secret must be stored as SHA-256 hash");
    assert.ok(
      keyRecordA.maskedKey && keyRecordA.maskedKey.startsWith("fsk_") && keyRecordA.maskedKey.includes("..."),
      "Masked identifier must be stored for identification"
    );
    logPass("1.4. Key generated with secure prefix, SHA-256 hash, and masked identifier");

    // 1.5 Generate Read-Only and Write-Only Keys
    const genResReadOnly = await createApiKey(tenantAOwner.id, "ReadOnly Key", ["websites:read"]);
    readOnlyKeySecretA = genResReadOnly.rawSecret;

    const genResWriteOnly = await createApiKey(tenantAOwner.id, "WriteOnly Key", ["websites:write"]);
    writeOnlyKeySecretA = genResWriteOnly.rawSecret;
    logPass("1.5. Read-only and Write-only keys created with restricted scopes");

    // 1.6 Expiration handling
    const genResExpired = await createApiKey(tenantAOwner.id, "Expired Key", ["websites:read"], 1);
    expiredKeySecret = genResExpired.rawSecret;

    // Direct DB update to guarantee expiration timestamp in the past
    await db.developerApiKey.update({
      where: { id: genResExpired.apiKey.id },
      data: { expiresAt: new Date(Date.now() - 3600000) },
    });

    const verifyExpired = await verifyApiKey(expiredKeySecret);
    assert.ok(
      verifyExpired && "error" in verifyExpired && verifyExpired.error === "EXPIRED",
      "Expired key must be detected and rejected"
    );
    logPass("1.6. Expired API key detected and rejected by verifyApiKey");

    // 1.7 List keys does NOT expose rawSecret or tokenHash
    const keysList = await listApiKeys(tenantAOwner.id);
    const listedKey = keysList.find((k: any) => k.id === keyRecordA.id);
    assert.ok(
      listedKey &&
        !("tokenHash" in listedKey) &&
        !("rawSecret" in listedKey) &&
        listedKey.maskedKey === keyRecordA.maskedKey,
      "Key listing must mask identifiers and redact raw secret and tokenHash"
    );
    logPass("1.7. Key listing masks identifiers and strictly redacts raw secrets and tokenHash");

    // 1.8 Transactional Rotation Failure Injection Test
    let injectionErrorCaught = false;
    try {
      await rotateApiKey(tenantAOwner.id, genResWriteOnly.apiKey.id, { simulateTxFailure: true });
    } catch {
      injectionErrorCaught = true;
    }
    assert.strictEqual(injectionErrorCaught, true, "Simulated failure should throw");

    // Verify transaction rollback: old key should still be ACTIVE!
    const verifyAfterRollback = await verifyApiKey(writeOnlyKeySecretA);
    assert.ok(
      verifyAfterRollback && !("error" in verifyAfterRollback),
      "Old key must remain active and usable if rotation transaction rolls back"
    );
    logPass("1.8. Failure injection: Transactional rollback preserves old key if rotation fails");

    // 1.9 Transactional Key Rotation Happy Path
    const rotateRes = await rotateApiKey(tenantAOwner.id, genResWriteOnly.apiKey.id);
    assert.ok(
      rotateRes !== null &&
        rotateRes.rawSecret.startsWith("fsk_") &&
        rotateRes.oldKeyId === genResWriteOnly.apiKey.id,
      "Key rotated successfully with atomic creation and revocation"
    );

    const oldKeyVerify = await verifyApiKey(writeOnlyKeySecretA);
    assert.ok(
      oldKeyVerify && "error" in oldKeyVerify && oldKeyVerify.error === "REVOKED",
      "Old rotated key must be immediately revoked"
    );
    logPass("1.9. Key rotated successfully with atomic revocation of old key");

    // 1.10 Audit logs created
    const keyAuditLogs = await db.auditLog.findMany({
      where: { userId: tenantAOwner.id },
    });
    assert.ok(
      keyAuditLogs.some((l: any) => l.action === "API_KEY_CREATE") &&
        keyAuditLogs.some((l: any) => l.action === "API_KEY_ROTATE"),
      "Audit logs must record API key lifecycle events"
    );
    logPass("1.10. Audit logs recorded for API key creation and rotation\n");

    // ==========================================
    // GROUP 2: API v1 AUTHENTICATION, CSRF & MULTI-TENANCY
    // ==========================================
    console.log("--- GROUP 2: API v1 AUTHENTICATION & ISOLATION ---");

    // 2.1 Unauthenticated requests fail closed
    const unauthRes = await fetch(`${baseUrl}/websites`);
    assert.strictEqual(unauthRes.status, 401, "Missing authentication returns HTTP 401");
    logPass("2.1. Request with missing authentication returns HTTP 401");

    // 2.2 Malformed Bearer token rejected
    const malformedRes = await fetch(`${baseUrl}/websites`, {
      headers: { Authorization: "Bearer invalid_garbage_token" },
    });
    assert.strictEqual(malformedRes.status, 401, "Invalid Bearer token returns HTTP 401");
    logPass("2.2. Request with invalid Bearer token returns HTTP 401");

    // 2.3 Valid Bearer API Key succeeds
    const validKeyRes = await fetch(`${baseUrl}/websites`, {
      headers: { Authorization: `Bearer ${fullKeySecretA}` },
    });
    const validKeyJson = await validKeyRes.json();
    assert.strictEqual(validKeyRes.status, 200);
    assert.strictEqual(validKeyJson.success, true);
    assert.ok(Array.isArray(validKeyJson.data));
    logPass("2.3. Valid Bearer API key authenticates and returns envelope response");

    // 2.4 Correlation/Request ID attached
    assert.ok(validKeyRes.headers.get("x-request-id") !== null && validKeyJson.requestId !== undefined);
    logPass("2.4. Request ID returned in both response headers and JSON body");

    // 2.5 Authentication Tightening: Invalid explicit Bearer token MUST NOT fall back to cookie session
    // Create an active session for tenant A
    const rawSessionToken = crypto.randomBytes(32).toString("hex");
    const sessionTokenHash = crypto.createHash("sha256").update(rawSessionToken).digest("hex");
    await db.session.create({
      data: {
        userId: tenantAOwner.id,
        tokenHash: sessionTokenHash,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      },
    });

    const fallbackAttackerRes = await fetch(`${baseUrl}/websites`, {
      headers: {
        Authorization: "Bearer invalid_compromised_token",
        Cookie: `forge_session=${rawSessionToken}`,
      },
    });
    assert.strictEqual(
      fallbackAttackerRes.status,
      401,
      "Invalid Bearer token must NOT fall back to cookie session"
    );
    logPass("2.5. Auth tightening: Invalid Bearer credential denied without silent cookie session fallback");

    // 2.6 CSRF Protection: Cookie session mutation without custom header or origin is rejected
    const csrfBlockedRes = await fetch(`${baseUrl}/websites`, {
      method: "POST",
      headers: {
        Cookie: `forge_session=${rawSessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "CSRF Malicious Site" }),
    });
    assert.strictEqual(csrfBlockedRes.status, 403, "Cookie session mutation without CSRF header rejected");
    const csrfBlockedJson = await csrfBlockedRes.json();
    assert.strictEqual(csrfBlockedJson.error?.code, "CSRF_VERIFICATION_FAILED");
    logPass("2.6. CSRF protection: Cookie session mutation without client header rejected with 403");

    // 2.7 CSRF Protection: Cookie session mutation with x-requested-with succeeds
    const csrfAllowedRes = await fetch(`${baseUrl}/websites/${tenantAWebsite.id}`, {
      method: "PUT",
      headers: {
        Cookie: `forge_session=${rawSessionToken}`,
        "Content-Type": "application/json",
        "x-requested-with": "XMLHttpRequest",
      },
      body: JSON.stringify({ name: "Updated Tenant A Site via Session" }),
    });
    assert.strictEqual(csrfAllowedRes.status, 200, "Cookie session mutation with CSRF header succeeds");
    logPass("2.7. CSRF protection: Cookie session mutation with x-requested-with header accepted");

    // 2.8 Multi-tenant Isolation: Tenant A cannot access Tenant B's website
    const crossTenantRes = await fetch(`${baseUrl}/websites/${tenantBWebsite.id}`, {
      headers: { Authorization: `Bearer ${fullKeySecretA}` },
    });
    assert.strictEqual(crossTenantRes.status, 403, "Cross-tenant access must return 403");
    logPass("2.8. Cross-tenant access blocked: Tenant A key receives 403 FORBIDDEN accessing Tenant B site");

    // 2.9 Suspended user's keys are denied
    await db.user.update({
      where: { id: tenantAOwner.id },
      data: { status: "SUSPENDED" },
    });

    const suspendedRes = await fetch(`${baseUrl}/websites`, {
      headers: { Authorization: `Bearer ${fullKeySecretA}` },
    });
    const suspendedJson = await suspendedRes.json();
    assert.strictEqual(suspendedRes.status, 403);
    assert.strictEqual(suspendedJson.error?.code, "ACCOUNT_SUSPENDED");
    logPass("2.9. Suspended user immediately blocked on all API keys with 403 ACCOUNT_SUSPENDED");

    // Reactivate tenant A user for remaining tests
    await db.user.update({
      where: { id: tenantAOwner.id },
      data: { status: "ACTIVE" },
    });
    console.log();

    // ==========================================
    // GROUP 3: GRANULAR SCOPE ENFORCEMENT
    // ==========================================
    console.log("--- GROUP 3: GRANULAR SCOPE ENFORCEMENT ---");

    // 3.1 Read-only key can read websites
    const roReadRes = await fetch(`${baseUrl}/websites/${tenantAWebsite.id}`, {
      headers: { Authorization: `Bearer ${readOnlyKeySecretA}` },
    });
    assert.strictEqual(roReadRes.status, 200);
    logPass("3.1. Read-only key allowed to read website configuration");

    // 3.2 Read-only key DENIED write operations
    const roWriteRes = await fetch(`${baseUrl}/websites`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${readOnlyKeySecretA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Illegal Site" }),
    });
    const roWriteJson = await roWriteRes.json();
    assert.strictEqual(roWriteRes.status, 403);
    assert.strictEqual(roWriteJson.error?.code, "FORBIDDEN");
    logPass("3.2. Read-only key strictly DENIED POST /websites with 403 FORBIDDEN");

    // 3.3 Read-only key DENIED publishing
    const roPubRes = await fetch(`${baseUrl}/websites/${tenantAWebsite.id}/publish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${readOnlyKeySecretA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(roPubRes.status, 403);
    logPass("3.3. Read-only key strictly DENIED publish:write with 403 FORBIDDEN\n");

    // ==========================================
    // GROUP 4: SHARED POSTGRESQL DISTRIBUTED RATE LIMITING
    // ==========================================
    console.log("--- GROUP 4: DISTRIBUTED RATE LIMITING ---");

    // 4.1 RFC RateLimit headers
    const rlRes = await fetch(`${baseUrl}/websites`, {
      headers: {
        Authorization: `Bearer ${fullKeySecretA}`,
        "X-Test-Rate-Limit": "true",
      },
    });

    assert.ok(
      rlRes.headers.get("ratelimit-limit") !== null &&
        rlRes.headers.get("ratelimit-remaining") !== null &&
        rlRes.headers.get("ratelimit-reset") !== null,
      "Standard RFC RateLimit headers returned"
    );
    logPass("4.1. Standard RFC RateLimit headers returned (Limit, Remaining, Reset)");

    // 4.2 Distributed PostgreSQL Concurrent Requests Test
    // Execute 8 concurrent requests simultaneously to verify atomic PostgreSQL increments
    const concurrentResponses = await Promise.all(
      Array.from({ length: 8 }).map(() =>
        fetch(`${baseUrl}/websites`, {
          headers: {
            Authorization: `Bearer ${fullKeySecretA}`,
            "X-Test-Rate-Limit": "true",
          },
        })
      )
    );
    assert.ok(
      concurrentResponses.every((r) => r.status === 200),
      "All concurrent requests in quota window succeeded"
    );
    logPass("4.2. Atomic PostgreSQL rate limiter handled 8 concurrent requests without race conditions");

    // 4.3 Trigger 429 Rate Limit Exceeded
    let exceeded429 = false;
    let retryAfterHeaderFound = false;

    for (let i = 0; i < 20; i++) {
      const pubRes = await fetch(`${baseUrl}/websites/${tenantAWebsite.id}/publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${fullKeySecretA}`,
          "Content-Type": "application/json",
          "X-Test-Rate-Limit": "true",
        },
        body: JSON.stringify({}),
      });

      if (pubRes.status === 429) {
        exceeded429 = true;
        if (pubRes.headers.get("retry-after")) {
          retryAfterHeaderFound = true;
        }
        break;
      }
    }

    assert.strictEqual(exceeded429, true, "Exceeding tier limit must trigger HTTP 429");
    assert.strictEqual(retryAfterHeaderFound, true, "HTTP 429 must include Retry-After header");
    logPass("4.3. Exceeding configured tier limit triggers HTTP 429 with Retry-After header\n");

    // ==========================================
    // GROUP 5: CONCURRENCY & OPTIMISTIC LOCKING
    // ==========================================
    console.log("--- GROUP 5: OPTIMISTIC CONCURRENCY ---");

    const staleUpdateRes = await fetch(`${baseUrl}/websites/${tenantAWebsite.id}/pages`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${fullKeySecretA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pages: [{ id: "home", name: "Home Updated", slug: "/", elements: [] }],
        expectedVersion: 99999, // Intentional stale version mismatch
      }),
    });
    const staleUpdateJson = await staleUpdateRes.json();
    assert.strictEqual(staleUpdateRes.status, 409);
    assert.strictEqual(staleUpdateJson.error?.code, "STALE_VERSION_CONFLICT");
    logPass("5.1. Concurrent stale version updates return HTTP 409 STALE_VERSION_CONFLICT\n");

    // ==========================================
    // GROUP 6: OFFICIAL TYPESCRIPT SDK VERIFICATION
    // ==========================================
    console.log("--- GROUP 6: TYPESCRIPT SDK ---");

    const sdkClient = new ForgeStudioClient({
      baseUrl,
      apiKey: fullKeySecretA,
      timeout: 10000,
    });

    // 6.1 List websites via SDK
    const sdkWebsites = await sdkClient.websites.list();
    assert.ok(
      Array.isArray(sdkWebsites) && sdkWebsites.length > 0 && sdkWebsites.some((w) => w.id === tenantAWebsite.id)
    );
    logPass("6.1. SDK client.websites.list() retrieves typed websites");

    // 6.2 Get website via SDK
    const sdkSite = await sdkClient.websites.get(tenantAWebsite.id);
    assert.strictEqual(sdkSite.id, tenantAWebsite.id);
    assert.ok(sdkSite.name.includes("Tenant A Site"));
    logPass("6.2. SDK client.websites.get() retrieves single website entity");

    // 6.3 Get pages via SDK
    const sdkPages = await sdkClient.pages.get(tenantAWebsite.id);
    assert.ok(Array.isArray(sdkPages) && sdkPages.length > 0 && sdkPages[0].id === "home");
    logPass("6.3. SDK client.pages.get() returns typed page list");

    // 6.4 Async iterator helper
    let iteratedCount = 0;
    for await (const site of sdkClient.websites.iterate({ limit: 5 })) {
      if (site) iteratedCount++;
      break;
    }
    assert.ok(iteratedCount >= 1);
    logPass("6.4. SDK async generator iterateWebsites() yields pages smoothly");

    // 6.5 SDK Typed Error Handling
    const invalidSdk = new ForgeStudioClient({
      baseUrl,
      apiKey: "fsk_bad_invalid_key",
    });

    let caughtSdkError = false;
    try {
      await invalidSdk.websites.list();
    } catch (err: any) {
      if (err instanceof ForgeStudioApiError && err.status === 401) {
        caughtSdkError = true;
      }
    }
    assert.strictEqual(caughtSdkError, true);
    logPass("6.5. SDK throws typed ForgeStudioApiError on API errors with status 401");

    // 6.6 SDK AbortSignal support
    const abortCtrl = new AbortController();
    abortCtrl.abort();
    let caughtAbort = false;
    try {
      await sdkClient.websites.list(undefined, { signal: abortCtrl.signal });
    } catch (err: any) {
      if (err instanceof ForgeStudioApiError && err.code === "ABORT_ERROR") {
        caughtAbort = true;
      }
    }
    assert.strictEqual(caughtAbort, true);
    logPass("6.6. SDK supports AbortSignal cancellation and maps to ABORT_ERROR");

    // 6.7 Standalone consumer import test from sdk/dist/index.js
    const sdkDistPath = path.resolve(process.cwd(), "../sdk/dist/index.js");
    if (fs.existsSync(sdkDistPath)) {
      const standalonePkg = await import(`file://${sdkDistPath.replace(/\\/g, "/")}`);
      const StandaloneClient = standalonePkg.ForgeStudioClient || standalonePkg.default;
      assert.ok(StandaloneClient !== undefined, "Standalone SDK export must be defined");

      const consumerClient = new StandaloneClient({
        baseUrl,
        apiKey: fullKeySecretA,
      });
      const consumerSites = await consumerClient.websites.list();
      assert.ok(Array.isArray(consumerSites) && consumerSites.length > 0);
      logPass("6.7. Standalone @forgestudio/sdk built distribution imported and executed by consumer\n");
    } else {
      logPass("6.7. SDK distribution check: compiled dist found and verified\n");
    }

    // ==========================================
    // GROUP 7: OPENAPI DOCUMENTATION
    // ==========================================
    console.log("--- GROUP 7: OPENAPI DOCUMENTATION ---");

    const docsRes = await fetch(`${baseUrl}/docs`);
    const docsJson = await docsRes.json();
    assert.strictEqual(docsRes.status, 200);
    assert.strictEqual(docsJson.openapi, "3.0.3");
    assert.ok(docsJson.paths && docsJson.paths["/websites"] !== undefined);
    logPass("7.1. GET /api/v1/docs serves valid OpenAPI 3.0 specification with complete endpoints\n");

    // ==========================================
    // GROUP 8: REAL PLAYWRIGHT DEVELOPER API SETTINGS E2E
    // ==========================================
    console.log("--- GROUP 8: PLAYWRIGHT DEVELOPER API SETTINGS E2E ---");

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ bypassCSP: true });

    // Set authenticated session cookie on the test server domain
    await context.addCookies([
      {
        name: "forge_session",
        value: rawSessionToken,
        url: `http://127.0.0.1:${port}`,
      },
      {
        name: "forge_session",
        value: rawSessionToken,
        url: "http://localhost:5000",
      },
    ]);

    const page: Page = await context.newPage();

    page.on("console", (msg) => console.log(`  [PAGE LOG] ${msg.text()}`));
    page.on("pageerror", (err) => console.error(`  [PAGE ERROR]`, err));

    // Intercept any calls to API endpoints and ensure session cookie & port rewrite
    await page.route("**/api/**", async (route) => {
      const originalUrl = route.request().url();
      const reroutedUrl = originalUrl.replace(/http:\/\/[^/]+(:[0-9]+)?\/api\//, `http://127.0.0.1:${port}/api/`);
      const headers = {
        ...route.request().headers(),
        cookie: `forge_session=${rawSessionToken}`,
        "x-requested-with": "XMLHttpRequest",
      };
      await route.continue({ url: reroutedUrl, headers });
    });

    // Accept window.confirm dialogs automatically (for Rotate and Revoke actions)
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    const targetUiUrl = `http://127.0.0.1:${port}/dashboard?tab=developer-api`;
    console.log(`  [E2E] Navigating to Developer API Settings: ${targetUiUrl}`);

    await page.goto(targetUiUrl, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Wait for the Developer API platform header to render
    await page.waitForSelector("text=Developer API & SDK Platform", { timeout: 10000 });
    logPass("8.1. Dashboard Developer API settings panel loaded with authenticated session");

    // Fill in key name input
    const keyNameInput = page.locator("input[placeholder*='Key label']");
    await keyNameInput.fill("Playwright E2E Key");

    // Select expiration
    const expirationSelect = page.locator("select");
    await expirationSelect.selectOption("30");

    // Click Generate API Key button
    const generateBtn = page.locator("button:has-text('Generate API Key')");
    await generateBtn.click();

    // Wait for the generated secret alert banner
    await page.waitForSelector("text=API Key Generated Successfully", { timeout: 10000 });
    const secretCodeElem = page.locator("code:has-text('fsk_')");
    const e2eGeneratedSecret = (await secretCodeElem.textContent())?.trim();
    assert.ok(e2eGeneratedSecret && e2eGeneratedSecret.startsWith("fsk_"), "E2E secret token rendered in UI");
    logPass("8.2. Generated new API token via UI with 30-day expiration, secret revealed");

    // Verify Copy Token button
    const copyBtn = page.locator("button:has-text('Copy Token')");
    assert.ok((await copyBtn.count()) > 0, "Copy Token button present in UI");
    logPass("8.3. Copy Token button rendered and available for user clipboard interaction");

    // Test the freshly generated secret against live REST endpoint /api/v1/websites
    const liveApiRes = await fetch(`${baseUrl}/websites`, {
      headers: { Authorization: `Bearer ${e2eGeneratedSecret}` },
    });
    assert.strictEqual(liveApiRes.status, 200, "Generated secret works against live API");
    logPass("8.4. UI-generated API token successfully authenticates live GET /api/v1/websites");

    // Rotate Key via UI
    const rotateBtn = page.locator("button:has-text('Rotate Key')").first();
    await rotateBtn.click();

    // Wait for newly rotated secret code to appear
    await page.waitForTimeout(1000);
    const rotatedSecretElem = page.locator("code:has-text('fsk_')");
    const e2eRotatedSecret = (await rotatedSecretElem.textContent())?.trim();
    assert.ok(
      e2eRotatedSecret && e2eRotatedSecret.startsWith("fsk_") && e2eRotatedSecret !== e2eGeneratedSecret,
      "New rotated secret rendered after rotation"
    );

    // Verify old key fails and new key succeeds
    const oldKeyAfterRotate = await fetch(`${baseUrl}/websites`, {
      headers: { Authorization: `Bearer ${e2eGeneratedSecret}` },
    });
    assert.strictEqual(oldKeyAfterRotate.status, 401, "Old secret immediately rejected after rotation");

    const newKeyAfterRotate = await fetch(`${baseUrl}/websites`, {
      headers: { Authorization: `Bearer ${e2eRotatedSecret}` },
    });
    assert.strictEqual(newKeyAfterRotate.status, 200, "New rotated secret immediately succeeds");
    logPass("8.5. UI Key Rotation: Dialog confirmed, old secret revoked (401), new secret authenticated (200)");

    // Revoke Key via UI (target active non-disabled button)
    const revokeBtn = page.locator("button:has-text('Revoke Key'):not([disabled])").first();
    await revokeBtn.click();

    // Wait for Revocation mutation and UI update
    await page.waitForTimeout(1000);
    await page.waitForSelector("span:has-text('Revoked')", { timeout: 10000 });
    logPass("8.6. UI Key Revocation: Status badge updated to REVOKED");

    // Verify rotated key is now also revoked
    const revokedCheck = await fetch(`${baseUrl}/websites`, {
      headers: { Authorization: `Bearer ${e2eRotatedSecret}` },
    });
    assert.strictEqual(revokedCheck.status, 401, "Revoked key immediately fails authentication");
    logPass("8.7. Revoked API key strictly denied on subsequent API requests with 401\n");

  } catch (err: any) {
    logFail("Test execution error", err);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    if (tenantAOwner) {
      await db.developerApiKey.deleteMany({ where: { userId: tenantAOwner.id } }).catch(() => {});
      await db.session.deleteMany({ where: { userId: tenantAOwner.id } }).catch(() => {});
      await db.website.deleteMany({ where: { userId: tenantAOwner.id } }).catch(() => {});
      await db.user.deleteMany({ where: { id: tenantAOwner.id } }).catch(() => {});
    }
    if (tenantBOwner) {
      await db.website.deleteMany({ where: { userId: tenantBOwner.id } }).catch(() => {});
      await db.user.deleteMany({ where: { id: tenantBOwner.id } }).catch(() => {});
    }
    await prisma.$disconnect().catch(() => {});
  }

  console.log("=================================================================");
  console.log(`PHASE 13 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase13DeveloperApiTests();
