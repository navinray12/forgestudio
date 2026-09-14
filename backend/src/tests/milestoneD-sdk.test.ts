import { prisma } from "../config/prisma.js";
import app from "../app.js";
import {
  createApiKey,
  verifyApiKey,
  revokeApiKey,
} from "../services/apiKey.service.js";
import {
  ForgeStudioClient,
  ForgeStudioApiError,
} from "../sdk/client.js";
import {
  createForgeMessage,
  isForgeMessage,
  postForgeMessage,
  subscribeToForgeMessages,
} from "../sdk/embeddedEvents.js";
import type { Server } from "http";

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

async function runMilestoneDTests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO MILESTONE D VERIFICATION SUITE");
  console.log("SDK & Internal Integration (Master Phase 9)");
  console.log("=================================================\n");

  let server: any = null;
  let port = 0;
  let baseUrl = "";

  let ownerUser: any = null;
  let fullApiKeySecret = "";
  let readOnlyApiKeySecret = "";
  let revokedApiKeySecret = "";
  let createdWebsiteId = "";
  let createdDeploymentId = "";

  try {
    // 0. Setup Server & Users
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS developer_api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        "tokenHash" VARCHAR(255) UNIQUE NOT NULL,
        scopes JSONB DEFAULT '["websites:read"]',
        "lastUsedAt" TIMESTAMP WITH TIME ZONE,
        "revokedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    ownerUser = await db.user.create({
      data: {
        email: `sdk-owner-${Date.now()}@example.com`,
        fullName: "SDK Owner User",
        status: "ACTIVE",
      },
    });

    // Start ephemeral server
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server!.address() as any;
        port = addr.port;
        baseUrl = `http://localhost:${port}/api/v1`;
        resolve();
      });
    });

    // Create API Keys
    const fullKeyRes = await createApiKey(ownerUser.id, "Full Access Key", [
      "websites:read",
      "websites:write",
      "publish:write",
    ]);
    fullApiKeySecret = fullKeyRes.rawSecret;

    const readKeyRes = await createApiKey(ownerUser.id, "Read Only Key", [
      "websites:read",
    ]);
    readOnlyApiKeySecret = readKeyRes.rawSecret;

    const revokedKeyRes = await createApiKey(ownerUser.id, "Revoked Key", [
      "websites:read",
      "websites:write",
    ]);
    revokedApiKeySecret = revokedKeyRes.rawSecret;
    await revokeApiKey(ownerUser.id, revokedKeyRes.apiKey.id);

    // TEST 1: API Key Generation & Verification
    console.log("--- Test 1: API Key Generation & Verification ---");
    const verifiedFull = await verifyApiKey(fullApiKeySecret);
    const verifiedRevoked = await verifyApiKey(revokedApiKeySecret);
    const verifiedNonExistent = await verifyApiKey("fsk_nonexistent_key_12345");

    assert(
      fullApiKeySecret.startsWith("fsk_") &&
        verifiedFull !== null &&
        "user" in verifiedFull &&
        (verifiedFull as any).user?.id === ownerUser.id,
      "T1.1: Valid API key generates with fsk_ prefix and verifies successfully"
    );

    assert(
      verifiedRevoked !== null &&
        "error" in verifiedRevoked &&
        verifiedRevoked.error === "REVOKED",
      "T1.2: Revoked API key returns REVOKED error state"
    );

    assert(
      verifiedNonExistent === null,
      "T1.3: Non-existent API key returns null"
    );

    // TEST 2: Unauthenticated Access Rejection
    console.log("\n--- Test 2: Unauthenticated Access Rejection ---");
    const unauthRes = await fetch(`${baseUrl}/websites`);
    const unauthJson = await unauthRes.json();

    assert(
      unauthRes.status === 401 &&
        unauthJson.success === false &&
        unauthJson.error?.code === "UNAUTHORIZED",
      "T2.1: Requests without Authorization header receive 401 UNAUTHORIZED in standard envelope",
      unauthJson
    );

    // TEST 3: Invalid / Revoked API Key Rejection
    console.log("\n--- Test 3: Invalid / Revoked API Key Rejection ---");
    const invalidKeyRes = await fetch(`${baseUrl}/websites`, {
      headers: { Authorization: "Bearer fsk_bogus_token" },
    });
    const invalidKeyJson = await invalidKeyRes.json();

    const revokedKeyApiRes = await fetch(`${baseUrl}/websites`, {
      headers: { Authorization: `Bearer ${revokedApiKeySecret}` },
    });
    const revokedKeyApiJson = await revokedKeyApiRes.json();

    assert(
      invalidKeyRes.status === 401 &&
        invalidKeyJson.error?.code === "UNAUTHORIZED",
      "T3.1: Invalid Bearer token receives 401 UNAUTHORIZED"
    );

    assert(
      revokedKeyApiRes.status === 401 &&
        revokedKeyApiJson.error?.code === "UNAUTHORIZED",
      "T3.2: Revoked API key receives 401 UNAUTHORIZED"
    );

    // TEST 4: Website Creation via Public API v1
    console.log("\n--- Test 4: Website Creation via Public API v1 ---");
    const createRes = await fetch(`${baseUrl}/websites`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fullApiKeySecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Acme Corporation v1",
        slug: `acme-v1-${Date.now()}`,
        editorData: {
          pages: [
            { id: "home", name: "Home", slug: "/", elements: [] },
            { id: "about", name: "About Us", slug: "/about", elements: [] },
          ],
        },
      }),
    });
    const createJson = await createRes.json();
    createdWebsiteId = createJson.data?.id;

    assert(
      createRes.status === 201 &&
        createJson.success === true &&
        Boolean(createJson.data?.id) &&
        createJson.data?.name === "Acme Corporation v1",
      "T4.1: POST /api/v1/websites successfully creates website with standard envelope",
      createJson
    );

    // TEST 5: Scope Enforcement
    console.log("\n--- Test 5: Scope Enforcement ---");
    const forbiddenCreateRes = await fetch(`${baseUrl}/websites`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${readOnlyApiKeySecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Unauthorized Write",
      }),
    });
    const forbiddenCreateJson = await forbiddenCreateRes.json();

    assert(
      forbiddenCreateRes.status === 403 &&
        forbiddenCreateJson.success === false &&
        forbiddenCreateJson.error?.code === "FORBIDDEN",
      "T5.1: Read-only API key cannot write (enforces websites:write scope with 403)",
      forbiddenCreateJson
    );

    // TEST 6: List Websites with Pagination Envelope
    console.log("\n--- Test 6: List Websites with Pagination Envelope ---");
    const listRes = await fetch(`${baseUrl}/websites?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${readOnlyApiKeySecret}` },
    });
    const listJson = await listRes.json();

    assert(
      listRes.status === 200 &&
        listJson.success === true &&
        Array.isArray(listJson.data) &&
        listJson.meta?.total >= 1 &&
        listJson.meta?.page === 1 &&
        listJson.meta?.limit === 10,
      "T6.1: GET /api/v1/websites returns array and meta { total, page, limit }",
      listJson
    );

    // TEST 7: Get Website by ID
    console.log("\n--- Test 7: Get Website by ID ---");
    const getRes = await fetch(`${baseUrl}/websites/${createdWebsiteId}`, {
      headers: { Authorization: `Bearer ${readOnlyApiKeySecret}` },
    });
    const getJson = await getRes.json();

    assert(
      getRes.status === 200 &&
        getJson.success === true &&
        getJson.data?.id === createdWebsiteId &&
        getJson.data?.name === "Acme Corporation v1",
      "T7.1: GET /api/v1/websites/:id returns full website data",
      getJson
    );

    // TEST 8: Update Website
    console.log("\n--- Test 8: Update Website ---");
    const updateRes = await fetch(`${baseUrl}/websites/${createdWebsiteId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${fullApiKeySecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Acme Corporation v1 (Renamed)",
      }),
    });
    const updateJson = await updateRes.json();

    assert(
      updateRes.status === 200 &&
        updateJson.success === true &&
        updateJson.data?.name === "Acme Corporation v1 (Renamed)",
      "T8.1: PUT /api/v1/websites/:id updates metadata",
      updateJson
    );

    // TEST 9: Get Pages API
    console.log("\n--- Test 9: Get Pages API ---");
    const getPagesRes = await fetch(`${baseUrl}/websites/${createdWebsiteId}/pages`, {
      headers: { Authorization: `Bearer ${readOnlyApiKeySecret}` },
    });
    const getPagesJson = await getPagesRes.json();

    assert(
      getPagesRes.status === 200 &&
        getPagesJson.success === true &&
        Array.isArray(getPagesJson.data) &&
        getPagesJson.data.length === 2 &&
        getPagesJson.data[0].id === "home",
      "T9.1: GET /api/v1/websites/:id/pages returns array of pages with meta",
      getPagesJson
    );

    // TEST 10: Update Pages API
    console.log("\n--- Test 10: Update Pages API ---");
    const updatedPagesPayload = [
      { id: "home", name: "Home Sweet Home", slug: "/", elements: [] },
      { id: "about", name: "About Company", slug: "/about", elements: [] },
      { id: "contact", name: "Contact Us", slug: "/contact", elements: [] },
    ];
    const putPagesRes = await fetch(`${baseUrl}/websites/${createdWebsiteId}/pages`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${fullApiKeySecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pages: updatedPagesPayload }),
    });
    const putPagesJson = await putPagesRes.json();

    assert(
      putPagesRes.status === 200 &&
        putPagesJson.success === true &&
        putPagesJson.data?.pages?.length === 3 &&
        putPagesJson.data?.pages[2].id === "contact",
      "T10.1: PUT /api/v1/websites/:id/pages updates pages atomically",
      putPagesJson
    );

    // TEST 11: Publish Website via Public API v1
    console.log("\n--- Test 11: Publish Website via Public API v1 ---");
    const publishRes = await fetch(`${baseUrl}/websites/${createdWebsiteId}/publish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fullApiKeySecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        environment: "PRODUCTION",
        destinationType: "INTERNAL",
      }),
    });
    const publishJson = await publishRes.json();
    createdDeploymentId = publishJson.data?.deploymentId || publishJson.data?.deployment?.id;

    assert(
      publishRes.status === 201 &&
        publishJson.success === true &&
        Boolean(createdDeploymentId) &&
        (publishJson.data?.status === "PUBLISHED" || publishJson.data?.deployment?.status === "PUBLISHED"),
      "T11.1: POST /api/v1/websites/:id/publish succeeds and returns deployment + revision",
      publishJson
    );

    // TEST 12: List Deployments via Public API v1
    console.log("\n--- Test 12: List Deployments via Public API v1 ---");
    const depsRes = await fetch(`${baseUrl}/websites/${createdWebsiteId}/deployments`, {
      headers: { Authorization: `Bearer ${readOnlyApiKeySecret}` },
    });
    const depsJson = await depsRes.json();

    assert(
      depsRes.status === 200 &&
        depsJson.success === true &&
        Array.isArray(depsJson.data) &&
        depsJson.data.length >= 1 &&
        depsJson.data[0].id === createdDeploymentId,
      "T12.1: GET /api/v1/websites/:id/deployments returns deployments list",
      depsJson
    );

    // TEST 13: Rollback Deployment via Public API v1
    console.log("\n--- Test 13: Rollback Deployment via Public API v1 ---");
    const rollbackRes = await fetch(
      `${baseUrl}/websites/${createdWebsiteId}/deployments/${createdDeploymentId}/rollback`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${fullApiKeySecret}`,
        },
      }
    );
    const rollbackJson = await rollbackRes.json();

    assert(
      rollbackRes.status === 200 &&
        rollbackJson.success === true &&
        Boolean(rollbackJson.data?.deploymentId || rollbackJson.data?.deployment),
      "T13.1: POST /api/v1/websites/:id/deployments/:id/rollback successfully executes rollback",
      rollbackJson
    );

    // TEST 14: Isomorphic TypeScript SDK Client
    console.log("\n--- Test 14: Isomorphic TypeScript SDK Client ---");
    const sdkClient = new ForgeStudioClient({
      baseUrl,
      apiKey: fullApiKeySecret,
    });

    const sdkWebsites = await sdkClient.listWebsites();
    const sdkSite = await sdkClient.getWebsite(createdWebsiteId);
    const sdkPages = await sdkClient.getPages(createdWebsiteId);
    const sdkUpdatedPages = await sdkClient.updatePages(createdWebsiteId, [
      ...sdkPages,
      { id: "pricing", name: "Pricing Plans", slug: "/pricing", elements: [] },
    ]);
    const sdkDeployments = await sdkClient.listDeployments(createdWebsiteId);

    assert(
      Array.isArray(sdkWebsites) && sdkWebsites.length >= 1,
      "T14.1: SDK client.listWebsites() fetches websites list"
    );

    assert(
      sdkSite.id === createdWebsiteId &&
        sdkSite.name === "Acme Corporation v1 (Renamed)",
      "T14.2: SDK client.getWebsite() returns website entity"
    );

    assert(
      Array.isArray(sdkPages) && sdkPages.length === 3,
      "T14.3: SDK client.getPages() retrieves pages array"
    );

    assert(
      sdkUpdatedPages.pages.length === 4 &&
        sdkUpdatedPages.pages[3].id === "pricing",
      "T14.4: SDK client.updatePages() pushes updated pages"
    );

    assert(
      Array.isArray(sdkDeployments) && sdkDeployments.length >= 1,
      "T14.5: SDK client.listDeployments() retrieves deployment records"
    );

    // SDK Error handling test
    let sdkErrorCaught = false;
    const badSdkClient = new ForgeStudioClient({
      baseUrl,
      apiKey: "fsk_bad_token",
    });
    try {
      await badSdkClient.listWebsites();
    } catch (err: any) {
      if (err instanceof ForgeStudioApiError && err.code === "UNAUTHORIZED") {
        sdkErrorCaught = true;
      }
    }

    assert(
      sdkErrorCaught,
      "T14.6: SDK client throws ForgeStudioApiError with code UNAUTHORIZED on 401"
    );

    // TEST 15: Embedded Mode postMessage Event Contracts
    console.log("\n--- Test 15: Embedded Mode postMessage Event Contracts ---");
    const mountMsg = createForgeMessage("FORGESTUDIO_MOUNT", {
      websiteId: createdWebsiteId,
      theme: "dark",
      readOnly: false,
    });

    assert(
      mountMsg.source === "FORGESTUDIO" &&
        mountMsg.type === "FORGESTUDIO_MOUNT" &&
        mountMsg.payload.websiteId === createdWebsiteId &&
        typeof mountMsg.timestamp === "number",
      "T15.1: createForgeMessage creates compliant contract message"
    );

    assert(
      isForgeMessage(mountMsg) === true &&
        isForgeMessage({ type: "RANDOM", payload: 123 }) === false &&
        isForgeMessage(null) === false,
      "T15.2: isForgeMessage guards against alien or invalid postMessage envelopes"
    );

    let receivedMsg: any = null;
    const mockWindow = {
      messages: [] as any[],
      listeners: [] as ((ev: any) => void)[],
      postMessage(msg: any) {
        this.messages.push(msg);
        for (const l of this.listeners) {
          l({ data: msg });
        }
      },
      addEventListener(_type: string, listener: any) {
        this.listeners.push(listener);
      },
      removeEventListener(_type: string, listener: any) {
        this.listeners = this.listeners.filter((l) => l !== listener);
      },
    };

    const unsubscribe = subscribeToForgeMessages(mockWindow, (msg) => {
      receivedMsg = msg;
    });

    postForgeMessage(mockWindow, "FORGESTUDIO_STATE_CHANGED", {
      websiteId: createdWebsiteId,
      isDirty: true,
      activePageId: "pricing",
    });

    assert(
      receivedMsg !== null &&
        receivedMsg.type === "FORGESTUDIO_STATE_CHANGED" &&
        receivedMsg.payload.activePageId === "pricing",
      "T15.3: postForgeMessage and subscribeToForgeMessages dispatch and receive messages"
    );

    unsubscribe();
    receivedMsg = null;
    postForgeMessage(mockWindow, "FORGESTUDIO_SAVE", {
      websiteId: createdWebsiteId,
    });

    assert(
      receivedMsg === null,
      "T15.4: unsubscribe clean-up prevents stale event processing"
    );
  } catch (err: any) {
    console.error("FATAL ERROR in Milestone D tests:", err);
    failed++;
  } finally {
    // Teardown
    if (createdWebsiteId) {
      await db.website.deleteMany({ where: { id: createdWebsiteId } }).catch(() => {});
    }
    if (ownerUser?.id) {
      await db.developerApiKey.deleteMany({ where: { userId: ownerUser.id } }).catch(() => {});
      await db.user.deleteMany({ where: { id: ownerUser.id } }).catch(() => {});
    }
    if (server) {
      const s = server;
      await new Promise<void>((resolve) => s.close(() => resolve()));
    }
  }

  console.log("\n=================================================");
  console.log(`MILESTONE D RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runMilestoneDTests().catch((err) => {
  console.error("Unhandle test error:", err);
  process.exit(1);
});
