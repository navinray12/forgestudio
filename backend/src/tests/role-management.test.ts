/**
 * Feature 20 — Role Management: Comprehensive Verification Test Suite
 *
 * Test Classification:
 * - PART 1: Service-level direct tests (testing service logic, DB state, authorization, audit logging).
 * - PART 2: Permission consistency tests (testing effective website capabilities: PUBLISH & ROLLBACK).
 * - PART 3: HTTP Route Integration tests (invoking Express app with session cookies for PATCH /api/v1/workspaces/:id/members/:userId).
 *
 * Requirements Covered:
 * 1. Owner promotes MEMBER to ADMIN.
 * 2. Owner demotes ADMIN to MEMBER.
 * 3. Authorized ADMIN changes an eligible member's role.
 * 4. Ordinary MEMBER cannot change another user's role (403 FORBIDDEN).
 * 5. Ordinary MEMBER cannot promote themselves (403 FORBIDDEN).
 * 6. Workspace owner cannot be demoted or changed (403 FORBIDDEN).
 * 7. Invalid roles are rejected (400 BAD_REQUEST).
 * 8. Non-member target is rejected (404 NOT_FOUND).
 * 9. Non-existent workspace is rejected (404 NOT_FOUND).
 * 10. Audit log recorded properly (action: WORKSPACE_MEMBER_ROLE_UPDATED).
 * 11. Role change dynamically updates effective website permissions (PUBLISH & ROLLBACK).
 * 12. [HTTP Route] Unauthenticated PATCH returns 401.
 * 13. [HTTP Route] Unauthorized outsider returns 403.
 * 14. [HTTP Route] Ordinary member PATCH returns 403.
 * 15. [HTTP Route] Invalid role in HTTP body returns 400.
 * 16. [HTTP Route] Owner promotes member via HTTP returns 200.
 * 17. [HTTP Route] Admin demotes member via HTTP returns 200.
 * 18. [HTTP Route] Demoting owner via HTTP returns 403.
 */

import { randomUUID, createHash } from "crypto";
import { prisma } from "../config/prisma.js";
import app from "../app.js";
import {
  createWorkspace,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  initWorkspaceTables,
} from "../services/workspace.service.js";
import { createWebsite } from "../services/website.service.js";
import { changeUserPlan } from "../services/subscription.service.js";
import { canUserAccessResource } from "../services/permission.service.js";

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

async function runRoleManagementTests() {
  console.log("=================================================");
  console.log("FEATURE 20 — ROLE MANAGEMENT VERIFICATION TESTS");
  console.log("=================================================\n");

  await initWorkspaceTables();

  const testSuffix = randomUUID().substring(0, 8);
  const ownerEmail = `rm-owner-${testSuffix}@test.com`;
  const adminEmail = `rm-admin-${testSuffix}@test.com`;
  const member1Email = `rm-member1-${testSuffix}@test.com`;
  const member2Email = `rm-member2-${testSuffix}@test.com`;
  const outsiderEmail = `rm-outsider-${testSuffix}@test.com`;

  // Create test users
  const owner = await db.user.create({
    data: {
      email: ownerEmail,
      fullName: "Workspace Owner",
      passwordHash: "hash123",
      emailVerified: true,
    },
  });

  const admin = await db.user.create({
    data: {
      email: adminEmail,
      fullName: "Workspace Admin",
      passwordHash: "hash123",
      emailVerified: true,
    },
  });

  const member1 = await db.user.create({
    data: {
      email: member1Email,
      fullName: "Workspace Member One",
      passwordHash: "hash123",
      emailVerified: true,
    },
  });

  const member2 = await db.user.create({
    data: {
      email: member2Email,
      fullName: "Workspace Member Two",
      passwordHash: "hash123",
      emailVerified: true,
    },
  });

  const outsider = await db.user.create({
    data: {
      email: outsiderEmail,
      fullName: "Outsider User",
      passwordHash: "hash123",
      emailVerified: true,
    },
  });

  // Assign agency plan to owner to allow website creations
  await changeUserPlan(owner.id, "agency");

  // Create workspace
  const workspace = await createWorkspace(owner.id, `Role Studio ${testSuffix}`);

  // Add members
  await addWorkspaceMember(workspace.id, owner.id, admin.id, "ADMIN");
  await addWorkspaceMember(workspace.id, owner.id, member1.id, "MEMBER");
  await addWorkspaceMember(workspace.id, owner.id, member2.id, "MEMBER");

  // Create a website in the workspace
  const wsWebsite = await createWebsite({
    userId: owner.id,
    name: `Role Managed Website ${testSuffix}`,
    workspaceId: workspace.id,
  });

  console.log("--- PART 1: SERVICE-LEVEL TESTS ---\n");

  // -------------------------------------------------------------
  // Test 1: Owner promotes MEMBER to ADMIN
  // -------------------------------------------------------------
  try {
    const updated = await updateWorkspaceMemberRole(workspace.id, owner.id, member1.id, "ADMIN");
    const checkDb = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: member1.id } },
    });

    assert(
      updated.role === "ADMIN" &&
      checkDb.role === "ADMIN" &&
      updated.user.id === member1.id,
      "Test 1: Workspace owner can successfully promote a MEMBER to ADMIN"
    );
  } catch (err: any) {
    assert(false, "Test 1: Owner promotes MEMBER to ADMIN", err.message);
  }

  // -------------------------------------------------------------
  // Test 2: Owner demotes ADMIN to MEMBER
  // -------------------------------------------------------------
  try {
    const updated = await updateWorkspaceMemberRole(workspace.id, owner.id, member1.id, "MEMBER");
    const checkDb = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: member1.id } },
    });

    assert(
      updated.role === "MEMBER" &&
      checkDb.role === "MEMBER",
      "Test 2: Workspace owner can successfully demote an ADMIN to MEMBER"
    );
  } catch (err: any) {
    assert(false, "Test 2: Owner demotes ADMIN to MEMBER", err.message);
  }

  // -------------------------------------------------------------
  // Test 3: Authorized ADMIN changes an eligible member's role
  // -------------------------------------------------------------
  try {
    // Admin promotes member2 to ADMIN
    const promoRes = await updateWorkspaceMemberRole(workspace.id, admin.id, member2.id, "ADMIN");
    // Admin demotes member2 back to MEMBER
    const demoRes = await updateWorkspaceMemberRole(workspace.id, admin.id, member2.id, "MEMBER");

    assert(
      promoRes.role === "ADMIN" && demoRes.role === "MEMBER",
      "Test 3: Authorized ADMIN can change an eligible member's role (promote & demote)"
    );
  } catch (err: any) {
    assert(false, "Test 3: Authorized ADMIN changes role", err.message);
  }

  // -------------------------------------------------------------
  // Test 4: Ordinary MEMBER cannot change another user's role
  // -------------------------------------------------------------
  try {
    let failedAsExpected = false;
    try {
      await updateWorkspaceMemberRole(workspace.id, member1.id, member2.id, "ADMIN");
    } catch (err: any) {
      if (err.statusCode === 403) failedAsExpected = true;
    }

    assert(
      failedAsExpected,
      "Test 4: Ordinary MEMBER is forbidden from changing another member's role (403)"
    );
  } catch (err: any) {
    assert(false, "Test 4: Ordinary MEMBER cannot change role", err.message);
  }

  // -------------------------------------------------------------
  // Test 5: Ordinary MEMBER cannot promote themselves
  // -------------------------------------------------------------
  try {
    let selfPromoFailed = false;
    try {
      await updateWorkspaceMemberRole(workspace.id, member1.id, member1.id, "ADMIN");
    } catch (err: any) {
      if (err.statusCode === 403) selfPromoFailed = true;
    }

    assert(
      selfPromoFailed,
      "Test 5: Ordinary MEMBER cannot promote themselves (403 FORBIDDEN)"
    );
  } catch (err: any) {
    assert(false, "Test 5: Ordinary MEMBER cannot promote themselves", err.message);
  }

  // -------------------------------------------------------------
  // Test 6: Workspace owner cannot have role changed or be demoted
  // -------------------------------------------------------------
  try {
    let ownerDemoteFailed = false;
    try {
      await updateWorkspaceMemberRole(workspace.id, admin.id, owner.id, "MEMBER");
    } catch (err: any) {
      if (err.statusCode === 403) ownerDemoteFailed = true;
    }

    let ownerSelfDemoteFailed = false;
    try {
      await updateWorkspaceMemberRole(workspace.id, owner.id, owner.id, "MEMBER");
    } catch (err: any) {
      if (err.statusCode === 403) ownerSelfDemoteFailed = true;
    }

    assert(
      ownerDemoteFailed && ownerSelfDemoteFailed,
      "Test 6: Workspace owner cannot have their role changed or demoted through the endpoint (403)"
    );
  } catch (err: any) {
    assert(false, "Test 6: Workspace owner cannot be demoted", err.message);
  }

  // -------------------------------------------------------------
  // Test 7: Invalid roles are rejected (only ADMIN or MEMBER accepted)
  // -------------------------------------------------------------
  try {
    const invalidRoles = ["OWNER", "SUPERADMIN", "REVIEWER", "GUEST", ""];
    let allRejected = true;

    for (const invalidRole of invalidRoles) {
      try {
        await updateWorkspaceMemberRole(workspace.id, owner.id, member1.id, invalidRole);
        allRejected = false;
      } catch (err: any) {
        if (err.statusCode !== 400) allRejected = false;
      }
    }

    assert(
      allRejected,
      "Test 7: Invalid roles (e.g., OWNER, SUPERADMIN, REVIEWER, empty) are rejected with 400 BAD_REQUEST"
    );
  } catch (err: any) {
    assert(false, "Test 7: Invalid roles are rejected", err.message);
  }

  // -------------------------------------------------------------
  // Test 8: Non-member target is rejected
  // -------------------------------------------------------------
  try {
    let nonMemberRejected = false;
    try {
      await updateWorkspaceMemberRole(workspace.id, owner.id, outsider.id, "ADMIN");
    } catch (err: any) {
      if (err.statusCode === 404) nonMemberRejected = true;
    }

    assert(
      nonMemberRejected,
      "Test 8: Changing role for a user who is not a member of the workspace returns 404 NOT_FOUND"
    );
  } catch (err: any) {
    assert(false, "Test 8: Non-member target rejected", err.message);
  }

  // -------------------------------------------------------------
  // Test 9: Non-existent workspace is rejected
  // -------------------------------------------------------------
  try {
    let wsRejected = false;
    const nonExistentWorkspaceId = randomUUID();
    try {
      await updateWorkspaceMemberRole(nonExistentWorkspaceId, owner.id, member1.id, "ADMIN");
    } catch (err: any) {
      if (err.statusCode === 404) wsRejected = true;
    }

    assert(
      wsRejected,
      "Test 9: Updating role in a non-existent workspace returns 404 NOT_FOUND"
    );
  } catch (err: any) {
    assert(false, "Test 9: Non-existent workspace rejected", err.message);
  }

  // -------------------------------------------------------------
  // Test 10: Audit Log entry is created on role update
  // -------------------------------------------------------------
  try {
    await updateWorkspaceMemberRole(workspace.id, owner.id, member1.id, "ADMIN");

    const audit = await db.auditLog.findFirst({
      where: {
        action: "WORKSPACE_MEMBER_ROLE_UPDATED",
        targetResource: `workspace:${workspace.id}`,
      },
      orderBy: { createdAt: "desc" },
    });

    assert(
      audit !== null &&
      audit.userId === owner.id &&
      audit.details?.targetUserId === member1.id &&
      audit.details?.oldRole === "MEMBER" &&
      audit.details?.newRole === "ADMIN",
      "Test 10: AuditLog correctly records old and new roles, requester ID, target ID, and workspace ID"
    );
  } catch (err: any) {
    assert(false, "Test 10: Audit Log verification", err.message);
  }

  console.log("\n--- PART 2: PERMISSION CONSISTENCY & RBAC TESTS ---\n");

  // -------------------------------------------------------------
  // Test 11: Promotion & demotion dynamically update effective website permissions
  // -------------------------------------------------------------
  try {
    // 1. Currently member1 is ADMIN (from Test 10)
    const adminCanPublish = await canUserAccessResource(member1.id, wsWebsite.id, "*", "PUBLISH");
    const adminCanRollback = await canUserAccessResource(member1.id, wsWebsite.id, "*", "ROLLBACK");
    const adminCanEdit = await canUserAccessResource(member1.id, wsWebsite.id, "*", "EDIT");

    // 2. Demote member1 to MEMBER
    await updateWorkspaceMemberRole(workspace.id, owner.id, member1.id, "MEMBER");

    // 3. Now member1 should map to REVIEWER (zero publish, zero rollback, zero edit)
    const memberCanPublish = await canUserAccessResource(member1.id, wsWebsite.id, "*", "PUBLISH");
    const memberCanRollback = await canUserAccessResource(member1.id, wsWebsite.id, "*", "ROLLBACK");
    const memberCanEdit = await canUserAccessResource(member1.id, wsWebsite.id, "*", "EDIT");
    const memberCanView = await canUserAccessResource(member1.id, wsWebsite.id, "*", "VIEW");

    assert(
      adminCanPublish === true &&
      adminCanRollback === true &&
      adminCanEdit === true &&
      memberCanPublish === false &&
      memberCanRollback === false &&
      memberCanEdit === false &&
      memberCanView === true,
      "Test 11: Workspace ADMIN has PUBLISH/ROLLBACK capabilities; demoting to MEMBER restricts to REVIEWER (zero publish/rollback)"
    );
  } catch (err: any) {
    assert(false, "Test 11: Permission consistency", err.message);
  }

  console.log("\n--- PART 3: HTTP ROUTE INTEGRATION TESTS ---\n");

  // Session helper
  async function createSession(userId: string): Promise<string> {
    const rawToken = randomUUID();
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return rawToken;
  }

  const ownerToken = await createSession(owner.id);
  const adminToken = await createSession(admin.id);
  const memberToken = await createSession(member1.id);
  const outsiderToken = await createSession(outsider.id);

  // -------------------------------------------------------------
  // Test 12: [HTTP Route] Unauthenticated request returns 401
  // -------------------------------------------------------------
  try {
    const unauth = await requestApp(
      app,
      "PATCH",
      `/api/v1/workspaces/${workspace.id}/members/${member1.id}`,
      undefined,
      { role: "ADMIN" }
    );

    assert(
      unauth.status === 401,
      "Test 12: [HTTP Route] PATCH /api/v1/workspaces/:id/members/:userId requires authentication (401 UNAUTHORIZED)"
    );
  } catch (err: any) {
    assert(false, "Test 12: Unauthenticated HTTP request", err.message);
  }

  // -------------------------------------------------------------
  // Test 13: [HTTP Route] Unauthorized outsider returns 403
  // -------------------------------------------------------------
  try {
    const outsiderRes = await requestApp(
      app,
      "PATCH",
      `/api/v1/workspaces/${workspace.id}/members/${member1.id}`,
      outsiderToken,
      { role: "ADMIN" }
    );

    assert(
      outsiderRes.status === 403,
      "Test 13: [HTTP Route] Non-workspace user cannot update member roles (403 FORBIDDEN)"
    );
  } catch (err: any) {
    assert(false, "Test 13: Unauthorized outsider HTTP request", err.message);
  }

  // -------------------------------------------------------------
  // Test 14: [HTTP Route] Ordinary member returns 403
  // -------------------------------------------------------------
  try {
    const memberRes = await requestApp(
      app,
      "PATCH",
      `/api/v1/workspaces/${workspace.id}/members/${member2.id}`,
      memberToken,
      { role: "ADMIN" }
    );

    assert(
      memberRes.status === 403,
      "Test 14: [HTTP Route] Ordinary workspace member cannot update member roles (403 FORBIDDEN)"
    );
  } catch (err: any) {
    assert(false, "Test 14: Ordinary member HTTP request", err.message);
  }

  // -------------------------------------------------------------
  // Test 15: [HTTP Route] Invalid role in HTTP body returns 400
  // -------------------------------------------------------------
  try {
    const badRoleRes = await requestApp(
      app,
      "PATCH",
      `/api/v1/workspaces/${workspace.id}/members/${member1.id}`,
      ownerToken,
      { role: "INVALID_ROLE" }
    );

    const missingRoleRes = await requestApp(
      app,
      "PATCH",
      `/api/v1/workspaces/${workspace.id}/members/${member1.id}`,
      ownerToken,
      {}
    );

    assert(
      badRoleRes.status === 400 && missingRoleRes.status === 400,
      "Test 15: [HTTP Route] Invalid or missing role in HTTP request body returns 400 BAD_REQUEST"
    );
  } catch (err: any) {
    assert(false, "Test 15: Invalid HTTP role payload", err.message);
  }

  // -------------------------------------------------------------
  // Test 16: [HTTP Route] Owner promotes member via HTTP returns 200
  // -------------------------------------------------------------
  try {
    const promoRes = await requestApp(
      app,
      "PATCH",
      `/api/v1/workspaces/${workspace.id}/members/${member1.id}`,
      ownerToken,
      { role: "ADMIN" }
    );

    assert(
      promoRes.status === 200 &&
      promoRes.body.success === true &&
      promoRes.body.member.role === "ADMIN" &&
      promoRes.body.member.user.email === member1Email,
      "Test 16: [HTTP Route] Workspace owner can successfully promote a member via PATCH endpoint (200 OK)"
    );
  } catch (err: any) {
    assert(false, "Test 16: Owner HTTP promotion", err.message);
  }

  // -------------------------------------------------------------
  // Test 17: [HTTP Route] Admin demotes member via HTTP returns 200
  // -------------------------------------------------------------
  try {
    const demoRes = await requestApp(
      app,
      "PATCH",
      `/api/v1/workspaces/${workspace.id}/members/${member1.id}`,
      adminToken,
      { role: "MEMBER" }
    );

    assert(
      demoRes.status === 200 &&
      demoRes.body.success === true &&
      demoRes.body.member.role === "MEMBER",
      "Test 17: [HTTP Route] Workspace admin can successfully demote a member via PATCH endpoint (200 OK)"
    );
  } catch (err: any) {
    assert(false, "Test 17: Admin HTTP demotion", err.message);
  }

  // -------------------------------------------------------------
  // Test 18: [HTTP Route] Demoting owner via HTTP returns 403
  // -------------------------------------------------------------
  try {
    const demoteOwnerRes = await requestApp(
      app,
      "PATCH",
      `/api/v1/workspaces/${workspace.id}/members/${owner.id}`,
      adminToken,
      { role: "MEMBER" }
    );

    assert(
      demoteOwnerRes.status === 403,
      "Test 18: [HTTP Route] Attempting to demote the workspace owner via HTTP returns 403 FORBIDDEN"
    );
  } catch (err: any) {
    assert(false, "Test 18: Demoting owner via HTTP", err.message);
  }

  // Cleanup test data
  try {
    await db.auditLog.deleteMany({ where: { targetResource: `workspace:${workspace.id}` } });
    await db.website.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.session.deleteMany({
      where: { userId: { in: [owner.id, admin.id, member1.id, member2.id, outsider.id] } },
    });
    await db.user.deleteMany({
      where: { id: { in: [owner.id, admin.id, member1.id, member2.id, outsider.id] } },
    });
  } catch (cleanErr) {
    console.warn("Cleanup warning:", cleanErr);
  }

  console.log("\n=================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runRoleManagementTests().catch((err) => {
  console.error("FATAL ERROR IN TEST RUNNER:", err);
  process.exit(1);
});
