/**
 * Feature 18 — Workspace Switching: Comprehensive Verification Test Suite
 *
 * Test Classification:
 * - PART 1 (Tests 1–10): Service-level direct tests (testing service logic and database state directly).
 * - PART 2 (Tests 11–17): HTTP Route Integration tests (invoking the Express app with session authentication cookies).
 *
 * Verifies:
 * 1. Empty workspace case: User with zero workspaces returns empty array.
 * 2. Multi-workspace membership: User can belong to multiple workspaces with distinct roles.
 * 3. Authorized workspace switching: Filters websites strictly to the selected workspace.
 * 4. Cross-workspace data isolation: Personal websites do not leak into workspace view, and vice versa.
 * 5. Unauthorized workspace access: Non-member user is rejected with 403 FORBIDDEN.
 * 6. Non-existent workspace: Non-existent workspace ID rejected with 404 NOT_FOUND.
 * 7. Workspace membership revocation: Revoked member is immediately denied workspace website access with 403 FORBIDDEN.
 * 8. Workspace website creation: Scopes new websites to workspaceId and blocks unauthorized creators with 403 FORBIDDEN.
 * 9. RBAC permission safety: Normal workspace member receives REVIEWER role with zero publish and zero rollback capabilities.
 * 10. Empty workspace handling: Workspace with no websites returns empty list cleanly without error.
 * 11. [HTTP Route] GET /api/v1/workspaces unauthenticated is rejected with 401.
 * 12. [HTTP Route] GET /api/v1/workspaces returns only authorized workspaces for authenticated session.
 * 13. [HTTP Route] POST /api/v1/workspaces creates new workspace with 201 status and validation.
 * 14. [HTTP Route] GET /api/websites?workspaceId=:id enforces isolation and 403 for non-members.
 * 15. [HTTP Route] POST /api/websites with workspaceId enforces membership authorization (403 for non-members).
 * 16. [HTTP Route] POST /api/v1/workspaces/:id/members blocks regular members (403) and allows owners (201).
 * 17. [HTTP Route] DELETE /api/v1/workspaces/:id/members/:userId blocks outsiders (403), protects owner (403), allows owner removal (200).
 */

import { randomUUID, createHash } from "crypto";
import { prisma } from "../config/prisma.js";
import app from "../app.js";
import {
  getUserWorkspaces,
  createWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember,
  getWorkspace,
} from "../services/workspace.service.js";
import {
  getUserWebsites,
  createWebsite,
  getWebsiteById,
} from "../services/website.service.js";
import { changeUserPlan } from "../services/subscription.service.js";
import { DEFAULT_CAPABILITIES } from "../services/permission.service.js";
import { AppError } from "../utils/app-error.js";

const db = prisma as any;

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
    return true;
  } else {
    console.error(`[FAIL] ${testName}`, details || "");
    failed++;
    return false;
  }
}

function requestApp(
  expressApp: any,
  method: string,
  urlPath: string,
  rawToken?: string,
  body?: any
): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const [pathPart, queryPart] = urlPath.split("?");
    const query: Record<string, string> = {};
    if (queryPart) {
      new URLSearchParams(queryPart).forEach((val, key) => {
        query[key] = val;
      });
    }

    const req: any = {
      method,
      url: urlPath,
      originalUrl: urlPath,
      headers: {
        "content-type": "application/json",
        cookie: rawToken ? `forge_session=${rawToken}` : "",
      },
      cookies: rawToken ? { forge_session: rawToken } : {},
      query,
      params: {},
      body: body || {},
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
    };

    let statusCode = 200;
    const res: any = {
      locals: {},
      status(code: number) {
        statusCode = code;
        return this;
      },
      setHeader() { return this; },
      getHeader() { return undefined; },
      removeHeader() { return this; },
      writeHead(code: number) {
        statusCode = code;
        return this;
      },
      end(data?: any) {
        resolve({ status: statusCode, body: data || null });
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
        resolve({ status: 404, body: null });
      }
    });
  });
}

async function runWorkspaceSwitchingTests() {
  console.log("=================================================");
  console.log("FEATURE 18 — WORKSPACE SWITCHING VERIFICATION TESTS");
  console.log("=================================================\n");

  let userA: any = null;
  let userB: any = null;
  let userC: any = null;
  let rawTokenA: string = "";
  let rawTokenB: string = "";
  let rawTokenC: string = "";

  let workspace1: any = null;
  let workspace2: any = null;
  let emptyWorkspace: any = null;
  let siteWs1: any = null;
  let siteWs2: any = null;
  let personalSiteA: any = null;

  try {
    // Setup test users with active agency plans
    userA = await db.user.create({
      data: {
        email: `f18-usera-${Date.now()}@example.com`,
        fullName: "F18 User Alpha",
        role: "USER",
        status: "ACTIVE",
      },
    });
    await changeUserPlan(userA.id, "agency");

    userB = await db.user.create({
      data: {
        email: `f18-userb-${Date.now()}@example.com`,
        fullName: "F18 User Beta",
        role: "USER",
        status: "ACTIVE",
      },
    });
    await changeUserPlan(userB.id, "agency");

    userC = await db.user.create({
      data: {
        email: `f18-userc-${Date.now()}@example.com`,
        fullName: "F18 User Charlie",
        role: "USER",
        status: "ACTIVE",
      },
    });
    await changeUserPlan(userC.id, "agency");

    // Create session cookies for HTTP route integration tests
    rawTokenA = `token_a_${Date.now()}`;
    rawTokenB = `token_b_${Date.now()}`;
    rawTokenC = `token_c_${Date.now()}`;

    await db.session.create({
      data: {
        userId: userA.id,
        tokenHash: createHash("sha256").update(rawTokenA).digest("hex"),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    await db.session.create({
      data: {
        userId: userB.id,
        tokenHash: createHash("sha256").update(rawTokenB).digest("hex"),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    await db.session.create({
      data: {
        userId: userC.id,
        tokenHash: createHash("sha256").update(rawTokenC).digest("hex"),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    console.log("--- PART 1: Service-Level Direct Database Tests ---\n");

    // -------------------------------------------------------------------------
    // TEST 1: User with zero workspaces returns empty array
    // -------------------------------------------------------------------------
    try {
      const initialWs = await getUserWorkspaces(userA.id);
      assert(
        Array.isArray(initialWs) && initialWs.length === 0,
        "Test 1 [Service]: User with zero workspaces returns empty array"
      );
    } catch (err: any) {
      assert(false, `Test 1 [Service] failed: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 2: User can belong to multiple workspaces with distinct roles
    // -------------------------------------------------------------------------
    try {
      workspace1 = await createWorkspace(
        userA.id,
        `Agency Alpha Workspace ${Date.now()}`,
        `agency-alpha-${Date.now()}`
      );

      workspace2 = await createWorkspace(
        userB.id,
        `Studio Beta Workspace ${Date.now()}`,
        `studio-beta-${Date.now()}`
      );
      await addWorkspaceMember(workspace2.id, userB.id, userA.id, "MEMBER");

      const userAWorkspaces = await getUserWorkspaces(userA.id);
      const ws1Entry = userAWorkspaces.find((w: any) => w.id === workspace1.id);
      const ws2Entry = userAWorkspaces.find((w: any) => w.id === workspace2.id);

      const rolesCorrect =
        ws1Entry &&
        ws2Entry &&
        (ws1Entry.members?.[0]?.role === "OWNER" || ws1Entry.ownerId === userA.id) &&
        ws2Entry.members?.[0]?.role === "MEMBER";

      assert(
        userAWorkspaces.length === 2 && Boolean(rolesCorrect),
        "Test 2 [Service]: User can belong to multiple workspaces with distinct roles (OWNER and MEMBER)"
      );
    } catch (err: any) {
      assert(false, `Test 2 [Service] failed: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Authorized workspace switching filters websites strictly to the selected workspace
    // -------------------------------------------------------------------------
    try {
      siteWs1 = await createWebsite({
        userId: userA.id,
        name: "Website for Workspace 1",
        workspaceId: workspace1.id,
      });

      siteWs2 = await createWebsite({
        userId: userB.id,
        name: "Website for Workspace 2",
        workspaceId: workspace2.id,
      });

      const ws1Websites = await getUserWebsites(userA.id, workspace1.id);
      const ws2Websites = await getUserWebsites(userA.id, workspace2.id);

      const ws1HasOnlyWs1Site =
        ws1Websites.length === 1 && ws1Websites[0].id === siteWs1.id;
      const ws2HasOnlyWs2Site =
        ws2Websites.length === 1 && ws2Websites[0].id === siteWs2.id;

      assert(
        ws1HasOnlyWs1Site && ws2HasOnlyWs2Site,
        "Test 3 [Service]: Authorized workspace switching filters websites strictly to the active workspace"
      );
    } catch (err: any) {
      assert(false, `Test 3 [Service] failed: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Cross-workspace data isolation (Personal vs Workspace)
    // -------------------------------------------------------------------------
    try {
      personalSiteA = await createWebsite({
        userId: userA.id,
        name: "User A Personal Website",
      });

      const personalWebsites = await getUserWebsites(userA.id, "personal");
      const ws1Websites = await getUserWebsites(userA.id, workspace1.id);

      const personalOnlyHasPersonal =
        personalWebsites.some((w: any) => w.id === personalSiteA.id) &&
        !personalWebsites.some((w: any) => w.id === siteWs1.id);

      const workspaceOnlyHasWorkspace =
        ws1Websites.some((w: any) => w.id === siteWs1.id) &&
        !ws1Websites.some((w: any) => w.id === personalSiteA.id);

      assert(
        personalOnlyHasPersonal && workspaceOnlyHasWorkspace,
        "Test 4 [Service]: Cross-workspace data isolation: Personal and workspace websites never cross-contaminate"
      );
    } catch (err: any) {
      assert(false, `Test 4 [Service] failed: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Unauthorized workspace access is strictly rejected with 403 Forbidden
    // -------------------------------------------------------------------------
    try {
      let threwForbidden = false;
      try {
        await getUserWebsites(userC.id, workspace1.id);
      } catch (err: any) {
        if (err instanceof AppError && err.statusCode === 403) {
          threwForbidden = true;
        }
      }
      assert(
        threwForbidden,
        "Test 5 [Service]: Unauthorized workspace access is strictly rejected with 403 FORBIDDEN"
      );
    } catch (err: any) {
      assert(false, `Test 5 [Service] failed: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Non-existent workspace query is rejected with 404 NOT_FOUND
    // -------------------------------------------------------------------------
    try {
      let threwNotFound = false;
      const randomWsId = randomUUID();
      try {
        await getUserWebsites(userA.id, randomWsId);
      } catch (err: any) {
        if (err instanceof AppError && err.statusCode === 404) {
          threwNotFound = true;
        }
      }
      assert(
        threwNotFound,
        "Test 6 [Service]: Non-existent workspace query is safely rejected with 404 NOT_FOUND"
      );
    } catch (err: any) {
      assert(false, `Test 6 [Service] failed: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 7: Workspace membership revocation immediately revokes access
    // -------------------------------------------------------------------------
    try {
      await addWorkspaceMember(workspace1.id, userA.id, userC.id, "MEMBER");
      const beforeRevoke = await getUserWebsites(userC.id, workspace1.id);
      const canAccessBefore = beforeRevoke.length > 0;

      await removeWorkspaceMember(workspace1.id, userA.id, userC.id);

      let threwAfterRevocation = false;
      try {
        await getUserWebsites(userC.id, workspace1.id);
      } catch (err: any) {
        if (err instanceof AppError && err.statusCode === 403) {
          threwAfterRevocation = true;
        }
      }

      assert(
        canAccessBefore && threwAfterRevocation,
        "Test 7 [Service]: Workspace membership revocation immediately blocks subsequent queries with 403 FORBIDDEN"
      );
    } catch (err: any) {
      assert(false, `Test 7 [Service] failed: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Workspace website creation scopes to workspaceId and blocks unauthorized users
    // -------------------------------------------------------------------------
    try {
      const wsSite = await createWebsite({
        userId: userB.id,
        name: "Authorized Workspace Creation",
        workspaceId: workspace2.id,
      });

      let blockedUnauthorizedCreation = false;
      try {
        await createWebsite({
          userId: userC.id,
          name: "Unauthorized Workspace Creation",
          workspaceId: workspace2.id,
        });
      } catch (err: any) {
        if (err instanceof AppError && err.statusCode === 403) {
          blockedUnauthorizedCreation = true;
        }
      }

      assert(
        wsSite.workspaceId === workspace2.id && blockedUnauthorizedCreation,
        "Test 8 [Service]: Website creation scopes to active workspace and blocks unauthorized creation with 403 FORBIDDEN"
      );
    } catch (err: any) {
      assert(false, `Test 8 [Service] failed: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 9: RBAC permission safety: Member role has REVIEWER (no publish/rollback)
    // -------------------------------------------------------------------------
    try {
      const siteForMember = await getWebsiteById(siteWs2.id, userA.id);
      const memberRole = siteForMember.userPermission;

      const capabilities = DEFAULT_CAPABILITIES[memberRole] || [];
      const hasPublish = capabilities.includes("PUBLISH");
      const hasRollback = capabilities.includes("ROLLBACK");
      const hasView = capabilities.includes("VIEW");

      const siteForOwner = await getWebsiteById(siteWs2.id, userB.id);
      const ownerRole = siteForOwner.userPermission;
      const ownerCaps = DEFAULT_CAPABILITIES[ownerRole] || [];

      assert(
        memberRole === "REVIEWER" &&
        !hasPublish &&
        !hasRollback &&
        hasView &&
        ownerCaps.includes("PUBLISH") &&
        ownerCaps.includes("ROLLBACK"),
        "Test 9 [Service]: RBAC safety: Normal workspace member receives REVIEWER role with zero publish and zero rollback capabilities"
      );
    } catch (err: any) {
      assert(false, `Test 9 [Service] failed: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 10: Empty workspace returns empty website list cleanly without error
    // -------------------------------------------------------------------------
    try {
      emptyWorkspace = await createWorkspace(
        userA.id,
        `Empty Workspace ${Date.now()}`,
        `empty-ws-${Date.now()}`
      );

      const emptyWebsites = await getUserWebsites(userA.id, emptyWorkspace.id);

      assert(
        Array.isArray(emptyWebsites) && emptyWebsites.length === 0,
        "Test 10 [Service]: Empty workspace returns empty website list cleanly without error"
      );
    } catch (err: any) {
      assert(false, `Test 10 [Service] failed: ${err.message}`);
    }

    console.log("\n--- PART 2: HTTP Route Integration Tests (Express App) ---\n");

    // -------------------------------------------------------------------------
    // TEST 11: GET /api/v1/workspaces unauthenticated is rejected with 401
    // -------------------------------------------------------------------------
    try {
      const resUnauth = await requestApp(app, "GET", "/api/v1/workspaces");
      assert(
        resUnauth.status === 401,
        "Test 11 [HTTP Route]: GET /api/v1/workspaces without session cookie is rejected with 401 Unauthorized",
        resUnauth
      );
    } catch (err: any) {
      assert(false, `Test 11 [HTTP Route] failed: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 12: GET /api/v1/workspaces returns only authorized workspaces
    // -------------------------------------------------------------------------
    try {
      const resWorkspaces = await requestApp(app, "GET", "/api/v1/workspaces", rawTokenA);
      const workspacesList = resWorkspaces.body?.workspaces || [];
      const hasWs1 = workspacesList.some((w: any) => w.id === workspace1.id);
      const hasWs2 = workspacesList.some((w: any) => w.id === workspace2.id);

      assert(
        resWorkspaces.status === 200 && hasWs1 && hasWs2,
        "Test 12 [HTTP Route]: GET /api/v1/workspaces returns authorized workspaces for authenticated session",
        resWorkspaces
      );
    } catch (err: any) {
      assert(false, `Test 12 [HTTP Route] failed: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 13: POST /api/v1/workspaces creates new workspace with 201 status
    // -------------------------------------------------------------------------
    let httpCreatedWs: any = null;
    try {
      const resCreateWs = await requestApp(app, "POST", "/api/v1/workspaces", rawTokenA, {
        name: `HTTP Workspace ${Date.now()}`,
      });
      httpCreatedWs = resCreateWs.body?.workspace;

      const resCreateEmpty = await requestApp(app, "POST", "/api/v1/workspaces", rawTokenA, {
        name: "   ",
      });

      assert(
        resCreateWs.status === 201 &&
        httpCreatedWs?.id &&
        resCreateEmpty.status === 400,
        "Test 13 [HTTP Route]: POST /api/v1/workspaces creates workspace (201) and validates name input (400)",
        { resCreateWs, resCreateEmpty }
      );
    } catch (err: any) {
      assert(false, `Test 13 [HTTP Route] failed: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 14: GET /api/websites?workspaceId=:id enforces isolation and 403 for non-members
    // -------------------------------------------------------------------------
    try {
      const resAuthWs = await requestApp(
        app,
        "GET",
        `/api/websites?workspaceId=${workspace1.id}`,
        rawTokenA
      );
      const resUnauthWs = await requestApp(
        app,
        "GET",
        `/api/websites?workspaceId=${workspace1.id}`,
        rawTokenC
      );
      const resNotFoundWs = await requestApp(
        app,
        "GET",
        `/api/websites?workspaceId=${randomUUID()}`,
        rawTokenA
      );

      const authHasWs1Site = resAuthWs.body?.websites?.some((w: any) => w.id === siteWs1.id);

      assert(
        resAuthWs.status === 200 &&
        authHasWs1Site &&
        resUnauthWs.status === 403 &&
        resNotFoundWs.status === 404,
        "Test 14 [HTTP Route]: GET /api/websites?workspaceId=:id enforces membership check (200 for member, 403 for outsider, 404 for invalid)",
        { resAuthWs, resUnauthWs, resNotFoundWs }
      );
    } catch (err: any) {
      assert(false, `Test 14 [HTTP Route] failed: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 15: POST /api/websites with workspaceId enforces membership authorization
    // -------------------------------------------------------------------------
    try {
      const resAuthCreate = await requestApp(app, "POST", "/api/websites", rawTokenA, {
        name: `HTTP Site in WS1 ${Date.now()}`,
        workspaceId: workspace1.id,
      });

      const resUnauthCreate = await requestApp(app, "POST", "/api/websites", rawTokenC, {
        name: `HTTP Site in WS1 by Outsider ${Date.now()}`,
        workspaceId: workspace1.id,
      });

      assert(
        resAuthCreate.status === 201 &&
        resAuthCreate.body?.website?.workspaceId === workspace1.id &&
        resUnauthCreate.status === 403,
        "Test 15 [HTTP Route]: POST /api/websites with workspaceId scopes to workspace (201) and blocks outsiders (403)",
        { resAuthCreate, resUnauthCreate }
      );
    } catch (err: any) {
      assert(false, `Test 15 [HTTP Route] failed: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 16: POST /api/v1/workspaces/:id/members blocks regular members and allows owners
    // -------------------------------------------------------------------------
    try {
      // User A is MEMBER in Workspace 2 (owned by User B). User A tries to add User C:
      const resMemberAdd = await requestApp(
        app,
        "POST",
        `/api/v1/workspaces/${workspace2.id}/members`,
        rawTokenA,
        { targetUserId: userC.id, role: "MEMBER" }
      );

      // User B is OWNER of Workspace 2. User B adds User C:
      const resOwnerAdd = await requestApp(
        app,
        "POST",
        `/api/v1/workspaces/${workspace2.id}/members`,
        rawTokenB,
        { targetUserId: userC.id, role: "MEMBER" }
      );

      assert(
        resMemberAdd.status === 403 && resOwnerAdd.status === 201,
        "Test 16 [HTTP Route]: Workspace member additions block non-admin members (403) and allow owners (201)",
        { resMemberAdd, resOwnerAdd }
      );
    } catch (err: any) {
      assert(false, `Test 16 [HTTP Route] failed: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 17: DELETE /api/v1/workspaces/:id/members/:userId blocks outsiders, protects owner, allows owner removal
    // -------------------------------------------------------------------------
    try {
      // Outsider User A attempts to remove User C from Workspace 2 where A is just a MEMBER:
      const resMemberRemove = await requestApp(
        app,
        "DELETE",
        `/api/v1/workspaces/${workspace2.id}/members/${userC.id}`,
        rawTokenA
      );

      // Owner User B attempts to remove themselves (the owner):
      const resRemoveOwner = await requestApp(
        app,
        "DELETE",
        `/api/v1/workspaces/${workspace2.id}/members/${userB.id}`,
        rawTokenB
      );

      // Owner User B removes User C:
      const resOwnerRemoveMember = await requestApp(
        app,
        "DELETE",
        `/api/v1/workspaces/${workspace2.id}/members/${userC.id}`,
        rawTokenB
      );

      assert(
        resMemberRemove.status === 403 &&
        resRemoveOwner.status === 403 &&
        resOwnerRemoveMember.status === 200,
        "Test 17 [HTTP Route]: Workspace member deletion blocks regular members (403), protects owner (403), and allows owner removal (200)",
        { resMemberRemove, resRemoveOwner, resOwnerRemoveMember }
      );
    } catch (err: any) {
      assert(false, `Test 17 [HTTP Route] failed: ${err.message}`);
    }

  } finally {
    // Cleanup test fixtures
    try {
      const allUserIds = [userA?.id, userB?.id, userC?.id].filter(Boolean);
      for (const uId of allUserIds) {
        await db.website.deleteMany({ where: { userId: uId } }).catch(() => {});
        await db.workspaceMember.deleteMany({ where: { userId: uId } }).catch(() => {});
        await db.workspace.deleteMany({ where: { ownerId: uId } }).catch(() => {});
        await db.session.deleteMany({ where: { userId: uId } }).catch(() => {});
        await db.user.delete({ where: { id: uId } }).catch(() => {});
      }
    } catch {}
  }

  console.log("\n=================================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runWorkspaceSwitchingTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
