import { prisma } from "../config/prisma.js";
import app from "../app.js";
import crypto from "crypto";
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

async function runCustomCodeAuthTests() {
  console.log("=================================================");
  console.log("RUNNING CUSTOM CODE AUTHORIZATION VERIFICATION SUITE");
  console.log("Phase 15 Feature 2 Step 1");
  console.log("=================================================\n");

  let server: Server | null = null;
  let baseUrl = "";

  let ownerUser: any;
  let adminUser: any;
  let developerUser: any;
  let designerUser: any;
  let editorUser: any;
  let viewerUser: any;
  let crossTenantUser: any;
  let testWebsite: any;
  let createdSnippetId: string = "";

  const createdUserIds: string[] = [];
  const createdWebsiteIds: string[] = [];

  try {
    const timestamp = Date.now();

    // 1. Create Test Users
    ownerUser = await db.user.create({
      data: { email: `owner_cc_${timestamp}@example.com`, fullName: "Owner CC", status: "ACTIVE" },
    });
    createdUserIds.push(ownerUser.id);

    adminUser = await db.user.create({
      data: { email: `admin_cc_${timestamp}@example.com`, fullName: "Admin CC", status: "ACTIVE" },
    });
    createdUserIds.push(adminUser.id);

    developerUser = await db.user.create({
      data: { email: `dev_cc_${timestamp}@example.com`, fullName: "Dev CC", status: "ACTIVE" },
    });
    createdUserIds.push(developerUser.id);

    designerUser = await db.user.create({
      data: { email: `designer_cc_${timestamp}@example.com`, fullName: "Designer CC", status: "ACTIVE" },
    });
    createdUserIds.push(designerUser.id);

    editorUser = await db.user.create({
      data: { email: `editor_cc_${timestamp}@example.com`, fullName: "Editor CC", status: "ACTIVE" },
    });
    createdUserIds.push(editorUser.id);

    viewerUser = await db.user.create({
      data: { email: `viewer_cc_${timestamp}@example.com`, fullName: "Viewer CC", status: "ACTIVE" },
    });
    createdUserIds.push(viewerUser.id);

    crossTenantUser = await db.user.create({
      data: { email: `cross_cc_${timestamp}@example.com`, fullName: "Cross Tenant CC", status: "ACTIVE" },
    });
    createdUserIds.push(crossTenantUser.id);

    // 2. Create Website owned by ownerUser
    testWebsite = await db.website.create({
      data: {
        userId: ownerUser.id,
        name: `Custom Code Test Site ${timestamp}`,
        slug: `cc-site-${timestamp}`,
        status: "DRAFT",
        editorData: { pages: [] },
      },
    });
    createdWebsiteIds.push(testWebsite.id);

    // 3. Add Collaborators with their respective roles
    await db.websiteCollaborator.createMany({
      data: [
        { websiteId: testWebsite.id, userId: adminUser.id, permission: "ADMIN" },
        { websiteId: testWebsite.id, userId: developerUser.id, permission: "DEVELOPER" },
        { websiteId: testWebsite.id, userId: designerUser.id, permission: "DESIGNER" },
        { websiteId: testWebsite.id, userId: editorUser.id, permission: "CONTENT_EDITOR" },
        { websiteId: testWebsite.id, userId: viewerUser.id, permission: "VIEWER" },
      ],
    });

    // 4. Generate Auth Tokens
    const ownerToken = await createTestSession(ownerUser.id);
    const adminToken = await createTestSession(adminUser.id);
    const devToken = await createTestSession(developerUser.id);
    const designerToken = await createTestSession(designerUser.id);
    const editorToken = await createTestSession(editorUser.id);
    const viewerToken = await createTestSession(viewerUser.id);
    const crossToken = await createTestSession(crossTenantUser.id);

    // 5. Start Server
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server!.address() as any;
        baseUrl = `http://localhost:${addr.port}/api/custom-code`;
        resolve();
      });
    });

    const headers = (token?: string) => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });

    // ==========================================
    // TEST 1: Unauthenticated Request Denied
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/website/${testWebsite.id}`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          title: "Unauth Snippet",
          language: "CSS",
          placement: "HEAD",
          code: "body { background: red; }",
        }),
      });
      assert(res.status === 401, "T1: Unauthenticated request to POST custom-code returns 401", {
        status: res.status,
      });
    }

    // ==========================================
    // TEST 2: Authorized OWNER can create custom code
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/website/${testWebsite.id}`, {
        method: "POST",
        headers: headers(ownerToken),
        body: JSON.stringify({
          title: "Owner Analytics Tag",
          language: "JS",
          placement: "HEAD",
          code: "console.log('owner tag');",
        }),
      });
      const data = await res.json();
      assert(
        res.status === 201 && data.success && data.snippet?.id,
        "T2: Authorized OWNER can create custom code snippet (201)",
        data
      );
      createdSnippetId = data.snippet?.id;
    }

    // ==========================================
    // TEST 3: Authorized ADMIN collaborator can create custom code
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/website/${testWebsite.id}`, {
        method: "POST",
        headers: headers(adminToken),
        body: JSON.stringify({
          title: "Admin Header Style",
          language: "CSS",
          placement: "HEAD",
          code: "header { color: blue; }",
        }),
      });
      const data = await res.json();
      assert(
        res.status === 201 && data.success,
        "T3: Authorized ADMIN collaborator can create custom code snippet (201)",
        data
      );
    }

    // ==========================================
    // TEST 4: Authorized DEVELOPER collaborator can create custom code
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/website/${testWebsite.id}`, {
        method: "POST",
        headers: headers(devToken),
        body: JSON.stringify({
          title: "Dev Custom Logic",
          language: "JS",
          placement: "BODY_END",
          code: "window.__customFeature = true;",
        }),
      });
      const data = await res.json();
      assert(
        res.status === 201 && data.success,
        "T4: Authorized DEVELOPER collaborator can create custom code snippet (201)",
        data
      );
    }

    // ==========================================
    // TEST 5: VIEWER collaborator denied
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/website/${testWebsite.id}`, {
        method: "POST",
        headers: headers(viewerToken),
        body: JSON.stringify({
          title: "Viewer Malicious Tag",
          language: "JS",
          placement: "HEAD",
          code: "alert('xss');",
        }),
      });
      assert(
        res.status === 403,
        "T5: VIEWER collaborator attempting to create custom code is rejected with 403",
        { status: res.status }
      );
    }

    // ==========================================
    // TEST 6: CONTENT_EDITOR collaborator denied
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/website/${testWebsite.id}`, {
        method: "POST",
        headers: headers(editorToken),
        body: JSON.stringify({
          title: "Editor Script Attempt",
          language: "JS",
          placement: "HEAD",
          code: "console.log('attempt');",
        }),
      });
      assert(
        res.status === 403,
        "T6: CONTENT_EDITOR collaborator attempting to create custom code is rejected with 403",
        { status: res.status }
      );
    }

    // ==========================================
    // TEST 7: DESIGNER collaborator denied
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/website/${testWebsite.id}`, {
        method: "POST",
        headers: headers(designerToken),
        body: JSON.stringify({
          title: "Designer Script Attempt",
          language: "JS",
          placement: "HEAD",
          code: "console.log('designer');",
        }),
      });
      assert(
        res.status === 403,
        "T7: DESIGNER collaborator attempting to create custom code is rejected with 403",
        { status: res.status }
      );
    }

    // ==========================================
    // TEST 8: Cross-tenant user cannot create code on Website A
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/website/${testWebsite.id}`, {
        method: "POST",
        headers: headers(crossToken),
        body: JSON.stringify({
          title: "Cross Tenant Injection",
          language: "JS",
          placement: "HEAD",
          code: "console.log('cross tenant');",
        }),
      });
      assert(
        res.status === 403,
        "T8: Cross-tenant user attempting to create custom code is rejected with 403",
        { status: res.status }
      );
    }

    // ==========================================
    // TEST 9: Authorized DEVELOPER collaborator can read snippets
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/website/${testWebsite.id}`, {
        method: "GET",
        headers: headers(devToken),
      });
      const data = await res.json();
      assert(
        res.status === 200 && data.success && Array.isArray(data.snippets) && data.snippets.length >= 3,
        "T9: Authorized DEVELOPER collaborator can list website custom code snippets",
        data
      );
    }

    // ==========================================
    // TEST 10: Authorized VIEWER collaborator can read snippets
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/website/${testWebsite.id}`, {
        method: "GET",
        headers: headers(viewerToken),
      });
      const data = await res.json();
      assert(
        res.status === 200 && data.success && Array.isArray(data.snippets),
        "T10: Authorized VIEWER collaborator can list website custom code snippets",
        data
      );
    }

    // ==========================================
    // TEST 11: Cross-tenant user cannot list snippets
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/website/${testWebsite.id}`, {
        method: "GET",
        headers: headers(crossToken),
      });
      assert(
        res.status === 403,
        "T11: Cross-tenant user cannot list another website's snippets (403)",
        { status: res.status }
      );
    }

    // ==========================================
    // TEST 12: Authorized DEVELOPER can update snippet
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/${createdSnippetId}`, {
        method: "PUT",
        headers: headers(devToken),
        body: JSON.stringify({
          title: "Updated by Developer",
          priority: 10,
        }),
      });
      const data = await res.json();
      assert(
        res.status === 200 && data.success && data.snippet?.priority === 10,
        "T12: Authorized DEVELOPER can update snippet (200)",
        data
      );
    }

    // ==========================================
    // TEST 13: VIEWER cannot update snippet
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/${createdSnippetId}`, {
        method: "PUT",
        headers: headers(viewerToken),
        body: JSON.stringify({
          title: "Hacked by Viewer",
        }),
      });
      assert(
        res.status === 403,
        "T13: VIEWER collaborator attempting to update snippet is rejected with 403",
        { status: res.status }
      );
    }

    // ==========================================
    // TEST 14: Cross-tenant user cannot update snippet
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/${createdSnippetId}`, {
        method: "PUT",
        headers: headers(crossToken),
        body: JSON.stringify({
          title: "Cross Tenant Snippet Override",
        }),
      });
      assert(
        res.status === 403,
        "T14: Cross-tenant user attempting to update snippet by ID is rejected with 403",
        { status: res.status }
      );
    }

    // ==========================================
    // TEST 15: VIEWER cannot delete snippet
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/${createdSnippetId}`, {
        method: "DELETE",
        headers: headers(viewerToken),
      });
      assert(
        res.status === 403,
        "T15: VIEWER collaborator attempting to delete snippet is rejected with 403",
        { status: res.status }
      );
    }

    // ==========================================
    // TEST 16: Cross-tenant user cannot delete snippet
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/${createdSnippetId}`, {
        method: "DELETE",
        headers: headers(crossToken),
      });
      assert(
        res.status === 403,
        "T16: Cross-tenant user attempting to delete snippet by ID is rejected with 403",
        { status: res.status }
      );
    }

    // ==========================================
    // TEST 17: Authorized ADMIN can delete snippet
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/${createdSnippetId}`, {
        method: "DELETE",
        headers: headers(adminToken),
      });
      const data = await res.json();
      assert(
        res.status === 200 && data.success,
        "T17: Authorized ADMIN can delete snippet (200)",
        data
      );
    }

    // ==========================================
    // TEST 18: JS Syntax Checking Validates AST
    // ==========================================
    {
      const res = await fetch(`${baseUrl}/website/${testWebsite.id}`, {
        method: "POST",
        headers: headers(ownerToken),
        body: JSON.stringify({
          title: "Broken JS Snippet",
          language: "JS",
          placement: "HEAD",
          code: "function broken( {",
        }),
      });
      const data = await res.json();
      assert(
        res.status === 400 && data.message?.includes("Syntax Error"),
        "T18: Syntax error in JavaScript code returns 400 with syntax error details",
        data
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
        await db.customCodeSnippet.deleteMany({
          where: { websiteId: { in: createdWebsiteIds } },
        });
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

runCustomCodeAuthTests();
