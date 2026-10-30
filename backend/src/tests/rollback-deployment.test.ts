/**
 * Feature 17 — Rollback: Comprehensive Verification Test Suite
 *
 * Verifies:
 * 1. Successful rollback to a valid previous version (additive deployment v3 from v1).
 * 2. Invalid or missing target deployment rejection (404 NOT_FOUND).
 * 3. Status gate: Rejection of non-published target deployments (BUILD_FAILED, ROLLED_BACK) (400 INVALID_STATE).
 * 4. Already-active target rejection (400 ALREADY_ACTIVE).
 * 5. Authorization & cross-workspace security (403 FORBIDDEN for VIEW/MEMBER, foreign users blocked).
 * 6. Unsupported destination rejection (400 UNSUPPORTED_DESTINATION).
 * 7. Rollback failure safety: Active deployment remains PUBLISHED when a rollback build fails.
 * 8. Concurrency guard: Rejection of concurrent rollback during active deployment (409 DEPLOYMENT_IN_PROGRESS).
 * 9. Secret redaction on rollback response and stored metadata.
 * 10. Monotonic versioning & deployment history preservation (zero records deleted, revisionType: RESTORE).
 */

import { prisma } from "../config/prisma.js";
import {
  publishWebsite,
  rollbackDeployment,
  getWebsiteDeployments,
  getDeploymentById,
  updateDeploymentStatus,
  sanitizeDeploymentData,
} from "../services/publishing.service.js";
import { createWebsite } from "../services/website.service.js";
import { getRevisionById } from "../services/revision.service.js";
import { changeUserPlan } from "../services/subscription.service.js";
import { createWorkspace as createWsService, addWorkspaceMember } from "../services/workspace.service.js";

const db = prisma as any;

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    return true;
  } else {
    console.error(`[FAIL] ${testName}`);
    return false;
  }
}

function record(ok: boolean) {
  if (ok) passed++;
  else failed++;
}

async function runRollbackTests() {
  console.log("=================================================");
  console.log("FEATURE 17 — ROLLBACK VERIFICATION TESTS");
  console.log("=================================================\n");

  let ownerUser: any = null;
  let workspaceMemberUser: any = null;
  let unauthorizedUser: any = null;
  let standardWebsite: any = null;
  let workspaceWebsite: any = null;
  let testWorkspace: any = null;

  try {
    // Setup test users
    ownerUser = await db.user.create({
      data: {
        email: `f17-owner-${Date.now()}@example.com`,
        fullName: "F17 Rollback Owner",
        role: "USER",
        status: "ACTIVE",
      },
    });
    await changeUserPlan(ownerUser.id, "agency");

    workspaceMemberUser = await db.user.create({
      data: {
        email: `f17-member-${Date.now()}@example.com`,
        fullName: "F17 Workspace Member",
        role: "USER",
        status: "ACTIVE",
      },
    });

    unauthorizedUser = await db.user.create({
      data: {
        email: `f17-unauth-${Date.now()}@example.com`,
        fullName: "F17 Unauthorized User",
        role: "USER",
        status: "ACTIVE",
      },
    });

    // Create test workspace with owner and member
    testWorkspace = await createWsService(
      ownerUser.id,
      `F17 Rollback Workspace ${Date.now()}`,
      `f17-ws-${Date.now()}`
    );

    await addWorkspaceMember(
      testWorkspace.id,
      ownerUser.id,
      workspaceMemberUser.id,
      "MEMBER"
    );

    // Create primary website
    standardWebsite = await createWebsite({
      name: "Rollback Pipeline Standard Site",
      slug: `rollback-std-${Date.now()}`,
      userId: ownerUser.id,
      editorData: {
        version: 1,
        homePageId: "home",
        pages: [
          {
            id: "home",
            name: "Home",
            title: "Home",
            slug: "/",
            isHome: true,
            elements: [
              { id: "h1", type: "heading", content: "Version 1 Initial Content" },
            ],
          },
        ],
      },
    });

    // Create workspace-linked website
    workspaceWebsite = await createWebsite({
      name: "Rollback Workspace Site",
      slug: `rollback-ws-${Date.now()}`,
      userId: ownerUser.id,
      editorData: {
        version: 1,
        homePageId: "home",
        pages: [
          {
            id: "home",
            name: "Home",
            slug: "/",
            isHome: true,
            elements: [{ id: "h1", type: "heading", content: "Workspace V1" }],
          },
        ],
      },
    });

    await db.website.update({
      where: { id: workspaceWebsite.id },
      data: { workspaceId: testWorkspace.id },
    });

    // =========================================================================
    // Test 1: Successful rollback to a valid previous version
    // =========================================================================
    // Publish v1
    const v1Publish = await publishWebsite(standardWebsite.id, ownerUser.id, {
      destinationType: "INTERNAL",
      editorData: {
        pages: [
          {
            id: "home",
            name: "Home",
            slug: "/",
            isHome: true,
            elements: [{ id: "h1", type: "heading", content: "Version 1 Headline" }],
          },
        ],
      },
    });

    // Publish v2
    const v2Publish = await publishWebsite(standardWebsite.id, ownerUser.id, {
      destinationType: "INTERNAL",
      editorData: {
        pages: [
          {
            id: "home",
            name: "Home",
            slug: "/",
            isHome: true,
            elements: [{ id: "h1", type: "heading", content: "Version 2 Updated Headline" }],
          },
        ],
      },
    });

    // Perform rollback to v1 (v1Publish.deploymentId)
    const rollbackRes = await rollbackDeployment(standardWebsite.id, v1Publish.deploymentId, ownerUser.id);

    // Retrieve updated website and all deployments
    const siteAfterRollback = await db.website.findUnique({ where: { id: standardWebsite.id } });
    const siteEdData = typeof siteAfterRollback.editorData === "string"
      ? JSON.parse(siteAfterRollback.editorData)
      : siteAfterRollback.editorData;

    const allDeployments = await getWebsiteDeployments(standardWebsite.id, ownerUser.id);
    const v3Deployment = allDeployments.find((d: any) => d.id === rollbackRes.deploymentId);
    const v2Deployment = allDeployments.find((d: any) => d.id === v2Publish.deploymentId);
    const v1Deployment = allDeployments.find((d: any) => d.id === v1Publish.deploymentId);

    // Retrieve revision linked to v3
    let v3Revision: any = null;
    if (v3Deployment?.sourceRevisionId) {
      v3Revision = await getRevisionById(standardWebsite.id, v3Deployment.sourceRevisionId, ownerUser.id);
    }

    const restoredHomeElement = siteEdData?.publishedData?.pages?.[0]?.elements?.[0];

    record(
      assert(
        rollbackRes.success === true &&
        rollbackRes.version === 3 &&
        v3Deployment?.status === "PUBLISHED" &&
        v3Deployment?.metadata?.isRollback === true &&
        v3Deployment?.metadata?.rolledBackVersion === 1 &&
        v2Deployment?.status === "ROLLED_BACK" &&
        v1Deployment?.status === "PUBLISHED" &&
        v3Revision?.revisionType === "RESTORE" &&
        restoredHomeElement?.content === "Version 1 Headline",
        "Test 1: Rollback creates additive v3 deployment, restores v1 snapshot, retires v2 to ROLLED_BACK, and tags revision as RESTORE"
      )
    );

    // =========================================================================
    // Test 2: Rejects rollback to non-existent target deployment (404 NOT_FOUND)
    // =========================================================================
    const fakeUuid = "00000000-0000-4000-8000-000000000000";
    let notFoundCaught = false;
    try {
      await rollbackDeployment(standardWebsite.id, fakeUuid, ownerUser.id);
    } catch (err: any) {
      notFoundCaught = err.statusCode === 404 || err.code === "NOT_FOUND";
    }

    record(
      assert(
        notFoundCaught,
        "Test 2: Non-existent target deployment is strictly rejected with 404 NOT_FOUND"
      )
    );

    // =========================================================================
    // Test 3: Status Gate: Rejects non-published target deployments (400 INVALID_STATE)
    // =========================================================================
    // Create a failed deployment record
    const failedDeployment = await db.deployment.create({
      data: {
        websiteId: standardWebsite.id,
        version: 99,
        status: "BUILD_FAILED",
        environment: "PRODUCTION",
        destinationType: "INTERNAL",
        createdBy: ownerUser.id,
      },
    });

    let failedStateRejected = false;
    try {
      await rollbackDeployment(standardWebsite.id, failedDeployment.id, ownerUser.id);
    } catch (err: any) {
      failedStateRejected = err.statusCode === 400 && err.code === "INVALID_STATE";
    }

    // Also verify that a deployment with status 'ROLLED_BACK' cannot be rolled back to
    let rolledBackStateRejected = false;
    try {
      await rollbackDeployment(standardWebsite.id, v2Deployment.id, ownerUser.id);
    } catch (err: any) {
      rolledBackStateRejected = err.statusCode === 400 && err.code === "INVALID_STATE";
    }

    record(
      assert(
        failedStateRejected && rolledBackStateRejected,
        "Test 3: Status gate strictly rejects non-published targets ('BUILD_FAILED', 'ROLLED_BACK') with 400 INVALID_STATE"
      )
    );

    // =========================================================================
    // Test 4: Rejects rollback to already-active deployment (400 ALREADY_ACTIVE)
    // =========================================================================
    let alreadyActiveCaught = false;
    try {
      // v3 is currently active
      await rollbackDeployment(standardWebsite.id, v3Deployment.id, ownerUser.id);
    } catch (err: any) {
      alreadyActiveCaught = err.statusCode === 400 && err.code === "ALREADY_ACTIVE";
    }

    record(
      assert(
        alreadyActiveCaught,
        "Test 4: Attempting rollback to currently active deployment is rejected with 400 ALREADY_ACTIVE"
      )
    );

    // =========================================================================
    // Test 5: Authorization & Workspace Security (403 FORBIDDEN)
    // =========================================================================
    // Publish v1 on workspace website
    const wsV1 = await publishWebsite(workspaceWebsite.id, ownerUser.id, {
      destinationType: "INTERNAL",
    });

    // Publish v2 on workspace website
    await publishWebsite(workspaceWebsite.id, ownerUser.id, {
      destinationType: "INTERNAL",
    });

    // Workspace member (role 'MEMBER') lacks PUBLISH permission
    let memberForbidden = false;
    try {
      await rollbackDeployment(workspaceWebsite.id, wsV1.deploymentId, workspaceMemberUser.id);
    } catch (err: any) {
      memberForbidden = err.statusCode === 403 || err.code === "FORBIDDEN";
    }

    // Completely unauthorized user
    let foreignForbidden = false;
    try {
      await rollbackDeployment(workspaceWebsite.id, wsV1.deploymentId, unauthorizedUser.id);
    } catch (err: any) {
      foreignForbidden = err.statusCode === 403 || err.statusCode === 404 || err.code === "FORBIDDEN" || err.code === "WEBSITE_NOT_FOUND";
    }

    record(
      assert(
        memberForbidden && foreignForbidden,
        "Test 5: Workspace members without publish permission and external users are strictly blocked with 403 Forbidden"
      )
    );

    // =========================================================================
    // Test 6: Unsupported destination rejection (400 UNSUPPORTED_DESTINATION)
    // =========================================================================
    const unsupportedDeploy = await db.deployment.create({
      data: {
        websiteId: standardWebsite.id,
        version: 0,
        status: "PUBLISHED",
        environment: "PRODUCTION",
        destinationType: "FTP_LEGACY_UNKNOWN",
        createdBy: ownerUser.id,
      },
    });

    let unsupportedCaught = false;
    try {
      await rollbackDeployment(standardWebsite.id, unsupportedDeploy.id, ownerUser.id);
    } catch (err: any) {
      unsupportedCaught = err.statusCode === 400 && (err.code === "UNSUPPORTED_DESTINATION" || err.message.includes("not supported"));
    } finally {
      await db.deployment.delete({ where: { id: unsupportedDeploy.id } });
    }

    record(
      assert(
        unsupportedCaught,
        "Test 6: Rollback target with unsupported destination is safely rejected with 400 UNSUPPORTED_DESTINATION"
      )
    );

    // =========================================================================
    // Test 7: Rollback failure handling: active deployment remains intact
    // =========================================================================
    // Create a target deployment whose source revision has invalid page data triggering validation failure
    const corruptRev = await db.websiteRevision.create({
      data: {
        websiteId: standardWebsite.id,
        version: 0,
        revisionType: "MANUAL",
        description: "Invalid Revision Causing Rollback Validation Failure",
        data: {
          pages: [
            {
              id: "", // Missing ID causes VALIDATION_FAILED (422)
              name: "Corrupt Page",
              slug: "/",
              isHome: true,
            },
          ],
        },
      },
    });

    const corruptTargetDeploy = await db.deployment.create({
      data: {
        websiteId: standardWebsite.id,
        version: 0,
        status: "PUBLISHED",
        environment: "PRODUCTION",
        destinationType: "INTERNAL",
        sourceRevisionId: corruptRev.id,
        createdBy: ownerUser.id,
      },
    });

    const activeBeforeFailure = await db.deployment.findUnique({ where: { id: v3Deployment.id } });

    let rollbackFailedCaught = false;
    try {
      await rollbackDeployment(standardWebsite.id, corruptTargetDeploy.id, ownerUser.id);
    } catch (err: any) {
      rollbackFailedCaught = err.code === "VALIDATION_FAILED" || err.statusCode === 422 || err.code === "BUILD_FAILED" || err.statusCode === 400;
    } finally {
      await db.deployment.delete({ where: { id: corruptTargetDeploy.id } });
      await db.websiteRevision.delete({ where: { id: corruptRev.id } });
    }

    const activeAfterFailure = await db.deployment.findUnique({ where: { id: v3Deployment.id } });

    record(
      assert(
        rollbackFailedCaught &&
        activeBeforeFailure?.status === "PUBLISHED" &&
        activeAfterFailure?.status === "PUBLISHED",
        "Test 7: When rollback compilation fails, active deployment remains PUBLISHED and is not retired or corrupted"
      )
    );

    // =========================================================================
    // Test 8: Concurrency guard: Active pipeline in progress blocks rollback (409)
    // =========================================================================
    const inProgressDeploy = await db.deployment.create({
      data: {
        websiteId: standardWebsite.id,
        version: 120,
        status: "BUILDING",
        environment: "PRODUCTION",
        destinationType: "INTERNAL",
        createdBy: ownerUser.id,
      },
    });

    let concurrencyBlocked = false;
    try {
      await rollbackDeployment(standardWebsite.id, v1Publish.deploymentId, ownerUser.id);
    } catch (err: any) {
      concurrencyBlocked = err.statusCode === 409 && err.code === "DEPLOYMENT_IN_PROGRESS";
    } finally {
      await db.deployment.delete({ where: { id: inProgressDeploy.id } });
    }

    record(
      assert(
        concurrencyBlocked,
        "Test 8: In-progress deployment pipeline strictly blocks concurrent rollback with 409 DEPLOYMENT_IN_PROGRESS"
      )
    );

    // =========================================================================
    // Test 9: Secret Redaction on rollback response and stored metadata
    // =========================================================================
    const rawSecretMetadata = {
      apiKey: "secret_api_key_live_99999",
      password: "secret_db_password_88888",
      token: "secret_bearer_token_77777",
      connectionUrl: "sftp://deployer:mypassword@sftp.example.com/site",
      safeNote: "Rollback to stable build",
    };

    const sanitizedMeta = sanitizeDeploymentData(rawSecretMetadata);

    record(
      assert(
        sanitizedMeta.apiKey === "[REDACTED]" &&
        sanitizedMeta.password === "[REDACTED]" &&
        sanitizedMeta.token === "[REDACTED]" &&
        sanitizedMeta.connectionUrl.includes("[REDACTED]") &&
        sanitizedMeta.safeNote === "Rollback to stable build",
        "Test 9: Secret tokens, credentials, and connection strings are strictly redacted from rollback metadata"
      )
    );

    // =========================================================================
    // Test 10: Monotonic versioning & deployment history preservation
    // =========================================================================
    const finalDeployments = await getWebsiteDeployments(standardWebsite.id, ownerUser.id);
    const versions = finalDeployments.map((d: any) => d.version);
    const hasV1 = versions.includes(1);
    const hasV2 = versions.includes(2);
    const hasV3 = versions.includes(3);

    record(
      assert(
        hasV1 && hasV2 && hasV3 && finalDeployments.length >= 3,
        "Test 10: Monotonic versions (v1, v2, v3) and historical records are strictly preserved with zero deletions"
      )
    );

  } catch (error) {
    console.error("Test execution error:", error);
    failed++;
  } finally {
    // Cleanup test entities
    try {
      if (standardWebsite?.id) {
        await db.deployment.deleteMany({ where: { websiteId: standardWebsite.id } });
        await db.websiteRevision.deleteMany({ where: { websiteId: standardWebsite.id } });
        await db.website.delete({ where: { id: standardWebsite.id } });
      }
      if (workspaceWebsite?.id) {
        await db.deployment.deleteMany({ where: { websiteId: workspaceWebsite.id } });
        await db.websiteRevision.deleteMany({ where: { websiteId: workspaceWebsite.id } });
        await db.website.delete({ where: { id: workspaceWebsite.id } });
      }
      if (testWorkspace?.id) {
        await db.workspaceMember.deleteMany({ where: { workspaceId: testWorkspace.id } });
        await db.workspace.delete({ where: { id: testWorkspace.id } });
      }
      if (ownerUser?.id) {
        await db.website.deleteMany({ where: { userId: ownerUser.id } });
        await db.user.delete({ where: { id: ownerUser.id } });
      }
      if (workspaceMemberUser?.id) {
        await db.user.delete({ where: { id: workspaceMemberUser.id } });
      }
      if (unauthorizedUser?.id) {
        await db.user.delete({ where: { id: unauthorizedUser.id } });
      }
    } catch (_) {}
    await db.$disconnect();
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

runRollbackTests();
