/**
 * @file Milestone A permissions test: regression or diagnostic checks for the behavior named by this file.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import "./require-disposable-database.js";
import { prisma } from "../platform/database/prisma.js";
import {
  canUserAccessResource,
  authorizeResourceAccess,
  setGranularPermission,
  getGranularPermissions,
} from "../modules/permissions/permission.service.js";
import {
  createWebsite,
  getWebsiteById,
  deleteWebsite,
  updateWebsiteRole,
  inviteWebsiteMember,
  removeWebsiteMember,
} from "../modules/websites/website.service.js";

const db = prisma as any;

let passed = 0;
let failed = 0;

/**
 * Assert.
 * @param condition Condition supplied to this operation (type: boolean).
 * @param testName Test Name supplied to this operation (type: string).
 * @param details Details supplied to this operation (type: any). Optional; callers may omit it.
 */
function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, details || "");
    failed++;
  }
}

/**
 * Run Milestone A Tests.
 */
async function runMilestoneATests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO MILESTONE A VERIFICATION SUITE");
  console.log("Data & Permission Integrity (Master Phase 4)");
  console.log("=================================================\n");

  let ownerUser: any;
  let adminUser: any;
  let designerUser: any;
  let editorUser: any;
  let reviewerUser: any;
  let crossTenantUser: any;
  let testWebsite: any;

  try {
    // 1. Setup Test Users
    const timestamp = Date.now();
    ownerUser = await db.user.create({
      data: {
        email: `owner_${timestamp}@example.com`,
        fullName: "Owner User",
      },
    });

    adminUser = await db.user.create({
      data: {
        email: `admin_${timestamp}@example.com`,
        fullName: "Admin User",
      },
    });

    designerUser = await db.user.create({
      data: {
        email: `designer_${timestamp}@example.com`,
        fullName: "Designer User",
      },
    });

    editorUser = await db.user.create({
      data: {
        email: `editor_${timestamp}@example.com`,
        fullName: "Content Editor User",
      },
    });

    reviewerUser = await db.user.create({
      data: {
        email: `reviewer_${timestamp}@example.com`,
        fullName: "Reviewer User",
      },
    });

    crossTenantUser = await db.user.create({
      data: {
        email: `crosstenant_${timestamp}@example.com`,
        fullName: "Cross Tenant User",
      },
    });

    // 2. Setup Test Website owned by ownerUser
    testWebsite = await createWebsite(ownerUser.id, `Permission Test Site ${timestamp}`);

    // Add Collaborators
    await db.websiteCollaborator.createMany({
      data: [
        { websiteId: testWebsite.id, userId: adminUser.id, permission: "ADMIN" },
        { websiteId: testWebsite.id, userId: designerUser.id, permission: "DESIGNER" },
        { websiteId: testWebsite.id, userId: editorUser.id, permission: "CONTENT_EDITOR" },
        { websiteId: testWebsite.id, userId: reviewerUser.id, permission: "REVIEWER" },
      ],
    });

    // =========================================================================
    // Test 1: Owner Access (Full authority across all capabilities)
    // =========================================================================
    const ownerCaps = [
      "VIEW", "EDIT", "CREATE", "DELETE", "PUBLISH", "ROLLBACK",
      "MANAGE_TEAM", "MANAGE_SETTINGS", "MANAGE_INTEGRATIONS"
    ];
    let ownerAllAllowed = true;
    for (const cap of ownerCaps) {
      const allowed = await canUserAccessResource(ownerUser.id, testWebsite.id, "*", cap);
      if (!allowed) ownerAllAllowed = false;
    }
    assert(ownerAllAllowed, "Test 1: Project Owner has full access to all standard capabilities");

    // =========================================================================
    // Test 2: Admin Member Access (All except DELETE)
    // =========================================================================
    const adminCanPublish = await canUserAccessResource(adminUser.id, testWebsite.id, "*", "PUBLISH");
    const adminCanRollback = await canUserAccessResource(adminUser.id, testWebsite.id, "*", "ROLLBACK");
    const adminCanManageTeam = await canUserAccessResource(adminUser.id, testWebsite.id, "*", "MANAGE_TEAM");
    const adminCanIntegrations = await canUserAccessResource(adminUser.id, testWebsite.id, "*", "MANAGE_INTEGRATIONS");
    const adminCanDelete = await canUserAccessResource(adminUser.id, testWebsite.id, "*", "DELETE");

    assert(
      adminCanPublish && adminCanRollback && adminCanManageTeam && adminCanIntegrations && !adminCanDelete,
      "Test 2: Admin has management/publishing permissions but is restricted from deleting the project"
    );

    // =========================================================================
    // Test 3: Designer Access (VIEW, EDIT, PUBLISH; restricted from ROLLBACK & TEAM)
    // =========================================================================
    const designerCanView = await canUserAccessResource(designerUser.id, testWebsite.id, "*", "VIEW");
    const designerCanEdit = await canUserAccessResource(designerUser.id, testWebsite.id, "*", "EDIT");
    const designerCanPublish = await canUserAccessResource(designerUser.id, testWebsite.id, "*", "PUBLISH");
    const designerCanRollback = await canUserAccessResource(designerUser.id, testWebsite.id, "*", "ROLLBACK");
    const designerCanManageTeam = await canUserAccessResource(designerUser.id, testWebsite.id, "*", "MANAGE_TEAM");

    assert(
      designerCanView && designerCanEdit && designerCanPublish && !designerCanRollback && !designerCanManageTeam,
      "Test 3: Designer has EDIT and PUBLISH access, but is restricted from ROLLBACK and MANAGE_TEAM"
    );

    // =========================================================================
    // Test 4: Content Editor Access (VIEW, EDIT; restricted from PUBLISH)
    // =========================================================================
    const editorCanView = await canUserAccessResource(editorUser.id, testWebsite.id, "*", "VIEW");
    const editorCanEdit = await canUserAccessResource(editorUser.id, testWebsite.id, "*", "EDIT");
    const editorCanPublish = await canUserAccessResource(editorUser.id, testWebsite.id, "*", "PUBLISH");

    assert(
      editorCanView && editorCanEdit && !editorCanPublish,
      "Test 4: Content Editor has VIEW and EDIT access, but is blocked from PUBLISH"
    );

    // =========================================================================
    // Test 5: Reviewer / Read-Only Access (VIEW only)
    // =========================================================================
    const reviewerCanView = await canUserAccessResource(reviewerUser.id, testWebsite.id, "*", "VIEW");
    const reviewerCanEdit = await canUserAccessResource(reviewerUser.id, testWebsite.id, "*", "EDIT");
    const reviewerCanPublish = await canUserAccessResource(reviewerUser.id, testWebsite.id, "*", "PUBLISH");
    const reviewerCanRollback = await canUserAccessResource(reviewerUser.id, testWebsite.id, "*", "ROLLBACK");

    assert(
      reviewerCanView && !reviewerCanEdit && !reviewerCanPublish && !reviewerCanRollback,
      "Test 5: Reviewer is strictly read-only (blocked from EDIT, PUBLISH, and ROLLBACK)"
    );

    // =========================================================================
    // Test 6: Cross-Tenant Access & IDOR Protection
    // =========================================================================
    let crossTenantViewBlocked = false;
    let crossTenantPublishBlocked = false;

    try {
      await getWebsiteById(testWebsite.id, crossTenantUser.id);
    } catch (e: any) {
      crossTenantViewBlocked = e.statusCode === 404 || e.statusCode === 403;
    }

    try {
      await authorizeResourceAccess(crossTenantUser.id, testWebsite.id, "*", "PUBLISH");
    } catch (e: any) {
      crossTenantPublishBlocked = e.statusCode === 404 || e.statusCode === 403;
    }

    assert(
      crossTenantViewBlocked && crossTenantPublishBlocked,
      "Test 6: Cross-tenant unauthorized access is strictly rejected (IDOR protection)"
    );

    // =========================================================================
    // Test 7: Granular Permission Override - ALLOW grants capability not in default role
    // =========================================================================
    // Content Editor default cannot PUBLISH. Grant granular ALLOW for PUBLISH.
    await setGranularPermission(testWebsite.id, ownerUser.id, editorUser.id, "*", "PUBLISH", "ALLOW");
    const editorCanPublishNow = await canUserAccessResource(editorUser.id, testWebsite.id, "*", "PUBLISH");

    assert(
      editorCanPublishNow === true,
      "Test 7: GranularPermission ALLOW override grants PUBLISH capability to Content Editor"
    );

    // =========================================================================
    // Test 8: Granular Permission Override - DENY blocks capability present in default role
    // =========================================================================
    // Designer default CAN publish. Add granular DENY for PUBLISH.
    await setGranularPermission(testWebsite.id, ownerUser.id, designerUser.id, "*", "PUBLISH", "DENY");
    const designerCanPublishNow = await canUserAccessResource(designerUser.id, testWebsite.id, "*", "PUBLISH");

    assert(
      designerCanPublishNow === false,
      "Test 8: GranularPermission DENY override revokes PUBLISH capability from Designer"
    );

    // =========================================================================
    // Test 9: Granular Permission INHERIT resets to role default
    // =========================================================================
    // Reset Designer's PUBLISH to INHERIT
    await setGranularPermission(testWebsite.id, ownerUser.id, designerUser.id, "*", "PUBLISH", "INHERIT");
    const designerCanPublishAfterInherit = await canUserAccessResource(designerUser.id, testWebsite.id, "*", "PUBLISH");

    assert(
      designerCanPublishAfterInherit === true,
      "Test 9: GranularPermission INHERIT removes override and restores default role capability"
    );

    // =========================================================================
    // Test 10: Owner protection (Cannot restrict project owner via granular permissions)
    // =========================================================================
    let ownerRestrictionBlocked = false;
    try {
      await setGranularPermission(testWebsite.id, adminUser.id, ownerUser.id, "*", "PUBLISH", "DENY");
    } catch (e: any) {
      ownerRestrictionBlocked = e.statusCode === 403;
    }

    assert(
      ownerRestrictionBlocked,
      "Test 10: Server rejects attempts to restrict Project Owner capabilities"
    );

    // =========================================================================
    // Test 11: Non-admin cannot manage permissions
    // =========================================================================
    let designerManagePermBlocked = false;
    try {
      await setGranularPermission(testWebsite.id, designerUser.id, editorUser.id, "*", "PUBLISH", "ALLOW");
    } catch (e: any) {
      designerManagePermBlocked = e.statusCode === 403;
    }

    assert(
      designerManagePermBlocked,
      "Test 11: Non-admin collaborator cannot grant or revoke granular permissions (403 Forbidden)"
    );

    // =========================================================================
    // Test 12: Collaborator Role Update and Audit Logging
    // =========================================================================
    await updateWebsiteRole(testWebsite.id, ownerUser.id, reviewerUser.id, "DESIGNER");
    const updatedCollab = await db.websiteCollaborator.findUnique({
      where: { websiteId_userId: { websiteId: testWebsite.id, userId: reviewerUser.id } },
    });

    const roleAuditLog = await db.auditLog.findFirst({
      where: {
        userId: ownerUser.id,
        action: "ROLE_UPDATED",
        targetResource: `website:${testWebsite.id}`,
      },
    });

    assert(
      updatedCollab?.permission === "DESIGNER" && roleAuditLog !== null,
      "Test 12: Updating collaborator role succeeds and writes durable ROLE_UPDATED AuditLog"
    );

    // =========================================================================
    // Test 13: Collaborator Invitation and Audit Logging
    // =========================================================================
    const inviteRes = await inviteWebsiteMember(testWebsite.id, ownerUser.id, `newcollab_${timestamp}@example.com`, "DESIGNER");
    const inviteRecord = await db.websiteInvitation.findUnique({ where: { id: inviteRes.inviteId } });

    const inviteAuditLog = await db.auditLog.findFirst({
      where: {
        userId: ownerUser.id,
        action: "COLLABORATOR_INVITED",
        targetResource: `website:${testWebsite.id}`,
      },
    });

    assert(
      inviteRecord !== null && inviteAuditLog !== null,
      "Test 13: Inviting a member creates secure invitation record and writes COLLABORATOR_INVITED AuditLog"
    );

    // =========================================================================
    // Test 14: Collaborator Removal and Audit Logging
    // =========================================================================
    await removeWebsiteMember(testWebsite.id, ownerUser.id, editorUser.id);
    const removedCollab = await db.websiteCollaborator.findUnique({
      where: { websiteId_userId: { websiteId: testWebsite.id, userId: editorUser.id } },
    });

    const removeAuditLog = await db.auditLog.findFirst({
      where: {
        userId: ownerUser.id,
        action: "COLLABORATOR_REMOVED",
        targetResource: `website:${testWebsite.id}`,
      },
    });

    assert(
      removedCollab === null && removeAuditLog !== null,
      "Test 14: Removing collaborator deletes membership and writes COLLABORATOR_REMOVED AuditLog"
    );

    // =========================================================================
    // Test 15: Non-Owner cannot delete website (Even Admin is blocked)
    // =========================================================================
    let adminDeleteBlocked = false;
    try {
      await deleteWebsite(testWebsite.id, adminUser.id);
    } catch (e: any) {
      adminDeleteBlocked = e.statusCode === 403;
    }

    assert(
      adminDeleteBlocked,
      "Test 15: Non-owner (even Admin) is forbidden from deleting the website (403 Forbidden)"
    );

  } catch (error) {
    console.error("Milestone A test error:", error);
    failed++;
  } finally {
    // Teardown
    try {
      if (testWebsite?.id) {
        await db.website.delete({ where: { id: testWebsite.id } });
      }
      if (ownerUser?.id) await db.user.delete({ where: { id: ownerUser.id } });
      if (adminUser?.id) await db.user.delete({ where: { id: adminUser.id } });
      if (designerUser?.id) await db.user.delete({ where: { id: designerUser.id } });
      if (editorUser?.id) await db.user.delete({ where: { id: editorUser.id } });
      if (reviewerUser?.id) await db.user.delete({ where: { id: reviewerUser.id } });
      if (crossTenantUser?.id) await db.user.delete({ where: { id: crossTenantUser.id } });
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

runMilestoneATests();
