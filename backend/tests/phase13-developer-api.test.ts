import { prisma } from "../src/config/prisma.js";
import app from "../src/app.js";
import {
  createApiKey,
  verifyApiKey,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
} from "../src/services/apiKey.service.js";
import { ForgeStudioClient, ForgeStudioApiError } from "../src/sdk/client.js";
import { createServer, type Server } from "http";

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

async function runPhase13DeveloperApiTests() {
  console.log("=================================================================");
  console.log("FORGESTUDIO PHASE 13 — DEVELOPER API & SDK VERIFICATION SUITE");
  console.log("=================================================================\n");

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

  try {
    // 0. Spin up ephemeral server
    server = createServer(app);
    await new Promise<void>((resolve) => {
      server!.listen(0, () => {
        port = (server!.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
        resolve();
      });
    });

    console.log(`[SETUP] Test server listening on ${baseUrl}`);

    // Clean up past records safely
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

    console.log("[SETUP] Seeded isolated tenant A and tenant B\n");

    // ==========================================
    // GROUP 1: SECURE API KEY MANAGEMENT
    // ==========================================
    console.log("--- GROUP 1: API KEY LIFECYCLE & SECURITY ---");

    // 1.1 Generate key with canonical scopes
    const genResA = await createApiKey(
      tenantAOwner.id,
      "CI/CD Full Access",
      ["websites:read", "websites:write", "publish:write"]
    );
    fullKeySecretA = genResA.rawSecret;
    keyRecordA = genResA.apiKey;

    assert(
      fullKeySecretA.startsWith("fsk_") && fullKeySecretA.length >= 40,
      "1.1. Key generated with secure random fsk_ prefix and 24-byte entropy"
    );
    assert(
      keyRecordA.tokenHash !== fullKeySecretA && keyRecordA.tokenHash.length === 64,
      "1.2. Key secret hashed with SHA-256 before database storage"
    );
    assert(
      keyRecordA.maskedKey && keyRecordA.maskedKey.startsWith("fsk_") && keyRecordA.maskedKey.includes("..."),
      "1.3. Masked identifier stored without revealing raw secret"
    );

    // 1.2 Generate Read-Only and Write-Only Keys
    const genResReadOnly = await createApiKey(tenantAOwner.id, "ReadOnly Key", ["websites:read"]);
    readOnlyKeySecretA = genResReadOnly.rawSecret;

    const genResWriteOnly = await createApiKey(tenantAOwner.id, "WriteOnly Key", ["websites:write"]);
    writeOnlyKeySecretA = genResWriteOnly.rawSecret;

    // 1.3 Expiration handling
    const genResExpired = await createApiKey(tenantAOwner.id, "Expired Key", ["websites:read"], -1);
    expiredKeySecret = genResExpired.rawSecret;

    // Direct DB update to guarantee expiration timestamp in the past
    await db.developerApiKey.update({
      where: { id: genResExpired.apiKey.id },
      data: { expiresAt: new Date(Date.now() - 3600000) },
    });

    const verifyExpired = await verifyApiKey(expiredKeySecret);
    assert(
      verifyExpired && "error" in verifyExpired && verifyExpired.error === "EXPIRED",
      "1.4. Expired API key detected and rejected by verifyApiKey"
    );

    // 1.4 List keys does NOT expose rawSecret or tokenHash
    const keysList = await listApiKeys(tenantAOwner.id);
    const listedKey = keysList.find((k: any) => k.id === keyRecordA.id);
    assert(
      listedKey &&
        !("tokenHash" in listedKey) &&
        !("rawSecret" in listedKey) &&
        listedKey.maskedKey === keyRecordA.maskedKey,
      "1.5. Key listing masks identifiers and strictly redacts raw secrets and tokenHash"
    );

    // 1.5 Rotate Key
    const rotateRes = await rotateApiKey(tenantAOwner.id, genResWriteOnly.apiKey.id);
    assert(
      rotateRes !== null &&
        rotateRes.rawSecret.startsWith("fsk_") &&
        rotateRes.oldKeyId === genResWriteOnly.apiKey.id,
      "1.6. Key rotated successfully with atomic revocation of old key"
    );

    const oldKeyVerify = await verifyApiKey(writeOnlyKeySecretA);
    assert(
      oldKeyVerify && "error" in oldKeyVerify && oldKeyVerify.error === "REVOKED",
      "1.7. Old rotated key is immediately revoked"
    );

    // 1.6 Verify audit logs created
    const keyAuditLogs = await db.auditLog.findMany({
      where: { userId: tenantAOwner.id },
    });
    assert(
      keyAuditLogs.some((l: any) => l.action === "API_KEY_CREATE") &&
        keyAuditLogs.some((l: any) => l.action === "API_KEY_ROTATE"),
      "1.8. Audit logs recorded for API key creation and rotation"
    );

    console.log();

    // ==========================================
    // GROUP 2: API v1 AUTHENTICATION & MULTI-TENANCY
    // ==========================================
    console.log("--- GROUP 2: API v1 AUTHENTICATION & ISOLATION ---");

    // 2.1 Unauthenticated requests fail closed
    const unauthRes = await fetch(`${baseUrl}/websites`);
    assert(unauthRes.status === 401, "2.1. Request with missing authentication returns HTTP 401");

    // 2.2 Malformed Bearer token rejected
    const malformedRes = await fetch(`${baseUrl}/websites`, {
      headers: { Authorization: "Bearer invalid_garbage_token" },
    });
    assert(malformedRes.status === 401, "2.2. Request with invalid Bearer token returns HTTP 401");

    // 2.3 Valid Bearer API Key succeeds
    const validKeyRes = await fetch(`${baseUrl}/websites`, {
      headers: { Authorization: `Bearer ${fullKeySecretA}` },
    });
    const validKeyJson = await validKeyRes.json();
    assert(
      validKeyRes.status === 200 && validKeyJson.success === true && Array.isArray(validKeyJson.data),
      "2.3. Valid Bearer API key authenticates and returns envelope response"
    );

    // 2.4 Correlation/Request ID attached
    assert(
      validKeyRes.headers.get("x-request-id") !== null && validKeyJson.requestId !== undefined,
      "2.4. Request ID returned in both response headers and JSON body"
    );

    // 2.5 Multi-tenant Isolation: Tenant A cannot access Tenant B's website
    const crossTenantRes = await fetch(`${baseUrl}/websites/${tenantBWebsite.id}`, {
      headers: { Authorization: `Bearer ${fullKeySecretA}` },
    });
    assert(
      crossTenantRes.status === 403,
      "2.5. Cross-tenant access blocked: Tenant A key receives 403 FORBIDDEN accessing Tenant B site"
    );

    // 2.6 Suspended user's keys are denied
    await db.user.update({
      where: { id: tenantAOwner.id },
      data: { status: "SUSPENDED" },
    });

    const suspendedRes = await fetch(`${baseUrl}/websites`, {
      headers: { Authorization: `Bearer ${fullKeySecretA}` },
    });
    const suspendedJson = await suspendedRes.json();
    assert(
      suspendedRes.status === 403 && suspendedJson.error?.code === "ACCOUNT_SUSPENDED",
      "2.6. Suspended user immediately blocked on all API keys with 403 ACCOUNT_SUSPENDED"
    );

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
    assert(roReadRes.status === 200, "3.1. Read-only key allowed to read website configuration");

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
    assert(
      roWriteRes.status === 403 && roWriteJson.error?.code === "FORBIDDEN",
      "3.2. Read-only key strictly DENIED POST /websites with 403 FORBIDDEN"
    );

    // 3.3 Read-only key DENIED publishing
    const roPubRes = await fetch(`${baseUrl}/websites/${tenantAWebsite.id}/publish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${readOnlyKeySecretA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    assert(roPubRes.status === 403, "3.3. Read-only key strictly DENIED publish:write with 403 FORBIDDEN");

    console.log();

    // ==========================================
    // GROUP 4: RATE LIMITING & ABUSE PROTECTION
    // ==========================================
    console.log("--- GROUP 4: RATE LIMITING ---");

    // Create a client key with specific quota test headers
    const rlRes = await fetch(`${baseUrl}/websites`, {
      headers: {
        Authorization: `Bearer ${fullKeySecretA}`,
        "X-Test-Rate-Limit": "true",
      },
    });

    assert(
      rlRes.headers.get("ratelimit-limit") !== null &&
        rlRes.headers.get("ratelimit-remaining") !== null &&
        rlRes.headers.get("ratelimit-reset") !== null,
      "4.1. Standard RFC RateLimit headers returned (Limit, Remaining, Reset)"
    );

    // Test Rate Limit Exceeded returns 429
    let exceeded429 = false;
    let retryAfterHeaderFound = false;

    // Send rapid requests to publish limiter (max 10)
    for (let i = 0; i < 15; i++) {
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

    assert(exceeded429, "4.2. Exceeding configured tier limit triggers HTTP 429 response");
    assert(retryAfterHeaderFound, "4.3. HTTP 429 response includes Retry-After header");

    console.log();

    // ==========================================
    // GROUP 5: CONCURRENCY & OPTIMISTIC LOCKING
    // ==========================================
    console.log("--- GROUP 5: OPTIMISTIC CONCURRENCY ---");

    // 5.1 Stale revision returns 409
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
    assert(
      staleUpdateRes.status === 409 &&
        staleUpdateJson.error?.code === "STALE_VERSION_CONFLICT",
      "5.1. Concurrent stale version updates return HTTP 409 STALE_VERSION_CONFLICT"
    );

    console.log();

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
    assert(
      Array.isArray(sdkWebsites) && sdkWebsites.length > 0 && sdkWebsites.some((w) => w.id === tenantAWebsite.id),
      "6.1. SDK client.websites.list() retrieves typed websites"
    );

    // 6.2 Get website via SDK
    const sdkSite = await sdkClient.websites.get(tenantAWebsite.id);
    assert(
      sdkSite.id === tenantAWebsite.id && sdkSite.name === tenantAWebsite.name,
      "6.2. SDK client.websites.get() retrieves single website entity"
    );

    // 6.3 Get pages via SDK
    const sdkPages = await sdkClient.pages.get(tenantAWebsite.id);
    assert(
      Array.isArray(sdkPages) && sdkPages.length > 0 && sdkPages[0].id === "home",
      "6.3. SDK client.pages.get() returns typed page list"
    );

    // 6.4 Async iterator helper
    let iteratedCount = 0;
    for await (const site of sdkClient.websites.iterate({ limit: 5 })) {
      if (site) iteratedCount++;
      break;
    }
    assert(iteratedCount >= 1, "6.4. SDK async generator iterateWebsites() yields pages smoothly");

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
    assert(caughtSdkError, "6.5. SDK throws typed ForgeStudioApiError on API errors with status 401");

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
    assert(caughtAbort, "6.6. SDK supports AbortSignal cancellation and maps to ABORT_ERROR");

    console.log();

    // ==========================================
    // GROUP 7: OPENAPI DOCUMENTATION
    // ==========================================
    console.log("--- GROUP 7: OPENAPI DOCUMENTATION ---");

    const docsRes = await fetch(`${baseUrl}/docs`);
    const docsJson = await docsRes.json();
    assert(
      docsRes.status === 200 &&
        docsJson.openapi === "3.0.3" &&
        docsJson.paths &&
        docsJson.paths["/websites"] !== undefined,
      "7.1. GET /api/v1/docs serves valid OpenAPI 3.0 specification with complete endpoints"
    );

    console.log();
  } catch (err) {
    console.error("Test execution failed unexpectedly:", err);
    failed++;
  } finally {
    // Teardown
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    if (tenantAOwner) {
      await db.developerApiKey.deleteMany({ where: { userId: tenantAOwner.id } }).catch(() => {});
      await db.website.deleteMany({ where: { userId: tenantAOwner.id } }).catch(() => {});
      await db.user.deleteMany({ where: { id: tenantAOwner.id } }).catch(() => {});
    }
    if (tenantBOwner) {
      await db.website.deleteMany({ where: { userId: tenantBOwner.id } }).catch(() => {});
      await db.user.deleteMany({ where: { id: tenantBOwner.id } }).catch(() => {});
    }
  }

  console.log("=================================================================");
  console.log(`PHASE 13 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase13DeveloperApiTests();
