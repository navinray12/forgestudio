/**
 * Feature 19 — Team Invitations: Comprehensive Verification Test Suite
 *
 * Test Classification:
 * - PART 1 (Tests 1–10): Service-level direct tests (testing service logic and database state directly).
 * - PART 2 (Tests 11–17): HTTP Route Integration tests (invoking the Express app with session authentication cookies).
 *
 * Verifies:
 * 1. Authorized invitation creation: Workspace owner and admin can invite registered users.
 * 2. Unauthorized invitation creation: Non-admin workspace member or non-member is rejected with 403 FORBIDDEN.
 * 3. Invalid invitee rejection: Attempting to invite an unregistered email is rejected with 404 USER_NOT_FOUND.
 * 4. Duplicate invitation prevention: Sending a second active invitation to the same email is blocked with 400 BAD_REQUEST.
 * 5. Already-member rejection: Attempting to invite someone who is already a workspace member is rejected with 400 BAD_REQUEST.
 * 6. Pending invitation listing: Workspace admin can list sent invitations; invitee can list their pending invitations.
 * 7. Acceptance by intended invitee: Creates WorkspaceMember with specified role and marks invitation ACCEPTED.
 * 8. Rejection when another user attempts acceptance: Mismatched user receives 403 FORBIDDEN.
 * 9. Idempotent acceptance / double acceptance: Calling accept a second time handles state safely without duplicate records.
 * 10. Decline workflow: Intended invitee can decline, status updates to DECLINED, no membership created.
 * 11. Cancellation workflow: Workspace owner/admin can cancel pending invitation, no membership created.
 * 12. Expired & invalid invitations: Expired invitations and unknown tokens/IDs are rejected with 400 / 404.
 * 13. RBAC isolation & permissions: Invited MEMBER gets REVIEWER permissions on websites (zero publish, zero rollback).
 * 14. [HTTP Route] GET /api/v1/workspaces/invitations/pending: Unauthenticated is 401; authenticated returns pending list.
 * 15. [HTTP Route] POST /api/v1/workspaces/:id/invitations: Owner can invite (201); outsider is rejected (403).
 * 16. [HTTP Route] POST /api/v1/workspaces/invitations/:inviteId/accept: Intended user accepts (200); unauthorized is rejected (403).
 * 17. [HTTP Route] Feature 18 regression: Newly accepted workspace is returned in listWorkspaces and website access respects isolation.
 */

import { randomUUID, createHash } from "crypto";
import { prisma } from "../config/prisma.js";
import app from "../app.js";
import {
  createWorkspace,
  addWorkspaceMember,
  getUserWorkspaces,
  inviteWorkspaceMember,
  getWorkspaceInvitations,
  getMyPendingWorkspaceInvitations,
  acceptWorkspaceInvitation,
  declineWorkspaceInvitation,
  cancelWorkspaceInvitation,
  initWorkspaceTables,
} from "../services/workspace.service.js";
import {
  createWebsite,
  getWebsiteById,
  getUserWebsites,
} from "../services/website.service.js";
import { changeUserPlan } from "../services/subscription.service.js";
import { canUserAccessResource } from "../services/permission.service.js";
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

async function runTeamInvitationsTests() {
  console.log("=================================================");
  console.log("FEATURE 19 — TEAM INVITATIONS VERIFICATION TESTS");
  console.log("=================================================\n");

  await initWorkspaceTables();

  const testSuffix = randomUUID().substring(0, 8);
  const ownerEmail = `ws-owner-${testSuffix}@test.com`;
  const adminEmail = `ws-admin-${testSuffix}@test.com`;
  const invitee1Email = `ws-invitee1-${testSuffix}@test.com`;
  const invitee2Email = `ws-invitee2-${testSuffix}@test.com`;
  const outsiderEmail = `ws-outsider-${testSuffix}@test.com`;

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

  const invitee1 = await db.user.create({
    data: {
      email: invitee1Email,
      fullName: "Invitee One",
      passwordHash: "hash123",
      emailVerified: true,
    },
  });

  const invitee2 = await db.user.create({
    data: {
      email: invitee2Email,
      fullName: "Invitee Two",
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

  // Assign agency plan for websites
  await changeUserPlan(owner.id, "agency");

  // Create primary workspace
  const workspace = await createWorkspace(owner.id, `Studio Main ${testSuffix}`);
  // Add admin member directly
  await addWorkspaceMember(workspace.id, owner.id, admin.id, "ADMIN");

  // Create a website within workspace
  const wsWebsite = await createWebsite({
    userId: owner.id,
    name: `Workspace Project ${testSuffix}`,
    workspaceId: workspace.id,
  });

  console.log("--- PART 1: SERVICE-LEVEL TESTS ---\n");

  // -------------------------------------------------------------
  // Test 1: Authorized invitation creation by Owner and Admin
  // -------------------------------------------------------------
  let invite1Result: any = null;
  try {
    invite1Result = await inviteWorkspaceMember(workspace.id, owner.id, invitee1Email, "MEMBER");
    const adminInviteResult = await inviteWorkspaceMember(workspace.id, admin.id, invitee2Email, "ADMIN");

    assert(
      invite1Result.success === true &&
      invite1Result.invitation.email === invitee1Email &&
      invite1Result.invitation.role === "MEMBER" &&
      invite1Result.invitation.status === "PENDING" &&
      !invite1Result.invitation.tokenHash && // tokenHash hidden
      adminInviteResult.success === true &&
      adminInviteResult.invitation.role === "ADMIN",
      "Test 1: Workspace owner and admin can successfully invite registered users with specified roles"
    );
  } catch (err: any) {
    assert(false, "Test 1: Authorized invitation creation", err.message);
  }

  // -------------------------------------------------------------
  // Test 2: Unauthorized invitation creation (outsider / non-admin)
  // -------------------------------------------------------------
  try {
    let outsiderBlocked = false;
    try {
      await inviteWorkspaceMember(workspace.id, outsider.id, "someone@test.com", "MEMBER");
    } catch (err: any) {
      if (err.statusCode === 403) outsiderBlocked = true;
    }

    assert(
      outsiderBlocked,
      "Test 2: Unauthorized non-admin user is rejected with 403 FORBIDDEN when attempting to invite"
    );
  } catch (err: any) {
    assert(false, "Test 2: Unauthorized invitation creation", err.message);
  }

  // -------------------------------------------------------------
  // Test 3: Invalid invitee rejection (unregistered email)
  // -------------------------------------------------------------
  try {
    let unregBlocked = false;
    try {
      await inviteWorkspaceMember(workspace.id, owner.id, "nonexistent-user-999@test.com", "MEMBER");
    } catch (err: any) {
      if (err.statusCode === 404) unregBlocked = true;
    }

    assert(
      unregBlocked,
      "Test 3: Attempting to invite an unregistered email is rejected with 404 USER_NOT_FOUND"
    );
  } catch (err: any) {
    assert(false, "Test 3: Invalid invitee rejection", err.message);
  }

  // -------------------------------------------------------------
  // Test 4: Duplicate active invitation prevention
  // -------------------------------------------------------------
  try {
    let dupBlocked = false;
    try {
      // invitee1 already has an active pending invitation from Test 1
      await inviteWorkspaceMember(workspace.id, owner.id, invitee1Email, "MEMBER");
    } catch (err: any) {
      if (err.statusCode === 400) dupBlocked = true;
    }

    assert(
      dupBlocked,
      "Test 4: Sending duplicate active invitation to the same email is blocked with 400 BAD_REQUEST"
    );
  } catch (err: any) {
    assert(false, "Test 4: Duplicate active invitation prevention", err.message);
  }

  // -------------------------------------------------------------
  // Test 5: Already-member rejection
  // -------------------------------------------------------------
  try {
    let memberBlocked = false;
    try {
      // admin is already a workspace member
      await inviteWorkspaceMember(workspace.id, owner.id, adminEmail, "MEMBER");
    } catch (err: any) {
      if (err.statusCode === 400) memberBlocked = true;
    }

    assert(
      memberBlocked,
      "Test 5: Inviting a user who is already a workspace member is rejected with 400 BAD_REQUEST"
    );
  } catch (err: any) {
    assert(false, "Test 5: Already-member rejection", err.message);
  }

  // -------------------------------------------------------------
  // Test 6: Pending invitation listing (workspace list and user pending list)
  // -------------------------------------------------------------
  try {
    const wsInvites = await getWorkspaceInvitations(workspace.id, owner.id);
    const userPending = await getMyPendingWorkspaceInvitations(invitee1.id);

    assert(
      wsInvites.length >= 2 &&
      wsInvites.some((inv: any) => inv.email === invitee1Email) &&
      userPending.length >= 1 &&
      userPending[0].email === invitee1Email &&
      userPending[0].workspace.name.includes("Studio Main"),
      "Test 6: Workspace admin can list workspace invitations, and invitee can list their pending invitations"
    );
  } catch (err: any) {
    assert(false, "Test 6: Pending invitation listing", err.message);
  }

  // -------------------------------------------------------------
  // Test 7: Rejection when another user attempts acceptance
  // -------------------------------------------------------------
  try {
    let wrongUserBlocked = false;
    try {
      // outsider attempts to accept invite1 meant for invitee1
      await acceptWorkspaceInvitation(invite1Result.invitation.id, outsider.id);
    } catch (err: any) {
      if (err.statusCode === 403) wrongUserBlocked = true;
    }

    assert(
      wrongUserBlocked,
      "Test 7: Accepting an invitation intended for another user is blocked with 403 FORBIDDEN"
    );
  } catch (err: any) {
    assert(false, "Test 7: Rejection when another user attempts acceptance", err.message);
  }

  // -------------------------------------------------------------
  // Test 8: Acceptance by intended invitee
  // -------------------------------------------------------------
  let acceptResult: any = null;
  try {
    acceptResult = await acceptWorkspaceInvitation(invite1Result.invitation.id, invitee1.id);

    const membership = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: invitee1.id } },
    });

    const updatedInvite = await db.workspaceInvitation.findUnique({
      where: { id: invite1Result.invitation.id },
    });

    assert(
      acceptResult.success === true &&
      acceptResult.workspaceId === workspace.id &&
      acceptResult.role === "MEMBER" &&
      membership !== null &&
      membership.role === "MEMBER" &&
      updatedInvite.status === "ACCEPTED",
      "Test 8: Intended invitee accepts invitation: creates WorkspaceMember and marks invitation ACCEPTED"
    );
  } catch (err: any) {
    assert(false, "Test 8: Acceptance by intended invitee", err.message);
  }

  // -------------------------------------------------------------
  // Test 9: Accepting an invitation twice (idempotent / safe)
  // -------------------------------------------------------------
  try {
    let secondAcceptHandled = false;
    try {
      const res2 = await acceptWorkspaceInvitation(invite1Result.invitation.id, invitee1.id);
      if (res2.success) secondAcceptHandled = true;
    } catch (err: any) {
      // 400 is also acceptable if treated as "already accepted"
      if (err.statusCode === 400) secondAcceptHandled = true;
    }

    // Verify member count remains exactly 1 for this user
    const memberCount = await db.workspaceMember.count({
      where: { workspaceId: workspace.id, userId: invitee1.id },
    });

    assert(
      secondAcceptHandled && memberCount === 1,
      "Test 9: Accepting an invitation twice handles state safely without creating duplicate memberships"
    );
  } catch (err: any) {
    assert(false, "Test 9: Accepting twice", err.message);
  }

  // -------------------------------------------------------------
  // Test 10: Decline workflow
  // -------------------------------------------------------------
  try {
    // invitee2 declines their invitation
    const invite2Pending = await db.workspaceInvitation.findFirst({
      where: { workspaceId: workspace.id, email: invitee2Email, status: "PENDING" },
    });

    const declineRes = await declineWorkspaceInvitation(invite2Pending.id, invitee2.id);

    const invite2Membership = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: invitee2.id } },
    });

    const declinedInvite = await db.workspaceInvitation.findUnique({
      where: { id: invite2Pending.id },
    });

    assert(
      declineRes.success === true &&
      invite2Membership === null &&
      declinedInvite.status === "DECLINED",
      "Test 10: Declining an invitation marks it DECLINED and does NOT create workspace membership"
    );
  } catch (err: any) {
    assert(false, "Test 10: Decline workflow", err.message);
  }

  // -------------------------------------------------------------
  // Test 11: Cancellation workflow
  // -------------------------------------------------------------
  try {
    // Owner invites outsider, then cancels it
    const cancelTarget = await inviteWorkspaceMember(workspace.id, owner.id, outsiderEmail, "MEMBER");
    const cancelRes = await cancelWorkspaceInvitation(cancelTarget.invitation.id, owner.id);

    const cancelledInvite = await db.workspaceInvitation.findUnique({
      where: { id: cancelTarget.invitation.id },
    });

    let outsiderAcceptCancelled = false;
    try {
      await acceptWorkspaceInvitation(cancelTarget.invitation.id, outsider.id);
    } catch (err: any) {
      if (err.statusCode === 400) outsiderAcceptCancelled = true;
    }

    assert(
      cancelRes.success === true &&
      cancelledInvite.status === "CANCELLED" &&
      outsiderAcceptCancelled,
      "Test 11: Workspace owner can cancel an invitation, preventing subsequent acceptance"
    );
  } catch (err: any) {
    assert(false, "Test 11: Cancellation workflow", err.message);
  }

  // -------------------------------------------------------------
  // Test 12: Expired and invalid invitations
  // -------------------------------------------------------------
  try {
    // Create an expired invitation directly in DB
    const expiredInvite = await db.workspaceInvitation.create({
      data: {
        workspaceId: workspace.id,
        email: outsiderEmail,
        role: "MEMBER",
        tokenHash: createHash("sha256").update("expired-token-123").digest("hex"),
        status: "PENDING",
        expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        invitedBy: owner.id,
      },
    });

    let expiredRejected = false;
    try {
      await acceptWorkspaceInvitation(expiredInvite.id, outsider.id);
    } catch (err: any) {
      if (err.statusCode === 400) expiredRejected = true;
    }

    let fakeRejected = false;
    try {
      await acceptWorkspaceInvitation(randomUUID(), outsider.id);
    } catch (err: any) {
      if (err.statusCode === 404) fakeRejected = true;
    }

    assert(
      expiredRejected && fakeRejected,
      "Test 12: Expired invitations and non-existent IDs are properly rejected with 400 and 404"
    );
  } catch (err: any) {
    assert(false, "Test 12: Expired & invalid invitations", err.message);
  }

  // -------------------------------------------------------------
  // Test 13: RBAC isolation & permissions
  // -------------------------------------------------------------
  try {
    // invitee1 was invited as MEMBER -> gets REVIEWER on workspace website
    const site = await getWebsiteById(wsWebsite.id, invitee1.id);
    const canView = await canUserAccessResource(invitee1.id, wsWebsite.id, "*", "VIEW");
    const canPublish = await canUserAccessResource(invitee1.id, wsWebsite.id, "*", "PUBLISH");
    const canRollback = await canUserAccessResource(invitee1.id, wsWebsite.id, "*", "ROLLBACK");

    assert(
      site.userPermission === "REVIEWER" &&
      canView === true &&
      canPublish === false &&
      canRollback === false,
      "Test 13: Ordinary workspace member receives REVIEWER permissions with zero publish and zero rollback capabilities"
    );
  } catch (err: any) {
    assert(false, "Test 13: RBAC isolation & permissions", err.message);
  }

  console.log("\n--- PART 2: HTTP ROUTE INTEGRATION TESTS ---\n");

  // Helper to create session tokens for HTTP requests
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
  const outsiderToken = await createSession(outsider.id);

  // -------------------------------------------------------------
  // Test 14: [HTTP Route] GET /api/v1/workspaces/invitations/pending
  // -------------------------------------------------------------
  try {
    const unauth = await requestApp(app, "GET", "/api/v1/workspaces/invitations/pending");
    const auth = await requestApp(app, "GET", "/api/v1/workspaces/invitations/pending", ownerToken);

    assert(
      unauth.status === 401 &&
      auth.status === 200 &&
      Array.isArray(auth.body.invitations),
      "Test 14: [HTTP Route] GET /api/v1/workspaces/invitations/pending enforces authentication (401 unauth, 200 auth)"
    );
  } catch (err: any) {
    assert(false, "Test 14: HTTP Pending invitations route", err.message);
  }

  // -------------------------------------------------------------
  // Test 15: [HTTP Route] POST /api/v1/workspaces/:id/invitations
  // -------------------------------------------------------------
  let httpInviteId: string = "";
  try {
    // Outsider tries to invite -> 403
    const forbiddenRes = await requestApp(
      app,
      "POST",
      `/api/v1/workspaces/${workspace.id}/invitations`,
      outsiderToken,
      { email: outsiderEmail, role: "MEMBER" }
    );

    // Owner invites outsider -> 201
    const allowedRes = await requestApp(
      app,
      "POST",
      `/api/v1/workspaces/${workspace.id}/invitations`,
      ownerToken,
      { email: outsiderEmail, role: "MEMBER" }
    );

    httpInviteId = allowedRes.body?.invitation?.id || "";

    assert(
      forbiddenRes.status === 403 &&
      allowedRes.status === 201 &&
      allowedRes.body?.invitation?.email === outsiderEmail,
      "Test 15: [HTTP Route] POST /api/v1/workspaces/:id/invitations blocks outsiders with 403 and creates invite with 201"
    );
  } catch (err: any) {
    assert(false, "Test 15: HTTP Invite creation route", err.message);
  }

  // -------------------------------------------------------------
  // Test 16: [HTTP Route] POST /api/v1/workspaces/invitations/:inviteId/accept
  // -------------------------------------------------------------
  try {
    // Wrong user (admin) tries to accept outsider's invite -> 403
    const adminToken = await createSession(admin.id);
    const wrongUserRes = await requestApp(
      app,
      "POST",
      `/api/v1/workspaces/invitations/${httpInviteId}/accept`,
      adminToken
    );

    // Outsider accepts their own invite -> 200
    const correctUserRes = await requestApp(
      app,
      "POST",
      `/api/v1/workspaces/invitations/${httpInviteId}/accept`,
      outsiderToken
    );

    assert(
      wrongUserRes.status === 403 &&
      correctUserRes.status === 200 &&
      correctUserRes.body?.success === true,
      "Test 16: [HTTP Route] POST /api/v1/workspaces/invitations/:inviteId/accept enforces invitee verification (403 for wrong user, 200 for intended)"
    );
  } catch (err: any) {
    assert(false, "Test 16: HTTP Accept invitation route", err.message);
  }

  // -------------------------------------------------------------
  // Test 17: [HTTP Route] Feature 18 regression: Workspace list & website access
  // -------------------------------------------------------------
  try {
    // Outsider now belongs to the workspace
    const wsListRes = await requestApp(app, "GET", "/api/v1/workspaces", outsiderToken);
    const sitesRes = await requestApp(app, "GET", `/api/websites?workspaceId=${workspace.id}`, outsiderToken);

    assert(
      wsListRes.status === 200 &&
      wsListRes.body.workspaces.some((w: any) => w.id === workspace.id) &&
      sitesRes.status === 200 &&
      sitesRes.body.websites.some((s: any) => s.id === wsWebsite.id),
      "Test 17: [HTTP Route] Feature 18 Regression: Accepted workspace immediately appears in workspace list and website access is authorized"
    );
  } catch (err: any) {
    assert(false, "Test 17: HTTP Regression route", err.message);
  }

  // Cleanup test data
  try {
    await db.workspaceInvitation.deleteMany({ where: { workspaceId: workspace.id } });
    await db.website.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.session.deleteMany({
      where: { userId: { in: [owner.id, admin.id, invitee1.id, invitee2.id, outsider.id] } },
    });
    await db.user.deleteMany({
      where: { id: { in: [owner.id, admin.id, invitee1.id, invitee2.id, outsider.id] } },
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

runTeamInvitationsTests().catch((err) => {
  console.error("FATAL ERROR IN TEST RUNNER:", err);
  process.exit(1);
});
