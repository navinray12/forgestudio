import http from "http";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { createUserSession } from "../src/services/session.service.js";
import { hashPassword } from "../src/utils/password.js";
import { AUTH_COOKIE_NAME } from "../src/config/auth.js";
import {
  CANONICAL_GLOBAL_ROLES,
  CANONICAL_PROJECT_ROLES,
  normalizeGlobalRole,
  normalizeProjectRole,
  canAssignGlobalRole,
  canAssignProjectRole,
  DEFAULT_CAPABILITIES,
  canUserAccessResource,
} from "../src/services/permission.service.js";

const db = prisma as any;

export async function runPhase3AuthRbacTestSuite() {
  console.log("================================================================");
  console.log("   FORGESTUDIO PHASE 3 — AUTH, ORGANIZATIONS & 7+7 RBAC SUITE   ");
  console.log("================================================================\n");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5098, resolve));
  const baseUrl = "http://localhost:5098";

  let passedCount = 0;
  let failedCount = 0;

  function logPass(title: string, details?: string) {
    passedCount++;
    console.log(`[PASSED] ${title}${details ? ` -> ${details}` : ""}`);
  }

  function logFail(title: string, error?: any) {
    failedCount++;
    console.error(`[FAILED] ${title} -> ${error?.message || JSON.stringify(error)}`);
  }

  // Test entities
  let superAdminUser: any = null;
  let superAdminCookie = "";
  let platformAdminUser: any = null;
  let platformAdminCookie = "";
  let customerUser1: any = null;
  let customerCookie1 = "";
  let customerUser2: any = null;
  let customerCookie2 = "";
  let teamMemberUser: any = null;
  let teamMemberCookie = "";

  let org1: any = null;
  let ws1: any = null;
  let site1: any = null;

  let org2: any = null;
  let ws2: any = null;
  let site2: any = null;

  try {
    // -------------------------------------------------------------------------
    // Setup Test Data
    // -------------------------------------------------------------------------
    console.log("Setting up Phase 3 isolated test tenants...");
    const testPasswordHash = await hashPassword("AuthRbacTest123!");

    const testEmails = [
      "p3_superadmin@example.com",
      "p3_platformadmin@example.com",
      "p3_customer1@example.com",
      "p3_customer2@example.com",
      "p3_teammember@example.com",
    ];

    await db.user.deleteMany({ where: { email: { in: testEmails } } }).catch(() => {});

    superAdminUser = await db.user.create({
      data: {
        email: "p3_superadmin@example.com",
        fullName: "Phase3 Super Admin",
        passwordHash: testPasswordHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });
    const sSession = await createUserSession(superAdminUser.id);
    superAdminCookie = `${AUTH_COOKIE_NAME}=${sSession.token}`;

    platformAdminUser = await db.user.create({
      data: {
        email: "p3_platformadmin@example.com",
        fullName: "Phase3 Platform Admin",
        passwordHash: testPasswordHash,
        role: "PLATFORM_ADMIN",
        status: "ACTIVE",
      },
    });
    const paSession = await createUserSession(platformAdminUser.id);
    platformAdminCookie = `${AUTH_COOKIE_NAME}=${paSession.token}`;

    customerUser1 = await db.user.create({
      data: {
        email: "p3_customer1@example.com",
        fullName: "Tenant One Customer",
        passwordHash: testPasswordHash,
        role: "USER",
        status: "ACTIVE",
      },
    });
    const c1Session = await createUserSession(customerUser1.id);
    customerCookie1 = `${AUTH_COOKIE_NAME}=${c1Session.token}`;

    customerUser2 = await db.user.create({
      data: {
        email: "p3_customer2@example.com",
        fullName: "Tenant Two Customer",
        passwordHash: testPasswordHash,
        role: "USER",
        status: "ACTIVE",
      },
    });
    const c2Session = await createUserSession(customerUser2.id);
    customerCookie2 = `${AUTH_COOKIE_NAME}=${c2Session.token}`;

    teamMemberUser = await db.user.create({
      data: {
        email: "p3_teammember@example.com",
        fullName: "Team Member Collaborator",
        passwordHash: testPasswordHash,
        role: "TEAM_MEMBER",
        status: "ACTIVE",
      },
    });
    const tmSession = await createUserSession(teamMemberUser.id);
    teamMemberCookie = `${AUTH_COOKIE_NAME}=${tmSession.token}`;

    // Tenant 1 Org, Workspace, Site
    org1 = await db.organization.create({
      data: {
        name: "Tenant 1 Organization",
        slug: `t1-org-${Date.now()}`,
        ownerId: customerUser1.id,
        members: { create: { userId: customerUser1.id, role: "OWNER" } },
      },
    });

    ws1 = await db.workspace.create({
      data: {
        name: "Tenant 1 Workspace",
        slug: `t1-ws-${Date.now()}`,
        ownerId: customerUser1.id,
        organizationId: org1.id,
        members: { create: { userId: customerUser1.id, role: "OWNER" } },
      },
    });

    site1 = await db.website.create({
      data: {
        name: "Tenant 1 Website",
        slug: `t1-site-${Date.now()}`,
        userId: customerUser1.id,
        workspaceId: ws1.id,
        organizationId: org1.id,
        status: "DRAFT",
        moderationStatus: "ACTIVE",
      },
    });

    // Tenant 2 Org, Workspace, Site
    org2 = await db.organization.create({
      data: {
        name: "Tenant 2 Organization",
        slug: `t2-org-${Date.now()}`,
        ownerId: customerUser2.id,
        members: { create: { userId: customerUser2.id, role: "OWNER" } },
      },
    });

    ws2 = await db.workspace.create({
      data: {
        name: "Tenant 2 Workspace",
        slug: `t2-ws-${Date.now()}`,
        ownerId: customerUser2.id,
        organizationId: org2.id,
        members: { create: { userId: customerUser2.id, role: "OWNER" } },
      },
    });

    site2 = await db.website.create({
      data: {
        name: "Tenant 2 Website",
        slug: `t2-site-${Date.now()}`,
        userId: customerUser2.id,
        workspaceId: ws2.id,
        organizationId: org2.id,
        status: "DRAFT",
        moderationStatus: "ACTIVE",
      },
    });

    logPass("Setup: Test tenants, organizations, workspaces, and websites initialized");

    // -------------------------------------------------------------------------
    // GROUP A: CANONICAL 7+7 ROLE MATRIX & CAPABILITIES
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP A: CANONICAL 7+7 ROLE MATRIX & CAPABILITIES ---");

    // A1: Canonical Global Roles verification
    const expectedGlobalRoles = [
      "SUPER_ADMIN",
      "PLATFORM_ADMIN",
      "SUPPORT_ADMIN",
      "DEVELOPER",
      "AI_CONTENT_ADMIN",
      "CUSTOMER",
      "TEAM_MEMBER",
    ];
    const allGlobalPresent = expectedGlobalRoles.every((r) =>
      CANONICAL_GLOBAL_ROLES.includes(r as any)
    );
    if (allGlobalPresent && CANONICAL_GLOBAL_ROLES.length === 7) {
      logPass("A1. Canonical 7 Global Roles defined and verified");
    } else {
      logFail("A1. Global roles discrepancy", CANONICAL_GLOBAL_ROLES);
    }

    // A2: Global role normalization and legacy aliases
    const normalizesAdmin = normalizeGlobalRole("ADMIN") === "PLATFORM_ADMIN";
    const normalizesUser = normalizeGlobalRole("USER") === "CUSTOMER";
    const normalizesDirect = normalizeGlobalRole("DEVELOPER") === "DEVELOPER";
    if (normalizesAdmin && normalizesUser && normalizesDirect) {
      logPass("A2. Global role normalization maps legacy ADMIN->PLATFORM_ADMIN and USER->CUSTOMER");
    } else {
      logFail("A2. Global role normalization failed");
    }

    // A3: Canonical 7 Project Roles verification
    const expectedProjectRoles = [
      "OWNER",
      "ADMIN",
      "DESIGNER",
      "DEVELOPER",
      "CONTENT_EDITOR",
      "SEO_MANAGER",
      "VIEWER",
    ];
    const allProjectPresent = expectedProjectRoles.every((r) =>
      CANONICAL_PROJECT_ROLES.includes(r as any)
    );
    if (allProjectPresent && CANONICAL_PROJECT_ROLES.length === 7) {
      logPass("A3. Canonical 7 Project Roles defined and verified");
    } else {
      logFail("A3. Project roles discrepancy", CANONICAL_PROJECT_ROLES);
    }

    // A4: Project role normalization and legacy aliases
    const normalizesProjOwner = normalizeProjectRole("PROJECT_OWNER") === "OWNER";
    const normalizesProjAdmin = normalizeProjectRole("PROJECT_ADMIN") === "ADMIN";
    const normalizesReviewer = normalizeProjectRole("REVIEWER") === "VIEWER";
    const normalizesClient = normalizeProjectRole("CLIENT") === "VIEWER";
    if (normalizesProjOwner && normalizesProjAdmin && normalizesReviewer && normalizesClient) {
      logPass("A4. Project role normalization maps legacy aliases (PROJECT_ADMIN, REVIEWER, CLIENT)");
    } else {
      logFail("A4. Project role normalization failed");
    }

    // A5: Capability matrix covers all 7 project roles
    const capsOwner = DEFAULT_CAPABILITIES.OWNER.includes("DELETE") && DEFAULT_CAPABILITIES.OWNER.includes("PUBLISH");
    const capsAdmin = !DEFAULT_CAPABILITIES.ADMIN.includes("DELETE") && DEFAULT_CAPABILITIES.ADMIN.includes("PUBLISH");
    const capsDesigner = DEFAULT_CAPABILITIES.DESIGNER.includes("EDIT_DESIGN") && !DEFAULT_CAPABILITIES.DESIGNER.includes("CUSTOM_CODE");
    const capsDeveloper = DEFAULT_CAPABILITIES.DEVELOPER.includes("CUSTOM_CODE") && DEFAULT_CAPABILITIES.DEVELOPER.includes("SFTP_ACCESS");
    const capsEditor = DEFAULT_CAPABILITIES.CONTENT_EDITOR.includes("EDIT_CONTENT") && !DEFAULT_CAPABILITIES.CONTENT_EDITOR.includes("EDIT_DESIGN");
    const capsSeo = DEFAULT_CAPABILITIES.SEO_MANAGER.includes("EDIT_SEO") && !DEFAULT_CAPABILITIES.SEO_MANAGER.includes("CUSTOM_CODE");
    const capsViewer = DEFAULT_CAPABILITIES.VIEWER.includes("VIEW") && !DEFAULT_CAPABILITIES.VIEWER.includes("EDIT_CONTENT");

    if (capsOwner && capsAdmin && capsDesigner && capsDeveloper && capsEditor && capsSeo && capsViewer) {
      logPass("A5. Distinct capabilities authoritatively mapped across all 7 project roles");
    } else {
      logFail("A5. Capability mapping validation failed");
    }

    // -------------------------------------------------------------------------
    // GROUP B: CROSS-TENANT & WORKSPACE ISOLATION
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP B: CROSS-TENANT & WORKSPACE ISOLATION ---");

    // B1: Tenant 2 cannot access Tenant 1 website details
    try {
      const res = await fetch(`${baseUrl}/api/websites/${site1.id}`, {
        headers: { Cookie: customerCookie2 },
      });
      if (res.status === 404 || res.status === 403) {
        logPass("B1. Cross-tenant website access rejected (404/403 IDOR blocked)");
      } else {
        logFail("B1. Cross-tenant website access allowed", `Status: ${res.status}`);
      }
    } catch (e) {
      logFail("B1. Cross-tenant website", e);
    }

    // B2: Tenant 2 cannot view Tenant 1 workspace
    try {
      const res = await fetch(`${baseUrl}/api/v1/workspaces/${ws1.id}`, {
        headers: { Cookie: customerCookie2 },
      });
      if (res.status === 404 || res.status === 403) {
        logPass("B2. Cross-tenant workspace access rejected (404/403)");
      } else {
        logFail("B2. Cross-tenant workspace access allowed", `Status: ${res.status}`);
      }
    } catch (e) {
      logFail("B2. Cross-tenant workspace", e);
    }

    // B3: Workspace isolation: querying websites with foreign workspaceId returns 403
    try {
      const res = await fetch(`${baseUrl}/api/websites?workspaceId=${ws1.id}`, {
        headers: { Cookie: customerCookie2 },
      });
      if (res.status === 403) {
        logPass("B3. Foreign workspaceId in website query rejected (403 FORBIDDEN)");
      } else {
        logFail("B3. Foreign workspaceId allowed", `Status: ${res.status}`);
      }
    } catch (e) {
      logFail("B3. Foreign workspace query", e);
    }

    // B4: Legitimate workspace filtering returns tenant's workspace websites
    try {
      const res = await fetch(`${baseUrl}/api/websites?workspaceId=${ws1.id}`, {
        headers: { Cookie: customerCookie1 },
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success && json.websites.length === 1 && json.websites[0].id === site1.id) {
        logPass("B4. Authorized workspace filtering returns isolated workspace websites");
      } else {
        logFail("B4. Authorized workspace filter failed", json);
      }
    } catch (e) {
      logFail("B4. Authorized workspace filter", e);
    }

    // -------------------------------------------------------------------------
    // GROUP C: PRIVILEGE ESCALATION PREVENTION
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP C: PRIVILEGE ESCALATION PREVENTION ---");

    // C1: Normal user cannot assign global Admin role
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/admin/users/${customerUser1.id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: customerCookie1 },
        body: JSON.stringify({ role: "SUPER_ADMIN" }),
      });
      if (res.status === 403) {
        logPass("C1. Normal user self-escalation attempt blocked (403 FORBIDDEN)");
      } else {
        logFail("C1. Normal user privilege escalation allowed", `Status: ${res.status}`);
      }
    } catch (e) {
      logFail("C1. User self-escalation", e);
    }

    // C2: Platform Admin cannot escalate a user to SUPER_ADMIN
    try {
      const res = await fetch(`${baseUrl}/api/v1/operations/admin/users/${customerUser2.id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: platformAdminCookie },
        body: JSON.stringify({ role: "SUPER_ADMIN" }),
      });
      if (res.status === 403) {
        logPass("C2. Admin cannot grant Super Admin role (403 FORBIDDEN)");
      } else {
        logFail("C2. Admin escalating to Super Admin should be blocked", `Status: ${res.status}`);
      }
    } catch (e) {
      logFail("C2. Admin escalating to Super Admin", e);
    }

    // C3: Protection for the last active Super Admin
    const demoteCheck = canAssignGlobalRole("SUPER_ADMIN", "SUPER_ADMIN", "USER", true);
    if (!demoteCheck.allowed && demoteCheck.reason?.includes("last remaining Super Admin")) {
      logPass("C3. Protection for last Super Admin from lockout/demotion verified");
    } else {
      logFail("C3. Last Super Admin protection failed", demoteCheck);
    }

    // C4: Project Collaborator cannot escalate to OWNER
    const assignOwnerCheck = canAssignProjectRole("ADMIN", "DESIGNER", "OWNER");
    if (!assignOwnerCheck.allowed) {
      logPass("C4. Project Admin prevented from granting OWNER role");
    } else {
      logFail("C4. Project Admin should not be able to assign OWNER");
    }

    // C5: Project Admin cannot modify peer Admin
    const peerAdminCheck = canAssignProjectRole("ADMIN", "ADMIN", "DESIGNER");
    if (!peerAdminCheck.allowed) {
      logPass("C5. Project Admin prevented from demoting peer Admin");
    } else {
      logFail("C5. Peer admin modification should be blocked");
    }

    // -------------------------------------------------------------------------
    // GROUP D: ROLE & MEMBER LIFECYCLE (7 PROJECT ROLES)
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP D: ROLE & MEMBER LIFECYCLE (7 PROJECT ROLES) ---");

    // D1: Invite member to project with DEVELOPER role
    let inviteToken = "";
    try {
      const res = await fetch(`${baseUrl}/api/websites/${site1.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: customerCookie1 },
        body: JSON.stringify({ email: teamMemberUser.email, role: "DEVELOPER" }),
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success && json.token) {
        inviteToken = json.token;
        logPass("D1. Owner invites collaborator with DEVELOPER project role");
      } else {
        logFail("D1. Invite member failed", json);
      }
    } catch (e) {
      logFail("D1. Invite member", e);
    }

    // D2: Accept invitation
    try {
      const res = await fetch(`${baseUrl}/api/websites/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: teamMemberCookie },
        body: JSON.stringify({ token: inviteToken }),
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success) {
        logPass("D2. Collaborator accepts invitation and joins project");
      } else {
        logFail("D2. Accept invitation failed", json);
      }
    } catch (e) {
      logFail("D2. Accept invitation", e);
    }

    // D3: Read roles list
    try {
      const res = await fetch(`${baseUrl}/api/websites/${site1.id}/roles`, {
        headers: { Cookie: customerCookie1 },
      });
      const json: any = await res.json();
      const members = json.roles?.members || json.members;
      const devMember = members?.find((m: any) => m.id === teamMemberUser.id);
      if (res.status === 200 && devMember && devMember.role === "DEVELOPER") {
        logPass("D3. GET /roles returns members with canonical DEVELOPER role");
      } else {
        logFail("D3. Get roles failed", json);
      }
    } catch (e) {
      logFail("D3. Get roles", e);
    }

    // D4: Update role from DEVELOPER to SEO_MANAGER
    try {
      const res = await fetch(`${baseUrl}/api/websites/${site1.id}/roles/${teamMemberUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: customerCookie1 },
        body: JSON.stringify({ role: "SEO_MANAGER" }),
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success) {
        logPass("D4. Owner updates collaborator role to SEO_MANAGER");
      } else {
        logFail("D4. Update role failed", json);
      }
    } catch (e) {
      logFail("D4. Update role", e);
    }

    // D5: Check effective permissions endpoint reflects SEO_MANAGER capabilities
    try {
      const res = await fetch(`${baseUrl}/api/websites/${site1.id}/effective-permissions`, {
        headers: { Cookie: teamMemberCookie },
      });
      const json: any = await res.json();
      if (
        res.status === 200 &&
        json.success &&
        json.role === "SEO_MANAGER" &&
        json.capabilities.includes("EDIT_SEO") &&
        !json.capabilities.includes("CUSTOM_CODE")
      ) {
        logPass("D5. GET /effective-permissions accurately reports role capabilities");
      } else {
        logFail("D5. Effective permissions check failed", json);
      }
    } catch (e) {
      logFail("D5. Effective permissions", e);
    }

    // D6: Granular Permission explicit ALLOW grants PUBLISH to SEO_MANAGER
    try {
      const res = await fetch(`${baseUrl}/api/websites/${site1.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: customerCookie1 },
        body: JSON.stringify({
          targetUserId: teamMemberUser.id,
          resourceId: "*",
          capability: "PUBLISH",
          effect: "ALLOW",
        }),
      });
      const json: any = await res.json();
      const canPublish = await canUserAccessResource(teamMemberUser.id, site1.id, "*", "PUBLISH");
      if (res.status === 200 && json.success && canPublish) {
        logPass("D6. GranularPermission ALLOW override grants capability to collaborator");
      } else {
        logFail("D6. Granular ALLOW failed", json);
      }
    } catch (e) {
      logFail("D6. Granular ALLOW", e);
    }

    // D7: Granular Permission explicit DENY revokes EDIT_SEO from SEO_MANAGER (DENY overrides role defaults)
    try {
      const res = await fetch(`${baseUrl}/api/websites/${site1.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: customerCookie1 },
        body: JSON.stringify({
          targetUserId: teamMemberUser.id,
          resourceId: "*",
          capability: "EDIT_SEO",
          effect: "DENY",
        }),
      });
      const json: any = await res.json();
      const canEditSeo = await canUserAccessResource(teamMemberUser.id, site1.id, "*", "EDIT_SEO");
      if (res.status === 200 && json.success && !canEditSeo) {
        logPass("D7. GranularPermission DENY override strictly revokes capability (DENY overrides role defaults)");
      } else {
        logFail("D7. Granular DENY failed", { json, canEditSeo });
      }
    } catch (e) {
      logFail("D7. Granular DENY", e);
    }

    // D8: Remove collaborator and verify immediate access termination
    try {
      const res = await fetch(`${baseUrl}/api/websites/${site1.id}/members/${teamMemberUser.id}`, {
        method: "DELETE",
        headers: { Cookie: customerCookie1 },
      });
      const json: any = await res.json();
      const resAccess = await fetch(`${baseUrl}/api/websites/${site1.id}`, {
        headers: { Cookie: teamMemberCookie },
      });
      if (res.status === 200 && json.success && (resAccess.status === 404 || resAccess.status === 403)) {
        logPass("D8. Removing collaborator deletes membership and immediately terminates access");
      } else {
        logFail("D8. Remove member failed", { json, accessStatus: resAccess.status });
      }
    } catch (e) {
      logFail("D8. Remove member", e);
    }

    // -------------------------------------------------------------------------
    // GROUP E: AUTHENTICATION & SESSION LIFECYCLE
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP E: AUTHENTICATION & SESSION LIFECYCLE ---");

    // E1: Valid session access
    try {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Cookie: customerCookie1 },
      });
      const json: any = await res.json();
      const currentUserId = json.data?.user?.id || json.user?.id;
      if (res.status === 200 && json.success && currentUserId === customerUser1.id) {
        logPass("E1. Authenticated session valid and hydrates user context");
      } else {
        logFail("E1. Session validation failed", json);
      }
    } catch (e) {
      logFail("E1. Valid session", e);
    }

    // E2: Session revocation immediately denies access
    try {
      await db.session.updateMany({
        where: { userId: customerUser1.id },
        data: { revokedAt: new Date() },
      });
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Cookie: customerCookie1 },
      });
      if (res.status === 401) {
        logPass("E2. Revoked session immediately denied (401 Session has been revoked)");
      } else {
        logFail("E2. Revoked session should be rejected", `Status: ${res.status}`);
      }
    } catch (e) {
      logFail("E2. Revoked session", e);
    }

    // Re-create active session for customerUser1
    const freshC1Session = await createUserSession(customerUser1.id);
    customerCookie1 = `${AUTH_COOKIE_NAME}=${freshC1Session.token}`;

    // -------------------------------------------------------------------------
    // GROUP F: ORGANIZATIONS & WORKSPACES API ENDPOINTS
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP F: ORGANIZATIONS & WORKSPACES API ENDPOINTS ---");

    // F1: List workspaces
    try {
      const res = await fetch(`${baseUrl}/api/v1/workspaces`, {
        headers: { Cookie: customerCookie1 },
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success && Array.isArray(json.workspaces) && json.workspaces.length >= 1) {
        logPass("F1. GET /api/v1/workspaces returns user workspaces list", `Count: ${json.workspaces.length}`);
      } else {
        logFail("F1. List workspaces failed", json);
      }
    } catch (e) {
      logFail("F1. List workspaces", e);
    }

    // F2: Create new workspace
    let createdWsId = "";
    try {
      const res = await fetch(`${baseUrl}/api/v1/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: customerCookie1 },
        body: JSON.stringify({ name: "Phase 3 Client Workspace" }),
      });
      const json: any = await res.json();
      if (res.status === 201 && json.success && json.workspace?.id) {
        createdWsId = json.workspace.id;
        logPass("F2. POST /api/v1/workspaces creates workspace with caller as OWNER");
      } else {
        logFail("F2. Create workspace failed", json);
      }
    } catch (e) {
      logFail("F2. Create workspace", e);
    }

    // F3: List organizations
    try {
      const res = await fetch(`${baseUrl}/api/v1/organizations`, {
        headers: { Cookie: customerCookie1 },
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success && Array.isArray(json.organizations) && json.organizations.length >= 1) {
        logPass("F3. GET /api/v1/organizations returns user organizations list");
      } else {
        logFail("F3. List organizations failed", json);
      }
    } catch (e) {
      logFail("F3. List organizations", e);
    }

    // F4: Assign website to workspace
    try {
      const res = await fetch(`${baseUrl}/api/v1/workspaces/${createdWsId}/websites/${site1.id}`, {
        method: "POST",
        headers: { Cookie: customerCookie1 },
      });
      const json: any = await res.json();
      if (res.status === 200 && json.success && json.website?.workspaceId === createdWsId) {
        logPass("F4. POST /workspaces/:id/websites/:websiteId assigns project to workspace");
      } else {
        logFail("F4. Assign website failed", json);
      }
    } catch (e) {
      logFail("F4. Assign website", e);
    }
  } catch (err) {
    console.error("Critical test runner error:", err);
  } finally {
    console.log("\nCleaning up Phase 3 test data...");
    await db.user.deleteMany({
      where: {
        email: {
          in: [
            "p3_superadmin@example.com",
            "p3_platformadmin@example.com",
            "p3_customer1@example.com",
            "p3_customer2@example.com",
            "p3_teammember@example.com",
          ],
        },
      },
    }).catch(() => {});

    await new Promise<void>((resolve) => server.close(() => resolve()));

    console.log("\n================================================================");
    console.log(`   PHASE 3 TEST SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED`);
    console.log("================================================================\n");

    if (failedCount > 0) {
      process.exit(1);
    }
  }
}

// Execute if directly invoked
if (process.argv[1]?.includes("phase3-auth-rbac.test")) {
  runPhase3AuthRbacTestSuite().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
