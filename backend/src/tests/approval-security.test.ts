/**
 * Feature 22 — Step 2: Approval Security Verification Suite
 *
 * Covers:
 * 1. Self-approval rejection: Requester cannot approve their own request (403 SELF_APPROVAL_FORBIDDEN).
 * 2. Separate authorized reviewer: A different authorized owner or admin can review and approve a request.
 * 3. Stale approval rejection: Publishing is rejected when current content differs from the approved snapshot (400 SNAPSHOT_MISMATCH).
 * 4. Exact approved content: Can publish successfully and transitions approval to CONSUMED.
 * 5. Single-use enforcement: Reusing the same consumed approval is strictly rejected (403 APPROVAL_REQUIRED).
 * 6. Failed deployment safety: A failed validation or build error does not consume or destroy approval (reverts to APPROVED).
 * 7. Concurrent publish protection: Atomic claim prevents multiple concurrent requests from consuming the same approval (409 APPROVAL_ALREADY_IN_USE).
 * 8. Tenant/Website isolation: Approval for Website A cannot authorize publishing for Website B.
 * 9. Requester isolation: Approval for Requester A cannot authorize publishing for Requester B.
 * 10. Workflow-disabled compatibility: Normal publishing continues to work when approval workflow is disabled.
 * 11. State transition integrity: Already reviewed (APPROVED/REJECTED/CONSUMED) requests cannot be reviewed or cancelled again (400).
 * 12. Durable audit logging: Successful decisions and consumptions create durable AuditLog records; rejected attempts do not.
 */

import { randomUUID, createHash } from "crypto";
import { prisma } from "../config/prisma.js";
import {
  setApprovalWorkflowEnabled,
  submitForPublishApproval,
  reviewPublishApproval,
  cancelPublishApproval,
  isApprovedSnapshotMatch,
  canonicalizeJson,
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
  const ts = Date.now() + Math.floor(Math.random() * 10000);
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

async function runApprovalSecurityTests() {
  console.log("=================================================");
  console.log("FEATURE 22 — STEP 2: APPROVAL SECURITY TESTS");
  console.log("=================================================\n");

  let owner: any;
  let admin: any;
  let member1: any;
  let member2: any;
  let websiteA: any;
  let websiteB: any;

  try {
    owner = await createTestUserWithSession("sec_owner");
    admin = await createTestUserWithSession("sec_admin");
    member1 = await createTestUserWithSession("sec_member1");
    member2 = await createTestUserWithSession("sec_member2");

    websiteA = await createWebsite(owner.user.id, "Approval Sec Site A");
    websiteB = await createWebsite(owner.user.id, "Approval Sec Site B");

    // Collaborators on Website A:
    // admin user as ADMIN
    await db.websiteCollaborator.create({
      data: { websiteId: websiteA.id, userId: admin.user.id, permission: "ADMIN" },
    });
    // member1 user as DESIGNER
    await db.websiteCollaborator.create({
      data: { websiteId: websiteA.id, userId: member1.user.id, permission: "DESIGNER" },
    });
    // member2 user as DESIGNER
    await db.websiteCollaborator.create({
      data: { websiteId: websiteA.id, userId: member2.user.id, permission: "DESIGNER" },
    });

    // Enable approval workflow on Website A
    await setApprovalWorkflowEnabled(websiteA.id, owner.user.id, true);

    // -------------------------------------------------------------------------
    // Test 1: Self-approval rejection
    // -------------------------------------------------------------------------
    // Admin submits approval request for website A
    const adminReq = await submitForPublishApproval(
      websiteA.id,
      admin.user.id,
      1,
      { elements: [{ id: "el-admin-1", type: "heading" }] },
      "Admin request needing review"
    );

    let selfApprovalBlocked = false;
    try {
      await reviewPublishApproval(adminReq.id, admin.user.id, "APPROVED", "Self-approving my own request");
    } catch (e: any) {
      selfApprovalBlocked = e.statusCode === 403 && e.code === "SELF_APPROVAL_FORBIDDEN";
    }

    assert(
      selfApprovalBlocked,
      "Test 1: Self-approval is strictly rejected when reviewerId === requesterId (403 SELF_APPROVAL_FORBIDDEN)"
    );

    // -------------------------------------------------------------------------
    // Test 2: Separate authorized reviewer can review and approve
    // -------------------------------------------------------------------------
    const ownerReview = await reviewPublishApproval(
      adminReq.id,
      owner.user.id,
      "APPROVED",
      "Owner approved admin's submission"
    );

    assert(
      ownerReview.status === "APPROVED" &&
      ownerReview.reviewerId === owner.user.id &&
      ownerReview.reviewedAt !== null,
      "Test 2: A different authorized owner can successfully review and approve the request"
    );

    // Cancel / cleanup adminReq to avoid conflict
    await db.publishApprovalRequest.update({
      where: { id: adminReq.id },
      data: { status: "CONSUMED" },
    });

    // -------------------------------------------------------------------------
    // Test 3: Stale approval rejection (candidate differs from approved snapshot)
    // -------------------------------------------------------------------------
    const approvedSnapshot = { elements: [{ id: "approved-hero", type: "heading", text: "Approved Content" }] };
    const member1Req = await submitForPublishApproval(
      websiteA.id,
      member1.user.id,
      1,
      approvedSnapshot,
      "Member1 submission"
    );

    await reviewPublishApproval(member1Req.id, owner.user.id, "APPROVED", "Approved by owner");

    // Update website editorData to modified/unapproved content
    const modifiedCandidate = { elements: [{ id: "approved-hero", type: "heading", text: "Malicious Unapproved Content" }] };
    await db.website.update({
      where: { id: websiteA.id },
      data: { editorData: modifiedCandidate },
    });

    let stalePublishRejected = false;
    try {
      await publishWebsite(websiteA.id, member1.user.id);
    } catch (e: any) {
      stalePublishRejected = e.statusCode === 400 && e.code === "SNAPSHOT_MISMATCH";
    }

    assert(
      stalePublishRejected,
      "Test 3: Publishing is strictly rejected when current content differs from the approved snapshot (400 SNAPSHOT_MISMATCH)"
    );

    // -------------------------------------------------------------------------
    // Test 4: Exact approved content publishes once and consumes approval
    // -------------------------------------------------------------------------
    // Restore website editorData to exact approved content
    await db.website.update({
      where: { id: websiteA.id },
      data: { editorData: approvedSnapshot },
    });

    const publishSuccess = await publishWebsite(websiteA.id, member1.user.id);

    const consumedReq = await db.publishApprovalRequest.findUnique({
      where: { id: member1Req.id },
    });

    assert(
      publishSuccess.success === true &&
      publishSuccess.status === "PUBLISHED" &&
      consumedReq.status === "CONSUMED",
      "Test 4: Exact approved content publishes successfully and atomically transitions approval request to CONSUMED"
    );

    // -------------------------------------------------------------------------
    // Test 5: Reusing the same consumed approval is strictly rejected
    // -------------------------------------------------------------------------
    let replayRejected = false;
    try {
      await publishWebsite(websiteA.id, member1.user.id);
    } catch (e: any) {
      replayRejected = e.statusCode === 403 && e.code === "APPROVAL_REQUIRED";
    }

    assert(
      replayRejected,
      "Test 5: Reusing a consumed approval is strictly rejected with 403 APPROVAL_REQUIRED"
    );

    // -------------------------------------------------------------------------
    // Test 6: Failed deployment does not consume approval (reverts to APPROVED)
    // -------------------------------------------------------------------------
    const validSnapshotForFail = { elements: [{ id: "btn-valid-1", type: "button" }] };
    const member1ReqFail = await submitForPublishApproval(
      websiteA.id,
      member1.user.id,
      2,
      validSnapshotForFail,
      "Submission for failure test"
    );
    await reviewPublishApproval(member1ReqFail.id, owner.user.id, "APPROVED");

    // Set editorData to match snapshot so snapshot check passes, but pass invalid destinationType to trigger error
    await db.website.update({
      where: { id: websiteA.id },
      data: { editorData: validSnapshotForFail },
    });

    try {
      // Destination SFTP with no active SFTP connection triggers SFTP_CONFIG_MISSING
      await publishWebsite(websiteA.id, member1.user.id, { destinationType: "SFTP" });
    } catch (e) {}

    const reqAfterFail = await db.publishApprovalRequest.findUnique({
      where: { id: member1ReqFail.id },
    });

    assert(
      reqAfterFail.status === "APPROVED",
      "Test 6: A failed deployment does not consume approval; status safely reverts to APPROVED"
    );

    // Clean up
    await db.publishApprovalRequest.update({ where: { id: member1ReqFail.id }, data: { status: "CONSUMED" } });

    // -------------------------------------------------------------------------
    // Test 7: Concurrent publish attempts cannot both consume one approval
    // -------------------------------------------------------------------------
    const validSnapshotConcur = { elements: [{ id: "concur-1", type: "text" }] };
    const concurReq = await submitForPublishApproval(
      websiteA.id,
      member1.user.id,
      3,
      validSnapshotConcur,
      "Concurrent test submission"
    );
    await reviewPublishApproval(concurReq.id, owner.user.id, "APPROVED");

    await db.website.update({
      where: { id: websiteA.id },
      data: { editorData: validSnapshotConcur },
    });

    // Run 2 publish calls concurrently
    const [res1, res2] = await Promise.allSettled([
      publishWebsite(websiteA.id, member1.user.id),
      publishWebsite(websiteA.id, member1.user.id),
    ]);

    const oneFulfilled = (res1.status === "fulfilled" && res2.status === "rejected") ||
                         (res2.status === "fulfilled" && res1.status === "rejected");
    const rejectionReason = (res1.status === "rejected" ? (res1 as any).reason : (res2 as any).reason);
    const correctRejection = rejectionReason?.code === "APPROVAL_ALREADY_IN_USE" ||
                             rejectionReason?.code === "APPROVAL_REQUIRED";

    assert(
      oneFulfilled && correctRejection,
      "Test 7: Atomic claim prevents concurrent publish requests from consuming the same approval twice"
    );

    // -------------------------------------------------------------------------
    // Test 8: Tenant / Website isolation (Approval on Website B does not work on Website A)
    // -------------------------------------------------------------------------
    await setApprovalWorkflowEnabled(websiteB.id, owner.user.id, true);
    // Add member1 and member2 as DESIGNER on Website B
    await db.websiteCollaborator.create({
      data: { websiteId: websiteB.id, userId: member1.user.id, permission: "DESIGNER" },
    });
    await db.websiteCollaborator.create({
      data: { websiteId: websiteB.id, userId: member2.user.id, permission: "DESIGNER" },
    });

    const siteBSnapshot = { elements: [{ id: "site-b-element", type: "heading" }] };
    const siteBReq = await submitForPublishApproval(
      websiteB.id,
      member1.user.id,
      1,
      siteBSnapshot,
      "Website B submission"
    );
    await reviewPublishApproval(siteBReq.id, owner.user.id, "APPROVED");

    // Member1 tries to publish Website A (which has no approved request)
    let crossSitePublishBlocked = false;
    try {
      await publishWebsite(websiteA.id, member1.user.id);
    } catch (e: any) {
      crossSitePublishBlocked = e.statusCode === 403 && e.code === "APPROVAL_REQUIRED";
    }

    assert(
      crossSitePublishBlocked,
      "Test 8: Approval for Website B strictly cannot authorize publishing on Website A (403 APPROVAL_REQUIRED)"
    );

    // -------------------------------------------------------------------------
    // Test 9: Requester isolation (Approval for Member1 cannot authorize Member2)
    // -------------------------------------------------------------------------
    // Site B has approval for member1. Member2 tries to publish Site B.
    let crossRequesterBlocked = false;
    try {
      await publishWebsite(websiteB.id, member2.user.id);
    } catch (e: any) {
      crossRequesterBlocked = e.statusCode === 403 && e.code === "APPROVAL_REQUIRED";
    }

    assert(
      crossRequesterBlocked,
      "Test 9: Approval for Requester A strictly cannot authorize publishing for Requester B (403 APPROVAL_REQUIRED)"
    );

    // -------------------------------------------------------------------------
    // Test 10: Workflow-disabled publishing continues to work without approval
    // -------------------------------------------------------------------------
    // Disable workflow on Website B
    await setApprovalWorkflowEnabled(websiteB.id, owner.user.id, false);

    const disabledWorkflowPublish = await publishWebsite(websiteB.id, member2.user.id, {
      editorData: { elements: [{ id: "free-publish", type: "heading" }] },
    });

    assert(
      disabledWorkflowPublish.success === true &&
      disabledWorkflowPublish.status === "PUBLISHED",
      "Test 10: Websites with approval workflow disabled continue to publish normally without approval gating"
    );

    // -------------------------------------------------------------------------
    // Test 11: Invalid and unauthorized state transitions are rejected
    // -------------------------------------------------------------------------
    // Try to review an already CONSUMED request
    let reviewConsumedRejected = false;
    try {
      await reviewPublishApproval(member1Req.id, owner.user.id, "APPROVED");
    } catch (e: any) {
      reviewConsumedRejected = e.statusCode === 400 && e.code === "BAD_REQUEST";
    }

    // Try to cancel an already CONSUMED request
    let cancelConsumedRejected = false;
    try {
      await cancelPublishApproval(member1Req.id, member1.user.id);
    } catch (e: any) {
      cancelConsumedRejected = e.statusCode === 400 && e.code === "BAD_REQUEST";
    }

    assert(
      reviewConsumedRejected && cancelConsumedRejected,
      "Test 11: Reviewing or cancelling a non-pending request is rejected with 400 BAD_REQUEST"
    );

    // -------------------------------------------------------------------------
    // Test 12: Audit logs reflect only successful decisions and state changes
    // -------------------------------------------------------------------------
    const auditLogs = await db.auditLog.findMany({
      where: { targetResource: `website:${websiteA.id}` },
      orderBy: { createdAt: "desc" },
    });

    const hasConsumedLog = auditLogs.some((l: any) => l.action === "PUBLISH_APPROVAL_CONSUMED");
    const hasApprovedLog = auditLogs.some((l: any) => l.action === "PUBLISH_APPROVAL_APPROVED");
    const hasNoSelfApprovalLog = !auditLogs.some(
      (l: any) => l.action === "PUBLISH_APPROVAL_APPROVED" && l.userId === admin.user.id
    );

    assert(
      hasConsumedLog && hasApprovedLog && hasNoSelfApprovalLog,
      "Test 12: Durable audit logs reflect successful review approvals and consumption; no audit log written for failed self-approval"
    );

    // -------------------------------------------------------------------------
    // Test 13: Malformed, null, or invalid snapshots fail safely
    // -------------------------------------------------------------------------
    const malformedSafe1 = isApprovedSnapshotMatch("{ invalid json string", { elements: [] }) === false;
    const malformedSafe2 = isApprovedSnapshotMatch(null, { elements: [] }) === false;
    const malformedSafe3 = isApprovedSnapshotMatch({ elements: [] }, "not json") === false;
    const malformedSafe4 = isApprovedSnapshotMatch(undefined, undefined) === false;

    assert(
      malformedSafe1 && malformedSafe2 && malformedSafe3 && malformedSafe4,
      "Test 13: Malformed, null, or non-object snapshots safely evaluate to false without throwing uncaught exceptions"
    );

    // -------------------------------------------------------------------------
    // Test 14: Holistic comparison rejects changes to globalStyles or unapproved pages
    // -------------------------------------------------------------------------
    const baseSnap = { elements: [{ id: "1" }], globalStyles: { primaryColor: "#000" } };
    const alteredStyleCand = { elements: [{ id: "1" }], globalStyles: { primaryColor: "#fff" } };
    const alteredPageCand = { elements: [{ id: "1" }], pages: [{ id: "unapproved-page" }] };

    const styleMismatchBlocked = isApprovedSnapshotMatch(baseSnap, alteredStyleCand) === false;
    const pageMismatchBlocked = isApprovedSnapshotMatch(baseSnap, alteredPageCand) === false;

    assert(
      styleMismatchBlocked && pageMismatchBlocked,
      "Test 14: Snapshot verification strictly rejects candidate content that alters styling or injects unapproved pages"
    );

  } catch (error) {
    console.error("Test execution error:", error);
    failed++;
  } finally {
    // Cleanup
    try {
      if (websiteA?.id) {
        await db.publishApprovalRequest.deleteMany({ where: { websiteId: websiteA.id } });
        await db.deployment.deleteMany({ where: { websiteId: websiteA.id } });
        await db.websiteRevision.deleteMany({ where: { websiteId: websiteA.id } });
        await db.websiteCollaborator.deleteMany({ where: { websiteId: websiteA.id } });
        await db.auditLog.deleteMany({ where: { targetResource: `website:${websiteA.id}` } });
        await db.website.delete({ where: { id: websiteA.id } });
      }
      if (websiteB?.id) {
        await db.publishApprovalRequest.deleteMany({ where: { websiteId: websiteB.id } });
        await db.deployment.deleteMany({ where: { websiteId: websiteB.id } });
        await db.websiteRevision.deleteMany({ where: { websiteId: websiteB.id } });
        await db.websiteCollaborator.deleteMany({ where: { websiteId: websiteB.id } });
        await db.auditLog.deleteMany({ where: { targetResource: `website:${websiteB.id}` } });
        await db.website.delete({ where: { id: websiteB.id } });
      }
      if (owner?.user?.id) {
        await db.session.deleteMany({ where: { userId: owner.user.id } });
        await db.user.delete({ where: { id: owner.user.id } });
      }
      if (admin?.user?.id) {
        await db.session.deleteMany({ where: { userId: admin.user.id } });
        await db.user.delete({ where: { id: admin.user.id } });
      }
      if (member1?.user?.id) {
        await db.session.deleteMany({ where: { userId: member1.user.id } });
        await db.user.delete({ where: { id: member1.user.id } });
      }
      if (member2?.user?.id) {
        await db.session.deleteMany({ where: { userId: member2.user.id } });
        await db.user.delete({ where: { id: member2.user.id } });
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

runApprovalSecurityTests();
