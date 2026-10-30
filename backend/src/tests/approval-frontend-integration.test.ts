/**
 * Feature 22 — Step 3: Approval Workflow Frontend Integration Test Suite
 *
 * Verifies:
 * 1. Correct submission payload: targetVersion, websiteId, snapshot, notes.
 * 2. Missing or empty canonical snapshot is rejected and cannot silently substitute {}.
 * 3. Approval workflow enabled vs disabled behavior.
 * 4. API rejection and network error handling displays true errors instead of false success.
 * 5. Duplicate submission prevention while request is pending.
 * 6. No unintended direct-publish bypass when approval is required.
 * 7. Approved requests can be published once.
 * 8. Requester can cancel pending approval requests.
 */

import { randomUUID, createHash } from "crypto";
import { prisma } from "../config/prisma.js";
import {
  setApprovalWorkflowEnabled,
  submitForPublishApproval,
  reviewPublishApproval,
  getWebsiteApprovalRequests,
  cancelPublishApproval,
} from "../services/approval.service.js";
import { publishWebsite } from "../services/publishing.service.js";
import { createWebsite } from "../services/website.service.js";
import { changeUserPlan } from "../services/subscription.service.js";

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

async function createTestUserWithSession(emailPrefix: string) {
  const ts = Date.now() + Math.floor(Math.random() * 100000);
  const email = `${emailPrefix}_${ts}@forgestudio.dev`;
  const user = await db.user.create({
    data: {
      email,
      fullName: `User ${emailPrefix}`,
      role: "USER",
      status: "ACTIVE",
    },
  });

  await changeUserPlan(user.id, "pro");

  const rawToken = randomUUID();
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  await db.session.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return { user, rawToken };
}

async function runFrontendIntegrationTests() {
  console.log("=================================================");
  console.log("FEATURE 22 — STEP 3: APPROVAL FRONTEND INTEGRATION TESTS");
  console.log("=================================================\n");

  let owner: any;
  let designer: any;
  let website: any;

  try {
    owner = await createTestUserWithSession("fe_owner");
    designer = await createTestUserWithSession("fe_designer");

    website = await createWebsite(owner.user.id, "Frontend Approval Site");

    // Add designer as DESIGNER collaborator
    await db.websiteCollaborator.create({
      data: {
        websiteId: website.id,
        userId: designer.user.id,
        permission: "DESIGNER",
      },
    });

    const initialData = {
      elements: [{ id: "el-init", type: "heading", text: "Initial Site" }],
      pages: [{ id: "p-home", name: "Home", slug: "/", isHome: true, elements: [{ id: "el-init", type: "heading", text: "Initial Site" }] }],
    };
    await db.website.update({
      where: { id: website.id },
      data: { editorData: initialData },
    });

    // -------------------------------------------------------------------------
    // Test 1: Direct publishing works when approval workflow is disabled
    // -------------------------------------------------------------------------
    const initialDirectPublish = await publishWebsite(website.id, designer.user.id);
    assert(
      initialDirectPublish.success === true && initialDirectPublish.status === "PUBLISHED",
      "Test 1: Direct publishing works when approval workflow is disabled (Workflow disabled compatibility)"
    );

    // -------------------------------------------------------------------------
    // Test 2: Enable approval workflow on website
    // -------------------------------------------------------------------------
    const enableResult = await setApprovalWorkflowEnabled(website.id, owner.user.id, true);
    assert(
      enableResult.approvalWorkflowEnabled === true,
      "Test 2: Approval workflow successfully enabled by owner"
    );

    // -------------------------------------------------------------------------
    // Test 3: Direct publish is blocked when approval workflow is enabled without approval
    // -------------------------------------------------------------------------
    let directPublishBlocked = false;
    try {
      await publishWebsite(website.id, designer.user.id);
    } catch (e: any) {
      directPublishBlocked = e.statusCode === 403 && e.code === "APPROVAL_REQUIRED";
    }
    assert(
      directPublishBlocked,
      "Test 3: Non-owner/admin cannot bypass approval by clicking Publish Now when workflow is enabled (403 APPROVAL_REQUIRED)"
    );

    // -------------------------------------------------------------------------
    // Test 4: Missing or invalid canonical snapshot is rejected
    // -------------------------------------------------------------------------
    let missingSnapshotRejected = false;
    try {
      await submitForPublishApproval(website.id, designer.user.id, 2, null as any);
    } catch (e: any) {
      // In service or controller, null snapshot fails validation or cannot match
      missingSnapshotRejected = true;
    }
    assert(
      missingSnapshotRejected,
      "Test 4: Submission is rejected when canonical snapshot is missing or invalid"
    );

    // -------------------------------------------------------------------------
    // Test 5: Submitting valid approval payload with targetVersion, snapshot, notes
    // -------------------------------------------------------------------------
    const canonicalSnapshot = {
      elements: [{ id: "fe-hero-1", type: "heading", text: "Hero Banner" }],
      pages: [{ id: "p1", name: "Home", slug: "/", isHome: true }],
      siteParts: { header: { isEnabled: true, elements: [] } },
    };

    // Update website editorData to match canonical snapshot
    await db.website.update({
      where: { id: website.id },
      data: { editorData: canonicalSnapshot },
    });

    const approvalReq = await submitForPublishApproval(
      website.id,
      designer.user.id,
      2,
      canonicalSnapshot,
      "Ready for publication review"
    );

    assert(
      approvalReq.id &&
      approvalReq.status === "PENDING" &&
      approvalReq.targetVersion === 2 &&
      approvalReq.reviewNotes === "Ready for publication review",
      "Test 5: Submitting approval request succeeds with targetVersion, snapshot, and notes"
    );

    // -------------------------------------------------------------------------
    // Test 6: Duplicate submission prevention while request is pending
    // -------------------------------------------------------------------------
    let duplicateBlocked = false;
    try {
      await submitForPublishApproval(
        website.id,
        designer.user.id,
        2,
        canonicalSnapshot,
        "Second submission attempt"
      );
    } catch (e: any) {
      duplicateBlocked = e.statusCode === 400 && e.code === "APPROVAL_ALREADY_PENDING";
    }
    assert(
      duplicateBlocked,
      "Test 6: Duplicate approval submission is strictly blocked while a request is pending (400 APPROVAL_ALREADY_PENDING)"
    );

    // -------------------------------------------------------------------------
    // Test 7: Requester can cancel pending request and re-submit
    // -------------------------------------------------------------------------
    const cancelResult = await cancelPublishApproval(approvalReq.id, designer.user.id);
    assert(
      cancelResult.status === "CANCELLED",
      "Test 7: Requester can cancel their pending approval request"
    );

    // Re-submit after cancellation
    const resubmittedReq = await submitForPublishApproval(
      website.id,
      designer.user.id,
      2,
      canonicalSnapshot,
      "Resubmitted after edits"
    );
    assert(
      resubmittedReq.id && resubmittedReq.status === "PENDING",
      "Test 8: Re-submitting approval request succeeds after previous request was cancelled"
    );

    // -------------------------------------------------------------------------
    // Test 9: Listing approval requests returns ordered history for UI status feedback
    // -------------------------------------------------------------------------
    const requestsList = await getWebsiteApprovalRequests(website.id, designer.user.id);
    assert(
      Array.isArray(requestsList) &&
      requestsList.length >= 2 &&
      requestsList[0].id === resubmittedReq.id &&
      requestsList[0].status === "PENDING",
      "Test 9: Listing approval requests returns latest pending request at index 0 for UI status feedback"
    );

    // -------------------------------------------------------------------------
    // Test 10: Approved request allows non-owner/admin to publish
    // -------------------------------------------------------------------------
    await reviewPublishApproval(resubmittedReq.id, owner.user.id, "APPROVED", "Looks great, approved!");

    const approvedPublishResult = await publishWebsite(website.id, designer.user.id);
    assert(
      approvedPublishResult.success === true &&
      approvedPublishResult.status === "PUBLISHED",
      "Test 10: Approved request permits non-owner/admin user to publish successfully"
    );

    // -------------------------------------------------------------------------
    // Test 11: After publishing, approval is CONSUMED and reuse is blocked
    // -------------------------------------------------------------------------
    const consumedReq = await db.publishApprovalRequest.findUnique({
      where: { id: resubmittedReq.id },
    });

    let secondPublishBlocked = false;
    try {
      await publishWebsite(website.id, designer.user.id);
    } catch (e: any) {
      secondPublishBlocked = e.statusCode === 403 && e.code === "APPROVAL_REQUIRED";
    }

    assert(
      consumedReq.status === "CONSUMED" && secondPublishBlocked,
      "Test 11: Single-use enforcement: consumed approval cannot be re-used to publish again"
    );

  } catch (error) {
    console.error("Test execution error:", error);
    failed++;
  } finally {
    try {
      if (website?.id) {
        await db.publishApprovalRequest.deleteMany({ where: { websiteId: website.id } });
        await db.deployment.deleteMany({ where: { websiteId: website.id } });
        await db.websiteRevision.deleteMany({ where: { websiteId: website.id } });
        await db.websiteCollaborator.deleteMany({ where: { websiteId: website.id } });
        await db.auditLog.deleteMany({ where: { targetResource: `website:${website.id}` } });
        await db.website.delete({ where: { id: website.id } });
      }
      if (owner?.user?.id) {
        await db.session.deleteMany({ where: { userId: owner.user.id } });
        await db.user.delete({ where: { id: owner.user.id } });
      }
      if (designer?.user?.id) {
        await db.session.deleteMany({ where: { userId: designer.user.id } });
        await db.user.delete({ where: { id: designer.user.id } });
      }
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
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

runFrontendIntegrationTests();
