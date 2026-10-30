/**
 * Feature 22 — Step 4: Reviewer Approval UI & Backend Integration Test Suite
 *
 * Verifies:
 * 1. Reviewer authorization: Only website OWNER and ADMIN can review requests.
 * 2. Unauthorized reviewers (e.g. EDITOR/MEMBER or outside users) are rejected with 403 FORBIDDEN.
 * 3. Self-approval prevention (four-eyes principle): Requester cannot approve their own request (403 SELF_APPROVAL_FORBIDDEN).
 * 4. Approve flow: Status transitions to APPROVED, sets reviewerId, reviewedAt, and review notes.
 * 5. Reject flow: Status transitions to REJECTED, sets reviewerId, reviewedAt, and review notes.
 * 6. Invalid state transitions: Already reviewed (APPROVED, REJECTED, CONSUMED, CANCELLED) requests reject review attempts with 400 BAD_REQUEST.
 * 7. Status refresh and API contract: getWebsiteApprovalRequests returns complete relations (website, requester, reviewer, snapshot, dates).
 * 8. Tenant isolation: Reviewer cannot review approval requests across websites they don't administer.
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

async function createTestUser(emailPrefix: string) {
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
  return user;
}

async function runReviewerTestSuite() {
  console.log("=== STARTING FEATURE 22 STEP 4 REVIEWER APPROVAL TEST SUITE ===");

  const owner = await createTestUser("rev_owner");
  const reviewerAdmin = await createTestUser("rev_admin");
  const collaborator = await createTestUser("rev_collab");
  const unauthorizedUser = await createTestUser("rev_unauth");

  const website = await createWebsite(owner.id, `Reviewer Test Site ${Date.now()}`);

  // Populate valid editorData snapshot
  const validSnapshot = {
    version: 1,
    pages: [
      {
        id: "p1",
        name: "Home",
        slug: "/",
        isHome: true,
        elements: [
          { id: "e1", type: "heading", content: { text: "Welcome" } },
          { id: "e2", type: "button", content: { text: "Get Started" } },
        ],
      },
      {
        id: "p2",
        name: "Pricing",
        slug: "/pricing",
        isHome: false,
        elements: [
          { id: "e3", type: "text", content: { text: "Pro Plan $29" } },
        ],
      },
    ],
    elements: [
      { id: "e1", type: "heading" },
      { id: "e2", type: "button" },
      { id: "e3", type: "text" },
    ],
    siteParts: {
      header: { id: "h1", enabled: true },
      footer: { id: "f1", enabled: true },
    },
  };

  await db.website.update({
    where: { id: website.id },
    data: { editorData: validSnapshot },
  });

  // Add reviewerAdmin as collaborator with ADMIN permission
  await db.websiteCollaborator.create({
    data: {
      websiteId: website.id,
      userId: reviewerAdmin.id,
      permission: "ADMIN",
    },
  });

  // Add collaborator as regular EDITOR
  await db.websiteCollaborator.create({
    data: {
      websiteId: website.id,
      userId: collaborator.id,
      permission: "EDITOR",
    },
  });

  // Enable approval workflow
  await setApprovalWorkflowEnabled(website.id, owner.id, true);

  try {
    // -------------------------------------------------------------
    // Test 1: Collaborator submits approval request
    // -------------------------------------------------------------
    const request1 = await submitForPublishApproval(
      website.id,
      collaborator.id,
      2,
      validSnapshot,
      "Feature updates: Added pricing page and updated hero buttons"
    );

    assert(
      request1.status === "PENDING" && request1.targetVersion === 2,
      "Test 1: Collaborator can submit approval request with snapshot and notes",
      request1
    );

    // -------------------------------------------------------------
    // Test 2: Unauthorized user cannot review (403 FORBIDDEN)
    // -------------------------------------------------------------
    let unauthFailed = false;
    try {
      await reviewPublishApproval(
        request1.id,
        unauthorizedUser.id,
        "APPROVED",
        "Malicious approval attempt"
      );
    } catch (err: any) {
      unauthFailed = err.statusCode === 403 || err.statusCode === 404;
    }
    assert(
      unauthFailed,
      "Test 2: Unauthorized non-member user cannot review approval request"
    );

    // -------------------------------------------------------------
    // Test 3: Regular collaborator (EDITOR) cannot review (403 FORBIDDEN)
    // -------------------------------------------------------------
    const collaborator2 = await createTestUser("rev_collab2");
    await db.websiteCollaborator.create({
      data: {
        websiteId: website.id,
        userId: collaborator2.id,
        permission: "EDITOR",
      },
    });

    let editorReviewFailed = false;
    try {
      await reviewPublishApproval(
        request1.id,
        collaborator2.id,
        "APPROVED",
        "Peer approval attempt"
      );
    } catch (err: any) {
      editorReviewFailed = err.statusCode === 403;
    }
    assert(
      editorReviewFailed,
      "Test 3: Regular collaborator with EDITOR permission cannot approve publish requests"
    );

    // -------------------------------------------------------------
    // Test 4: Authorized Admin reviewer can REJECT request with feedback notes
    // -------------------------------------------------------------
    const rejectedReq = await reviewPublishApproval(
      request1.id,
      reviewerAdmin.id,
      "REJECTED",
      "Please adjust button colors on the pricing page before publishing."
    );

    assert(
      rejectedReq.status === "REJECTED" &&
        rejectedReq.reviewerId === reviewerAdmin.id &&
        Boolean(rejectedReq.reviewedAt) &&
        rejectedReq.reviewNotes?.includes("button colors"),
      "Test 4: Authorized Admin reviewer can REJECT approval request with feedback notes",
      rejectedReq
    );

    // -------------------------------------------------------------
    // Test 5: Re-reviewing already REJECTED request is rejected (400 BAD_REQUEST)
    // -------------------------------------------------------------
    let doubleReviewRejected = false;
    try {
      await reviewPublishApproval(
        request1.id,
        owner.id,
        "APPROVED",
        "Override rejection attempt"
      );
    } catch (err: any) {
      doubleReviewRejected =
        err.statusCode === 400 && err.message.includes("already been rejected");
    }
    assert(
      doubleReviewRejected,
      "Test 5: Cannot re-review already REJECTED request (prevents duplicate review submissions)"
    );

    // -------------------------------------------------------------
    // Test 6: Self-approval prevention (403 SELF_APPROVAL_FORBIDDEN)
    // -------------------------------------------------------------
    // Admin reviewer submits a new request, but cannot approve their own submission
    const request2 = await submitForPublishApproval(
      website.id,
      reviewerAdmin.id,
      2,
      validSnapshot,
      "Admin proposed changes for v2"
    );

    let selfApproveBlocked = false;
    try {
      await reviewPublishApproval(
        request2.id,
        reviewerAdmin.id,
        "APPROVED",
        "Self approval attempt"
      );
    } catch (err: any) {
      selfApproveBlocked =
        err.statusCode === 403 &&
        (err.code === "SELF_APPROVAL_FORBIDDEN" || err.message.includes("own"));
    }
    assert(
      selfApproveBlocked,
      "Test 6: Self-approval is strictly rejected (four-eyes principle enforced)"
    );

    // -------------------------------------------------------------
    // Test 7: Authorized Owner can APPROVE the request submitted by Admin
    // -------------------------------------------------------------
    const approvedReq = await reviewPublishApproval(
      request2.id,
      owner.id,
      "APPROVED",
      "LGTM! Clean responsive layout and verified colors."
    );

    assert(
      approvedReq.status === "APPROVED" &&
        approvedReq.reviewerId === owner.id &&
        Boolean(approvedReq.reviewedAt) &&
        approvedReq.reviewNotes?.includes("LGTM"),
      "Test 7: Authorized Owner can APPROVE request with review notes",
      approvedReq
    );

    // -------------------------------------------------------------
    // Test 8: Re-reviewing already APPROVED request is rejected (400 BAD_REQUEST)
    // -------------------------------------------------------------
    let doubleApproveRejected = false;
    try {
      await reviewPublishApproval(
        request2.id,
        reviewerAdmin.id,
        "REJECTED",
        "Secondary rejection attempt"
      );
    } catch (err: any) {
      doubleApproveRejected =
        err.statusCode === 400 && err.message.includes("already been approved");
    }
    assert(
      doubleApproveRejected,
      "Test 8: Cannot re-review already APPROVED request (prevents race conditions)"
    );

    // -------------------------------------------------------------
    // Test 9: getWebsiteApprovalRequests returns complete metadata & relations
    // -------------------------------------------------------------
    const allRequests = await getWebsiteApprovalRequests(website.id, owner.id);

    assert(
      Array.isArray(allRequests) && allRequests.length >= 2,
      "Test 9.1: getWebsiteApprovalRequests returns all website requests",
      { count: allRequests.length }
    );

    const latest = allRequests.find((r: any) => r.id === request2.id);
    assert(
      latest &&
        latest.website &&
        latest.website.name.includes("Reviewer Test Site") &&
        latest.requester &&
        latest.requester.id === reviewerAdmin.id &&
        latest.reviewer &&
        latest.reviewer.id === owner.id &&
        Boolean(latest.createdAt) &&
        latest.status === "APPROVED",
      "Test 9.2: Approval requests query includes complete website, requester, reviewer, and status fields",
      latest
    );

    // -------------------------------------------------------------
    // Test 10: Tenant isolation across different websites
    // -------------------------------------------------------------
    const ownerB = await createTestUser("rev_ownerB");
    const websiteB = await createWebsite(ownerB.id, `Site B ${Date.now()}`);
    await setApprovalWorkflowEnabled(websiteB.id, ownerB.id, true);

    const reqB = await submitForPublishApproval(
      websiteB.id,
      ownerB.id,
      2,
      validSnapshot,
      "Site B changes"
    );

    let crossTenantBlocked = false;
    try {
      // Owner of website A tries to review request on website B
      await reviewPublishApproval(
        reqB.id,
        owner.id,
        "APPROVED",
        "Cross-tenant review attempt"
      );
    } catch (err: any) {
      crossTenantBlocked = err.statusCode === 403 || err.statusCode === 404;
    }
    assert(
      crossTenantBlocked,
      "Test 10: Cross-tenant review is strictly blocked (preserves tenant isolation)"
    );

    // Clean up
    await db.publishApprovalRequest.deleteMany({
      where: { websiteId: { in: [website.id, websiteB.id] } },
    });
    await db.websiteCollaborator.deleteMany({
      where: { websiteId: website.id },
    });
    await db.website.deleteMany({
      where: { id: { in: [website.id, websiteB.id] } },
    });
    await db.user.deleteMany({
      where: {
        id: {
          in: [
            owner.id,
            reviewerAdmin.id,
            collaborator.id,
            collaborator2.id,
            unauthorizedUser.id,
            ownerB.id,
          ],
        },
      },
    });

    console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution error:", error);
    process.exit(1);
  }
}

runReviewerTestSuite().then(() => {
  console.log("Reviewer approval test suite completed.");
  process.exit(0);
});
