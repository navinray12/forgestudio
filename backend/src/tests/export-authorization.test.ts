import { prisma } from "../config/prisma.js";
import app from "../app.js";
import crypto from "crypto";
import type { Server } from "http";

const db = prisma as any;

let passed = 0;
let failed = 0;

function assert(condition: any, testName: string, details?: any) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, details || "");
    failed++;
  }
}

async function createTestSession(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await db.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return rawToken;
}

async function runExportAuthTests() {
  console.log("=================================================");
  console.log("RUNNING EXPORT AUTHORIZATION VERIFICATION SUITE");
  console.log("Phase 15 Feature 2 Step 2");
  console.log("=================================================\n");

  let server: Server | null = null;
  let baseUrl = "";

  let ownerUser: any;
  let collaboratorUser: any;
  let platformAdminUser: any;
  let crossTenantUser: any;
  let testWebsite: any;

  const createdUserIds: string[] = [];
  const createdWebsiteIds: string[] = [];

  try {
    const timestamp = Date.now();

    // 1. Create Test Users
    ownerUser = await db.user.create({
      data: { email: `owner_exp_${timestamp}@example.com`, fullName: "Export Owner", status: "ACTIVE", role: "USER" },
    });
    createdUserIds.push(ownerUser.id);

    collaboratorUser = await db.user.create({
      data: { email: `collab_exp_${timestamp}@example.com`, fullName: "Export Collab", status: "ACTIVE", role: "USER" },
    });
    createdUserIds.push(collaboratorUser.id);

    platformAdminUser = await db.user.create({
      data: { email: `admin_exp_${timestamp}@example.com`, fullName: "Export Admin", status: "ACTIVE", role: "PLATFORM_ADMIN" },
    });
    createdUserIds.push(platformAdminUser.id);

    crossTenantUser = await db.user.create({
      data: { email: `cross_exp_${timestamp}@example.com`, fullName: "Export Cross Tenant", status: "ACTIVE", role: "USER" },
    });
    createdUserIds.push(crossTenantUser.id);

    // 2. Create Website owned by ownerUser
    testWebsite = await db.website.create({
      data: {
        userId: ownerUser.id,
        name: `Export Test Site ${timestamp}`,
        slug: `export-site-${timestamp}`,
        status: "DRAFT",
        editorData: {
          siteSettings: { siteName: "Export Test Site" },
          pages: [
            {
              id: "home",
              name: "Home",
              slug: "index",
              elements: [
                { id: "h1", type: "heading", tag: "h1", textContent: "Hello World", attributes: {} },
              ],
            },
          ],
        },
      },
    });
    createdWebsiteIds.push(testWebsite.id);

    // 3. Add collaboratorUser to website
    await db.websiteCollaborator.create({
      data: {
        websiteId: testWebsite.id,
        userId: collaboratorUser.id,
        permission: "DEVELOPER",
      },
    });

    // 4. Generate Auth Tokens
    const ownerToken = await createTestSession(ownerUser.id);
    const collabToken = await createTestSession(collaboratorUser.id);
    const adminToken = await createTestSession(platformAdminUser.id);
    const crossToken = await createTestSession(crossTenantUser.id);

    // 5. Start Server
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server!.address() as any;
        baseUrl = `http://localhost:${addr.port}/api/websites`;
        resolve();
      });
    });

    const headers = (token?: string) => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });

    // ==========================================
    // TEST 1: Unauthenticated request to export preview returns 401
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/${testWebsite.id}/export/preview`, {
        method: "GET",
        headers: headers(),
      });
      assert(res.status === 401, "T1: Unauthenticated request to export preview returns 401", {
        status: res.status,
      });
    }

    // ==========================================
    // TEST 2: Unauthenticated request to export zip returns 401
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/${testWebsite.id}/export/zip`, {
        method: "GET",
        headers: headers(),
      });
      assert(res.status === 401, "T2: Unauthenticated request to export zip returns 401", {
        status: res.status,
      });
    }

    // ==========================================
    // TEST 3: Authorized Owner can export preview (200)
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/${testWebsite.id}/export/preview`, {
        method: "GET",
        headers: headers(ownerToken),
      });
      const data = await res.json();
      assert(
        res.status === 200 && data.success && data.code?.html && data.websiteId === testWebsite.id,
        "T3: Authorized Owner can export preview (200)",
        data
      );
    }

    // ==========================================
    // TEST 4: Authorized Owner can download zip (200)
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/${testWebsite.id}/export/zip`, {
        method: "GET",
        headers: headers(ownerToken),
      });
      const contentType = res.headers.get("content-type");
      const buffer = await res.arrayBuffer();
      assert(
        Boolean(res.status === 200 && contentType?.includes("application/zip") && buffer.byteLength > 0),
        "T4: Authorized Owner can download project zip (200)",
        { status: res.status, byteLength: buffer.byteLength }
      );
    }

    // ==========================================
    // TEST 5: Authorized Collaborator can export preview (200)
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/${testWebsite.id}/export/preview`, {
        method: "GET",
        headers: headers(collabToken),
      });
      const data = await res.json();
      assert(
        res.status === 200 && data.success && data.code?.html,
        "T5: Authorized Collaborator can export preview (200)",
        data
      );
    }

    // ==========================================
    // TEST 6: Authorized Collaborator can download zip (200)
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/${testWebsite.id}/export/zip`, {
        method: "GET",
        headers: headers(collabToken),
      });
      const buffer = await res.arrayBuffer();
      assert(
        res.status === 200 && buffer.byteLength > 0,
        "T6: Authorized Collaborator can download project zip (200)",
        { status: res.status, byteLength: buffer.byteLength }
      );
    }

    // ==========================================
    // TEST 7: Cross-tenant user cannot export preview (404)
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/${testWebsite.id}/export/preview`, {
        method: "GET",
        headers: headers(crossToken),
      });
      assert(
        res.status === 404,
        "T7: Cross-tenant user cannot export preview (404)",
        { status: res.status }
      );
    }

    // ==========================================
    // TEST 8: Cross-tenant user cannot download zip (403/404)
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/${testWebsite.id}/export/zip`, {
        method: "GET",
        headers: headers(crossToken),
      });
      assert(
        res.status === 403 || res.status === 404,
        "T8: Cross-tenant user cannot download project zip (403 or 404)",
        { status: res.status }
      );
    }

    // ==========================================
    // TEST 9: Platform Admin can export site (200)
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/${testWebsite.id}/export/preview`, {
        method: "GET",
        headers: headers(adminToken),
      });
      const data = await res.json();
      assert(
        res.status === 200 && data.success,
        "T9: Platform Administrator can export site (200)",
        data
      );
    }

    // ==========================================
    // TEST 10: Invalid website ID is handled safely without 500 error
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/invalid-website-uuid-not-found/export/preview`, {
        method: "GET",
        headers: headers(ownerToken),
      });
      assert(
        res.status === 404,
        "T10: Invalid website ID is handled safely with 404",
        { status: res.status }
      );
    }

  } catch (error) {
    console.error("Test execution threw exception:", error);
    failed++;
  } finally {
    // Cleanup
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }

    try {
      if (createdWebsiteIds.length > 0) {
        await db.websiteCollaborator.deleteMany({
          where: { websiteId: { in: createdWebsiteIds } },
        });
        await db.website.deleteMany({
          where: { id: { in: createdWebsiteIds } },
        });
      }
      if (createdUserIds.length > 0) {
        await db.session.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await db.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }
    } catch (cleanupError) {
      console.warn("Cleanup error (non-fatal):", cleanupError);
    }
  }

  console.log("\n=================================================");
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runExportAuthTests();
