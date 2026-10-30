import { prisma } from "../config/prisma.js";
import {
  createWebsite,
  getWebsiteById,
} from "../services/website.service.js";
import {
  publishWebsite,
  verifyDeployment,
  retryDeployment,
  getWebsiteDeployments,
  getDeploymentById,
  updateDeploymentStatus,
  isValidDeploymentTransition,
  sanitizeDeploymentData,
  VALID_DEPLOYMENT_STATUSES,
} from "../services/publishing.service.js";
import { changeUserPlan } from "../services/subscription.service.js";
import { createWorkspace as createWsService, addWorkspaceMember } from "../services/workspace.service.js";

const db = prisma as any;

function assert(condition: any, testName: string, detail?: string) {
  if (Boolean(condition)) {
    console.log(`[PASS] ${testName}`);
    return true;
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ""}`);
    return false;
  }
}

async function runDeploymentStatusesTests() {
  console.log("=================================================");
  console.log("FEATURE 16 — DEPLOYMENT STATUSES TESTS");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function record(result: boolean) {
    if (result) passed++;
    else failed++;
  }

  let ownerUser: any = null;
  let workspaceMemberUser: any = null;
  let unauthorizedUser: any = null;
  let testWorkspace: any = null;
  let standardWebsite: any = null;
  let workspaceWebsite: any = null;

  try {
    // 0. Setup test users
    ownerUser = await db.user.create({
      data: {
        email: `f16_owner_${Date.now()}@forgestudio.dev`,
        fullName: "F16 Pipeline Owner",
        status: "ACTIVE",
        role: "USER",
      },
    });
    await changeUserPlan(ownerUser.id, "agency");

    workspaceMemberUser = await db.user.create({
      data: {
        email: `f16_member_${Date.now()}@forgestudio.dev`,
        fullName: "F16 Workspace Member",
        status: "ACTIVE",
        role: "USER",
      },
    });

    unauthorizedUser = await db.user.create({
      data: {
        email: `f16_unauth_${Date.now()}@forgestudio.dev`,
        fullName: "F16 Unauthorized User",
        status: "ACTIVE",
        role: "USER",
      },
    });

    // Create test workspace and assign member
    testWorkspace = await createWsService(
      ownerUser.id,
      `F16 Agency Workspace ${Date.now()}`,
      `f16-ws-${Date.now()}`
    );

    await addWorkspaceMember(
      testWorkspace.id,
      ownerUser.id,
      workspaceMemberUser.id,
      "MEMBER"
    );

    // Create test websites
    standardWebsite = await createWebsite({
      name: "Status Pipeline Standard Site",
      slug: `status-std-${Date.now()}`,
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
              { id: "h1", type: "heading", content: "Deployment Statuses Verification" },
            ],
          },
        ],
      },
    });

    workspaceWebsite = await createWebsite({
      name: "Workspace Shared Site",
      slug: `ws-site-${Date.now()}`,
      userId: ownerUser.id,
      editorData: {
        version: 1,
        homePageId: "home",
        pages: [
          { id: "home", name: "Home", slug: "/", isHome: true, elements: [] },
        ],
      },
    });

    // Link workspaceWebsite to testWorkspace
    await db.website.update({
      where: { id: workspaceWebsite.id },
      data: { workspaceId: testWorkspace.id },
    });

    // =========================================================================
    // Test 1: Complete pipeline status progression to PUBLISHED
    // =========================================================================
    const publishRes = await publishWebsite(standardWebsite.id, ownerUser.id, {
      destinationType: "INTERNAL",
      environment: "PRODUCTION",
      metadata: { initiatedVia: "test-runner" },
    });

    const activeDeployment = await getDeploymentById(standardWebsite.id, publishRes.deploymentId, ownerUser.id);

    record(
      assert(
        publishRes.success === true &&
        publishRes.status === "PUBLISHED" &&
        activeDeployment.status === "PUBLISHED" &&
        activeDeployment.completedAt !== null &&
        activeDeployment.destinationRef === `/site/${standardWebsite.id}` &&
        activeDeployment.version === 1,
        "Test 1: Publish pipeline successfully transitions through intermediate states to terminal 'PUBLISHED'"
      )
    );

    // =========================================================================
    // Test 2: Build failure persistence with status 'BUILD_FAILED'
    // =========================================================================
    const brokenWebsite = await createWebsite({
      name: "Broken Build Site",
      slug: `broken-build-${Date.now()}`,
      userId: ownerUser.id,
      editorData: {
        version: 1,
        homePageId: "home",
        pages: [{ id: "home", name: "Home", slug: "/", isHome: true, elements: [] }],
      },
    });

    const circularEl: any = {
      id: "circular_container",
      type: "container",
      children: [],
    };
    circularEl.children.push(circularEl);

    let buildFailed = false;
    try {
      await publishWebsite(brokenWebsite.id, ownerUser.id, {
        destinationType: "INTERNAL",
        editorData: {
          homePageId: "home",
          pages: [
            {
              id: "home",
              name: "Corrupt Page",
              slug: "/",
              isHome: true,
              elements: [circularEl],
            },
          ],
          elements: [circularEl],
        },
      });
    } catch (err: any) {
      buildFailed = err.code === "BUILD_FAILED" || err.statusCode === 400 || err.statusCode === 422;
    }

    const brokenDeployments = await getWebsiteDeployments(brokenWebsite.id, ownerUser.id);
    const buildFailedRecord = brokenDeployments[0];

    record(
      assert(
        buildFailed &&
        buildFailedRecord &&
        buildFailedRecord.status === "BUILD_FAILED" &&
        buildFailedRecord.completedAt !== null &&
        Boolean(buildFailedRecord.error),
        "Test 2: Build compilation failure is persisted with status 'BUILD_FAILED' and error diagnostics"
      )
    );

    // =========================================================================
    // Test 3: Validation failure persistence with status 'VALIDATION_FAILED'
    // =========================================================================
    const invalidWebsite = await createWebsite({
      name: "Invalid Empty Site",
      slug: `invalid-site-${Date.now()}`,
      userId: ownerUser.id,
      editorData: {
        version: 1,
        homePageId: "home",
        pages: [{ id: "home", name: "Home", slug: "/", isHome: true, elements: [] }],
      },
    });

    let validationFailed = false;
    try {
      await publishWebsite(invalidWebsite.id, ownerUser.id, {
        destinationType: "INTERNAL",
        editorData: {
          pages: [
            {
              id: "", // Missing ID triggers validation error
              name: "Missing ID Page",
              slug: "/",
              isHome: true,
            },
          ],
        },
      });
    } catch (err: any) {
      validationFailed = err.code === "VALIDATION_FAILED" || err.statusCode === 422;
    }

    const invalidDeployments = await getWebsiteDeployments(invalidWebsite.id, ownerUser.id);
    const validationFailedRecord = invalidDeployments[0];

    record(
      assert(
        validationFailed &&
        validationFailedRecord &&
        validationFailedRecord.status === "VALIDATION_FAILED" &&
        validationFailedRecord.completedAt !== null,
        "Test 3: Pre-publish validation failure is persisted with status 'VALIDATION_FAILED'"
      )
    );

    // =========================================================================
    // Test 4: Destination verification failure persistence
    // =========================================================================
    const verifFailedDeployment = await db.deployment.create({
      data: {
        websiteId: standardWebsite.id,
        version: 999, // Mismatched version causes verification failure
        status: "VERIFYING",
        environment: "PRODUCTION",
        destinationType: "INTERNAL",
        destinationRef: `/site/${standardWebsite.id}`,
        createdBy: ownerUser.id,
      },
    });

    const failedVerifResult = await verifyDeployment(standardWebsite.id, verifFailedDeployment.id, ownerUser.id);
    const updatedFailedVerif = await getDeploymentById(standardWebsite.id, verifFailedDeployment.id, ownerUser.id);

    record(
      assert(
        failedVerifResult.verified === false &&
        failedVerifResult.status === "VERIFICATION_FAILED" &&
        updatedFailedVerif.status === "VERIFICATION_FAILED" &&
        updatedFailedVerif.error !== null,
        "Test 4: Unverified destination check is persisted with status 'VERIFICATION_FAILED'"
      )
    );

    // =========================================================================
    // Test 5: Retry/Recovery from VERIFICATION_FAILED to PUBLISHED
    // =========================================================================
    const recoverableDeployment = await db.deployment.create({
      data: {
        websiteId: standardWebsite.id,
        version: 1, // matches live website version
        status: "VERIFICATION_FAILED",
        environment: "PRODUCTION",
        destinationType: "INTERNAL",
        destinationRef: `/site/${standardWebsite.id}`,
        createdBy: ownerUser.id,
        error: { code: "DESTINATION_VERIFICATION_FAILED", message: "Initial verification timed out" },
      },
    });

    const recoveredResult = await retryDeployment(standardWebsite.id, recoverableDeployment.id, ownerUser.id);
    const recoveredRecord = await getDeploymentById(standardWebsite.id, recoverableDeployment.id, ownerUser.id);

    record(
      assert(
        recoveredResult.success === true &&
        recoveredResult.status === "PUBLISHED" &&
        recoveredRecord.status === "PUBLISHED" &&
        recoveredRecord.error === null,
        "Test 5: retryDeployment on 'VERIFICATION_FAILED' recovers deployment status to 'PUBLISHED' and clears error"
      )
    );

    // =========================================================================
    // Test 6: Retry/Recovery from BUILD_FAILED to PUBLISHED
    // =========================================================================
    // Update website to have valid pages so retry build succeeds
    await db.website.update({
      where: { id: brokenWebsite.id },
      data: {
        editorData: {
          version: 1,
          homePageId: "home",
          pages: [{ id: "home", name: "Home", slug: "/", isHome: true, elements: [{ id: "e1", type: "heading", content: "Fixed" }] }],
        },
      },
    });

    const buildRetryResult = await retryDeployment(brokenWebsite.id, buildFailedRecord.id, ownerUser.id);
    const buildRecoveredRecord = await getDeploymentById(brokenWebsite.id, buildFailedRecord.id, ownerUser.id);

    record(
      assert(
        buildRetryResult.success === true &&
        buildRetryResult.status === "PUBLISHED" &&
        buildRecoveredRecord.status === "PUBLISHED" &&
        buildRecoveredRecord.error === null,
        "Test 6: retryDeployment on 'BUILD_FAILED' re-compiles artifacts, deploys, and reaches 'PUBLISHED'"
      )
    );

    // =========================================================================
    // Test 7: Terminal status protection (ROLLED_BACK is non-retriable)
    // =========================================================================
    const rolledBackDeploy = await db.deployment.create({
      data: {
        websiteId: standardWebsite.id,
        version: 1,
        status: "ROLLED_BACK",
        environment: "PRODUCTION",
        destinationType: "INTERNAL",
        createdBy: ownerUser.id,
      },
    });

    let rolledBackRejected = false;
    try {
      await retryDeployment(standardWebsite.id, rolledBackDeploy.id, ownerUser.id);
    } catch (err: any) {
      rolledBackRejected = err.statusCode === 409 || err.code === "INVALID_STATE_TRANSITION";
    }

    let rolledBackVerifyRejected = false;
    try {
      await verifyDeployment(standardWebsite.id, rolledBackDeploy.id, ownerUser.id);
    } catch (err: any) {
      rolledBackVerifyRejected = err.statusCode === 409 || err.code === "INVALID_STATE_TRANSITION";
    }

    record(
      assert(
        rolledBackRejected && rolledBackVerifyRejected,
        "Test 7: Terminal status protection: 'ROLLED_BACK' status strictly rejects retry and verify (409 Conflict)"
      )
    );

    // =========================================================================
    // Test 8: Status Transition Matrix validation & normalization
    // =========================================================================
    const validT1 = isValidDeploymentTransition("QUEUED", "BUILDING");
    const validT2 = isValidDeploymentTransition("BUILDING", "DEPLOYING");
    const validT3 = isValidDeploymentTransition("DEPLOYING", "VERIFYING");
    const validT4 = isValidDeploymentTransition("VERIFYING", "PUBLISHED");
    const validT5 = isValidDeploymentTransition("DEPLOY_FAILED", "DEPLOYING");
    const validT6 = isValidDeploymentTransition("DEPLOYMENT_FAILED", "VERIFYING");
    const invalidT1 = isValidDeploymentTransition("ROLLED_BACK", "BUILDING");
    const invalidT2 = isValidDeploymentTransition("BUILD_FAILED", "PUBLISHED"); // Cannot skip building & deploying directly

    record(
      assert(
        validT1 && validT2 && validT3 && validT4 && validT5 && validT6 && !invalidT1 && !invalidT2,
        "Test 8: State machine transitions enforce strict validity while normalizing legacy synonyms (DEPLOYMENT_FAILED)"
      )
    );

    // =========================================================================
    // Test 9: Concurrency safety via optimistic timestamp guard
    // =========================================================================
    const concurrentDeploy = await db.deployment.create({
      data: {
        websiteId: standardWebsite.id,
        version: 77,
        status: "BUILDING",
        environment: "PRODUCTION",
        destinationType: "INTERNAL",
        createdBy: ownerUser.id,
      },
    });

    const pastTimestamp = new Date(Date.now() - 60000); // 1 minute ago
    // Attempting update with a stale ifNotNewerThan timestamp should safely yield current record without overwrite
    const raceCheck = await updateDeploymentStatus(concurrentDeploy.id, "DEPLOYING", {
      ifNotNewerThan: pastTimestamp,
    });

    const verifyUnchanged = await getDeploymentById(standardWebsite.id, concurrentDeploy.id, ownerUser.id);

    record(
      assert(
        verifyUnchanged.status === "BUILDING",
        "Test 9: Optimistic timestamp guard (ifNotNewerThan) prevents stale concurrent state overwrites"
      )
    );

    // =========================================================================
    // Test 10: Secret Redaction on creation, update, and retrieval
    // =========================================================================
    const secretObj = {
      password: "SuperSecretPassword123!",
      apiKey: "forge_live_998877665544",
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy",
      authorization: "Bearer my-secret-jwt-token",
      connectionUrl: "sftp://deployer:mypassword@sftp.example.com:22/html",
      message: "Connection failed with password: plaintext_password_here",
      safeField: "production-server-1",
    };

    const sanitized = sanitizeDeploymentData(secretObj);

    // Test persistence and retrieval redaction
    const secretDeploy = await db.deployment.create({
      data: {
        websiteId: standardWebsite.id,
        version: 88,
        status: "DEPLOY_FAILED",
        environment: "PRODUCTION",
        destinationType: "INTERNAL",
        createdBy: ownerUser.id,
        error: secretObj,
        metadata: { sftpHost: "sftp.example.com", password: "leaked_in_metadata" },
      },
    });

    const retrievedDeploy = await getDeploymentById(standardWebsite.id, secretDeploy.id, ownerUser.id);
    const retrievedDeployments = await getWebsiteDeployments(standardWebsite.id, ownerUser.id);
    const retrievedFromList = retrievedDeployments.find((d: any) => d.id === secretDeploy.id);

    record(
      assert(
        sanitized.password === "[REDACTED]" &&
        sanitized.apiKey === "[REDACTED]" &&
        sanitized.token === "[REDACTED]" &&
        sanitized.authorization.includes("[REDACTED]") &&
        sanitized.connectionUrl.includes("[REDACTED]") &&
        sanitized.safeField === "production-server-1" &&
        retrievedDeploy.error.password === "[REDACTED]" &&
        retrievedDeploy.metadata.password === "[REDACTED]" &&
        retrievedFromList.error.password === "[REDACTED]" &&
        retrievedFromList.metadata.password === "[REDACTED]",
        "Test 10: Sensitive tokens, passwords, and connection secrets are strictly redacted on retrieval and persistence"
      )
    );

    // =========================================================================
    // Test 11: Workspace Ownership & Membership Authorization
    // =========================================================================
    // Publish a deployment on the workspace website by owner
    const wsPublishRes = await publishWebsite(workspaceWebsite.id, ownerUser.id, {
      destinationType: "INTERNAL",
    });

    // Workspace member should be allowed to view deployments
    const wsMemberDeployments = await getWebsiteDeployments(workspaceWebsite.id, workspaceMemberUser.id);
    const wsMemberDeployment = await getDeploymentById(workspaceWebsite.id, wsPublishRes.deploymentId, workspaceMemberUser.id);

    // Workspace member with 'MEMBER' role should NOT have publish or retry permissions (strictly 403 Forbidden)
    let memberPublishBlocked = false;
    try {
      await publishWebsite(workspaceWebsite.id, workspaceMemberUser.id, {
        destinationType: "INTERNAL",
      });
    } catch (err: any) {
      memberPublishBlocked = err.statusCode === 403 || err.code === "FORBIDDEN";
    }

    let memberRetryBlocked = false;
    try {
      await retryDeployment(workspaceWebsite.id, wsPublishRes.deploymentId, workspaceMemberUser.id);
    } catch (err: any) {
      memberRetryBlocked = err.statusCode === 403 || err.code === "FORBIDDEN";
    }

    // Foreign user without workspace membership or collaborator role should be strictly blocked (403/404)
    let foreignUserBlocked = false;
    try {
      await getWebsiteDeployments(workspaceWebsite.id, unauthorizedUser.id);
    } catch (err: any) {
      foreignUserBlocked = err.statusCode === 403 || err.statusCode === 404 || err.code === "FORBIDDEN" || err.code === "WEBSITE_NOT_FOUND";
    }

    record(
      assert(
        wsMemberDeployments.length > 0 &&
        wsMemberDeployment.id === wsPublishRes.deploymentId &&
        memberPublishBlocked &&
        memberRetryBlocked &&
        foreignUserBlocked,
        "Test 11: Workspace members inherit deployment visibility but cannot publish/retry; foreign users are strictly blocked"
      )
    );

    // =========================================================================
    // Test 12: Deployment status enums completeness
    // =========================================================================
    const expectedStatuses = [
      "QUEUED", "VALIDATING", "BUILDING", "PROCESSING", "DEPLOYING",
      "VERIFYING", "PUBLISHED", "RECONCILIATION_REQUIRED", "VALIDATION_FAILED",
      "BUILD_FAILED", "DEPLOY_FAILED", "DEPLOYMENT_FAILED", "VERIFICATION_FAILED", "ROLLED_BACK"
    ];
    const hasAll = expectedStatuses.every((st) => (VALID_DEPLOYMENT_STATUSES as readonly string[]).includes(st));

    record(
      assert(
        hasAll && VALID_DEPLOYMENT_STATUSES.length >= 14,
        "Test 12: VALID_DEPLOYMENT_STATUSES comprehensive enum definitions cover all lifecycle and failure states"
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
        await db.website.delete({ where: { id: standardWebsite.id } });
      }
      if (workspaceWebsite?.id) {
        await db.deployment.deleteMany({ where: { websiteId: workspaceWebsite.id } });
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

runDeploymentStatusesTests();
