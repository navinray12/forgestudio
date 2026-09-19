import { prisma } from "../config/prisma.js";
import {
  createOrganization,
  getOrganization,
  addOrganizationMember,
  removeOrganizationMember,
  updateOrganizationSettings,
} from "../services/organization.service.js";
import {
  createWorkspace,
  getWorkspace,
  addWorkspaceMember,
  assignWebsiteToWorkspace,
} from "../services/workspace.service.js";
import {
  createTeam,
  inviteMember,
  acceptInvitation,
  removeTeamMember,
} from "../services/team.service.js";
import {
  setApprovalWorkflowEnabled,
  submitForPublishApproval,
  reviewPublishApproval,
  getWebsiteApprovalRequests,
} from "../services/approval.service.js";
import { queryAuditLogs } from "../services/audit.service.js";
import {
  createWebsite,
  getWebsiteById,
  deleteWebsite,
} from "../services/website.service.js";
import { publishWebsite } from "../services/publishing.service.js";

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

async function runMilestoneCTests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO MILESTONE C VERIFICATION SUITE");
  console.log("Collaboration & Enterprise (Master Phase 8)");
  console.log("=================================================\n");

  let ownerUser: any;
  let adminUser: any;
  let memberUser: any;
  let unauthorizedUser: any;
  let testOrg: any;
  let testWorkspace: any;
  let testTeam: any;
  let testWebsite: any;

  try {
    const timestamp = Date.now();
    ownerUser = await db.user.create({
      data: { email: `c_owner_${timestamp}@example.com`, fullName: "Org Owner" },
    });
    adminUser = await db.user.create({
      data: { email: `c_admin_${timestamp}@example.com`, fullName: "Org Admin" },
    });
    memberUser = await db.user.create({
      data: { email: `c_member_${timestamp}@example.com`, fullName: "Org Member" },
    });
    unauthorizedUser = await db.user.create({
      data: { email: `c_unauth_${timestamp}@example.com`, fullName: "External User" },
    });

    // =========================================================================
    // Test 1: Organization Creation & Ownership
    // =========================================================================
    testOrg = await createOrganization(ownerUser.id, `Enterprise Corp ${timestamp}`, `corp-${timestamp}`, {
      ssoEnabled: true,
      domain: "enterprisecorp.test",
    });

    assert(
      testOrg !== null &&
      testOrg.ownerId === ownerUser.id &&
      testOrg.members.length === 1 &&
      testOrg.members[0].role === "OWNER",
      "Test 1: Organization created with owner membership and enterprise settings"
    );

    // =========================================================================
    // Test 2: Organization Member Addition & Scoped Roles
    // =========================================================================
    const addedMember = await addOrganizationMember(testOrg.id, ownerUser.id, adminUser.email, "ADMIN");
    const orgDetails = await getOrganization(testOrg.id, adminUser.id);

    assert(
      addedMember.userId === adminUser.id &&
      addedMember.role === "ADMIN" &&
      orgDetails.userRole === "ADMIN" &&
      orgDetails.members.length === 2,
      "Test 2: Adding organization member assigns proper ADMIN role and grants organization access"
    );

    // =========================================================================
    // Test 3: Unauthorized Organization Access Rejection
    // =========================================================================
    let unauthOrgBlocked = false;
    try {
      await getOrganization(testOrg.id, unauthorizedUser.id);
    } catch (e: any) {
      unauthOrgBlocked = e.statusCode === 404;
    }
    assert(unauthOrgBlocked, "Test 3: External user without membership cannot access organization details (404)");

    // =========================================================================
    // Test 4: Workspace Creation & Organization Scoping
    // =========================================================================
    testWorkspace = await createWorkspace(
      ownerUser.id,
      `Marketing Workspace ${timestamp}`,
      `marketing-${timestamp}`,
      testOrg.id,
      { theme: "dark" }
    );

    const wsDetails = await getWorkspace(testWorkspace.id, ownerUser.id);
    assert(
      testWorkspace !== null &&
      testWorkspace.organizationId === testOrg.id &&
      wsDetails.members.length === 1 &&
      wsDetails.userRole === "OWNER",
      "Test 4: Workspace created with organization linkage and owner membership"
    );

    // =========================================================================
    // Test 5: Website Isolation & Assignment to Workspace
    // =========================================================================
    testWebsite = await createWebsite(ownerUser.id, `Collab Site ${timestamp}`);
    await assignWebsiteToWorkspace(testWebsite.id, testWorkspace.id, ownerUser.id);

    const wsAfterSite = await getWorkspace(testWorkspace.id, ownerUser.id);
    assert(
      wsAfterSite.websites.some((w: any) => w.id === testWebsite.id),
      "Test 5: Website assigned to Workspace maintains tenant isolation within the workspace"
    );

    // =========================================================================
    // Test 6: Team Creation, Secure Invitation Token Hashing & Acceptance
    // =========================================================================
    testTeam = await createTeam(ownerUser.id, `Design Team ${timestamp}`);
    const inviteResult = await inviteMember(testTeam.id, ownerUser.id, memberUser.email, "DESIGNER");

    // Token must be a 64-char hex string (32 bytes)
    assert(
      Boolean(inviteResult.inviteId && inviteResult.token && inviteResult.token.length === 64),
      "Test 6: Team invitation generates secure 32-byte hex crypto token"
    );

    // Accept invitation
    const acceptRes = await acceptInvitation(inviteResult.token, memberUser.id);
    const memberTeamDetails = await db.teamMember.findUnique({
      where: { teamId_userId: { teamId: testTeam.id, userId: memberUser.id } },
    });

    assert(
      acceptRes.success === true &&
      memberTeamDetails !== null &&
      memberTeamDetails.role === "DESIGNER",
      "Test 7: Accepting invitation with token grants team membership with DESIGNER role"
    );

    // =========================================================================
    // Test 8: Enabling Publish Approval Workflow on Website
    // =========================================================================
    // Add memberUser as a DESIGNER on testWebsite
    await db.websiteCollaborator.create({
      data: {
        websiteId: testWebsite.id,
        userId: memberUser.id,
        permission: "DESIGNER",
      },
    });

    const workflowConfig = await setApprovalWorkflowEnabled(testWebsite.id, ownerUser.id, true);
    assert(
      workflowConfig.success === true && workflowConfig.approvalWorkflowEnabled === true,
      "Test 8: Website owner can enable optional publish approval workflow"
    );

    // =========================================================================
    // Test 9: Non-Admin Direct Publish is BLOCKED when Approval Workflow is Enabled
    // =========================================================================
    let publishBlockedByApproval = false;
    try {
      await publishWebsite(testWebsite.id, memberUser.id);
    } catch (e: any) {
      publishBlockedByApproval = e.statusCode === 403 && e.code === "APPROVAL_REQUIRED";
    }

    assert(
      publishBlockedByApproval,
      "Test 9: Non-admin collaborator is blocked from direct publish when approval workflow is enabled (403 APPROVAL_REQUIRED)"
    );

    // =========================================================================
    // Test 10: Submit Publish Approval Request (DRAFT -> READY_FOR_REVIEW)
    // =========================================================================
    const approvalReq = await submitForPublishApproval(
      testWebsite.id,
      memberUser.id,
      1,
      { homePageId: "home", elements: [] },
      "Ready for production review"
    );

    assert(
      approvalReq !== null &&
      approvalReq.status === "PENDING" &&
      approvalReq.targetVersion === 1,
      "Test 10: Collaborator can submit publish approval request (status: PENDING)"
    );

    // =========================================================================
    // Test 11: Owner / Admin Reviews and Approves Publish Request (READY_FOR_REVIEW -> APPROVED)
    // =========================================================================
    const reviewedReq = await reviewPublishApproval(
      approvalReq.id,
      ownerUser.id,
      "APPROVED",
      "Looks good to publish!"
    );

    assert(
      reviewedReq.status === "APPROVED" &&
      reviewedReq.reviewerId === ownerUser.id &&
      reviewedReq.reviewedAt !== null,
      "Test 11: Project owner approves review request (status: APPROVED)"
    );

    // =========================================================================
    // Test 12: Collaborator can now execute publish with APPROVED status
    // =========================================================================
    const approvedPublishResult = await publishWebsite(testWebsite.id, memberUser.id);
    assert(
      approvedPublishResult.success === true &&
      approvedPublishResult.status === "PUBLISHED",
      "Test 12: Collaborator successfully executes publish once approval request is APPROVED"
    );

    // =========================================================================
    // Test 13: Website Owner can ALWAYS publish directly (bypasses self-approval requirement)
    // =========================================================================
    const ownerDirectPublish = await publishWebsite(testWebsite.id, ownerUser.id);
    assert(
      ownerDirectPublish.success === true &&
      ownerDirectPublish.status === "PUBLISHED",
      "Test 13: Project Owner can always publish directly without requiring external approval"
    );

    // =========================================================================
    // Test 14: Durable Audit Log Querying & Filtering
    // =========================================================================
    const orgAuditLogs = await queryAuditLogs({
      targetResource: `organization:${testOrg.id}`,
    });

    const approvalAuditLogs = await queryAuditLogs({
      targetResource: `website:${testWebsite.id}`,
    });

    const hasOrgCreated = orgAuditLogs.logs.some((l: any) => l.action === "ORGANIZATION_CREATED");
    const hasOrgMemberAdded = orgAuditLogs.logs.some((l: any) => l.action === "ORGANIZATION_MEMBER_ADDED");
    const hasApprovalRequested = approvalAuditLogs.logs.some((l: any) => l.action === "PUBLISH_APPROVAL_REQUESTED");
    const hasApprovalApproved = approvalAuditLogs.logs.some((l: any) => l.action === "PUBLISH_APPROVAL_APPROVED");

    assert(
      hasOrgCreated && hasOrgMemberAdded && hasApprovalRequested && hasApprovalApproved,
      "Test 14: Audit logs durably track organization creation, member addition, and publish approval states"
    );

  } catch (error) {
    console.error("Milestone C test error:", error);
    failed++;
  } finally {
    // Teardown
    try {
      if (testWebsite?.id) await db.website.delete({ where: { id: testWebsite.id } });
      if (testWorkspace?.id) await db.workspace.delete({ where: { id: testWorkspace.id } });
      if (testOrg?.id) await db.organization.delete({ where: { id: testOrg.id } });
      if (testTeam?.id) await db.team.delete({ where: { id: testTeam.id } });
      if (ownerUser?.id) await db.user.delete({ where: { id: ownerUser.id } });
      if (adminUser?.id) await db.user.delete({ where: { id: adminUser.id } });
      if (memberUser?.id) await db.user.delete({ where: { id: memberUser.id } });
      if (unauthorizedUser?.id) await db.user.delete({ where: { id: unauthorizedUser.id } });
    } catch (_) {}
  }

  console.log("\n=================================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runMilestoneCTests();
