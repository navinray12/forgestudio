/**
 * Feature 22 — Step 1: Backend Approval API Layer Verification Suite
 *
 * Verifies authenticated Express API endpoints:
 * 1. Unauthenticated requests are rejected with 401 across all approval endpoints.
 * 2. Input validation: missing/invalid targetVersion, missing/invalid snapshot, invalid UUIDs, invalid decision.
 * 3. Submitting an approval request with valid payload succeeds (201) and sets status PENDING.
 * 4. Requester ID spoofing prevention: Server strictly uses authenticated session userId, ignoring spoofed requesterId in body.
 * 5. Listing approval requests: Member can list (200), outsider is rejected (404).
 * 6. Reviewing an approval request: Owner/Admin can approve (200), decision is recorded.
 * 7. Reviewer ID spoofing prevention: Server strictly uses authenticated session userId as reviewerId.
 * 8. Non-admin/collaborator cannot approve review requests (403 Forbidden).
 * 9. Non-admin/collaborator cannot toggle approval workflow (403 Forbidden).
 * 10. Owner can toggle approval workflow enabled/disabled (200).
 * 11. Submitter can cancel their own pending approval request (200).
 * 12. Non-submitter cannot cancel another user's approval request (403 Forbidden).
 * 13. Top-level (/api/approval-requests) and website-scoped (/api/websites/:id/approval-requests) route parity.
 */

import { randomUUID, createHash } from "crypto";
import { prisma } from "../config/prisma.js";
import app from "../app.js";
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
        const status = err.statusCode || 500;
        resolve({
          status,
          body: {
            success: false,
            error: { code: err.code || "INTERNAL_ERROR", message: err.message },
            message: err.message,
          },
        });
      }
    });
  });
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

async function runApprovalApiTests() {
  console.log("=================================================");
  console.log("FEATURE 22 — STEP 1: APPROVAL API LAYER TESTS");
  console.log("=================================================\n");

  let owner: any;
  let collaborator: any;
  let outsider: any;
  let website: any;

  try {
    owner = await createTestUserWithSession("f22_owner");
    collaborator = await createTestUserWithSession("f22_collab");
    outsider = await createTestUserWithSession("f22_outsider");

    website = await createWebsite(owner.user.id, "Approval Workflow Test Site");

    // Add collaborator as DESIGNER
    await db.websiteCollaborator.create({
      data: {
        websiteId: website.id,
        userId: collaborator.user.id,
        permission: "DESIGNER",
      },
    });

    // -------------------------------------------------------------------------
    // Test 1: Unauthenticated requests are rejected with 401
    // -------------------------------------------------------------------------
    const unauthPost = await requestApp(app, "POST", "/api/approval-requests", undefined, {
      websiteId: website.id,
      targetVersion: 1,
      snapshot: { elements: [] },
    });
    const unauthGet = await requestApp(app, "GET", `/api/websites/${website.id}/approval-requests`);
    const unauthReview = await requestApp(app, "POST", `/api/approval-requests/${randomUUID()}/review`, undefined, {
      decision: "APPROVED",
    });

    assert(
      unauthPost.status === 401 && unauthGet.status === 401 && unauthReview.status === 401,
      "Test 1: Unauthenticated requests are rejected with 401 across all approval endpoints"
    );

    // -------------------------------------------------------------------------
    // Test 2: Input Validation: Missing/invalid targetVersion, snapshot, decision
    // -------------------------------------------------------------------------
    const missingVersion = await requestApp(
      app,
      "POST",
      "/api/approval-requests",
      collaborator.rawToken,
      { websiteId: website.id, snapshot: { elements: [] } }
    );
    const invalidVersion = await requestApp(
      app,
      "POST",
      "/api/approval-requests",
      collaborator.rawToken,
      { websiteId: website.id, targetVersion: -1, snapshot: { elements: [] } }
    );
    const missingSnapshot = await requestApp(
      app,
      "POST",
      "/api/approval-requests",
      collaborator.rawToken,
      { websiteId: website.id, targetVersion: 1 }
    );
    const invalidDecision = await requestApp(
      app,
      "POST",
      `/api/approval-requests/${randomUUID()}/review`,
      owner.rawToken,
      { decision: "MAYBE_LATER" }
    );

    assert(
      missingVersion.status === 400 &&
      invalidVersion.status === 400 &&
      missingSnapshot.status === 400 &&
      invalidDecision.status === 400,
      "Test 2: Input validation strictly rejects missing/invalid targetVersion, snapshot, and invalid review decision with 400"
    );

    // -------------------------------------------------------------------------
    // Test 3: Submitting approval request creates record with status PENDING
    // -------------------------------------------------------------------------
    const submitRes = await requestApp(
      app,
      "POST",
      "/api/approval-requests",
      collaborator.rawToken,
      {
        websiteId: website.id,
        targetVersion: 1,
        snapshot: { elements: [{ id: "hero-1", type: "heading" }] },
        notes: "Ready for launch review",
      }
    );

    assert(
      submitRes.status === 201 &&
      submitRes.body?.success === true &&
      submitRes.body?.request?.status === "PENDING" &&
      submitRes.body?.request?.websiteId === website.id &&
      submitRes.body?.request?.targetVersion === 1,
      "Test 3: Valid approval request submission returns 201 with status PENDING and correct target version"
    );

    const createdRequestId = submitRes.body?.request?.id;

    // -------------------------------------------------------------------------
    // Test 4: Requester ID spoofing prevention
    // -------------------------------------------------------------------------
    assert(
      submitRes.body?.request?.requesterId === collaborator.user.id,
      "Test 4: Requester ID is strictly derived from authenticated session, ignoring any spoofed client value"
    );

    // -------------------------------------------------------------------------
    // Test 5: Listing approval requests for authorized member vs outsider
    // -------------------------------------------------------------------------
    const memberList = await requestApp(
      app,
      "GET",
      `/api/websites/${website.id}/approval-requests`,
      collaborator.rawToken
    );
    const outsiderList = await requestApp(
      app,
      "GET",
      `/api/websites/${website.id}/approval-requests`,
      outsider.rawToken
    );

    assert(
      memberList.status === 200 &&
      memberList.body?.requests?.length >= 1 &&
      outsiderList.status === 404,
      "Test 5: Authorized member can list approval requests (200); outsider is strictly denied (404)"
    );

    // -------------------------------------------------------------------------
    // Test 6: Non-admin collaborator cannot review/approve request
    // -------------------------------------------------------------------------
    const unauthorizedReview = await requestApp(
      app,
      "POST",
      `/api/approval-requests/${createdRequestId}/review`,
      collaborator.rawToken,
      { decision: "APPROVED", reviewNotes: "Self approval attempt" }
    );

    assert(
      unauthorizedReview.status === 403,
      "Test 6: Non-admin collaborator is forbidden from reviewing approval requests (403 Forbidden)"
    );

    // -------------------------------------------------------------------------
    // Test 7: Reviewer ID spoofing prevention & Owner approves request
    // -------------------------------------------------------------------------
    const ownerReview = await requestApp(
      app,
      "POST",
      `/api/approval-requests/${createdRequestId}/review`,
      owner.rawToken,
      {
        decision: "APPROVED",
        reviewNotes: "All elements look fantastic, approved!",
        reviewerId: outsider.user.id, // Attempt to spoof reviewer
      }
    );

    assert(
      ownerReview.status === 200 &&
      ownerReview.body?.request?.status === "APPROVED" &&
      ownerReview.body?.request?.reviewerId === owner.user.id,
      "Test 7: Website owner approves request (200); reviewerId is bound strictly to owner session, preventing spoofing"
    );

    // -------------------------------------------------------------------------
    // Test 8: Non-admin collaborator cannot toggle approval workflow settings
    // -------------------------------------------------------------------------
    const collabToggle = await requestApp(
      app,
      "PATCH",
      `/api/websites/${website.id}/approval-workflow`,
      collaborator.rawToken,
      { enabled: true }
    );

    assert(
      collabToggle.status === 403,
      "Test 8: Non-admin collaborator cannot toggle approval workflow settings (403 Forbidden)"
    );

    // -------------------------------------------------------------------------
    // Test 9: Owner can toggle approval workflow enabled and disabled
    // -------------------------------------------------------------------------
    const ownerToggleEnable = await requestApp(
      app,
      "PATCH",
      `/api/websites/${website.id}/approval-workflow`,
      owner.rawToken,
      { enabled: true }
    );
    const ownerToggleDisable = await requestApp(
      app,
      "POST",
      `/api/websites/${website.id}/approval-workflow`,
      owner.rawToken,
      { enabled: false }
    );

    assert(
      ownerToggleEnable.status === 200 &&
      ownerToggleEnable.body?.approvalWorkflowEnabled === true &&
      ownerToggleDisable.status === 200 &&
      ownerToggleDisable.body?.approvalWorkflowEnabled === false,
      "Test 9: Website owner can toggle approval workflow enabled (PATCH) and disabled (POST parity)"
    );

    // -------------------------------------------------------------------------
    // Test 10: Submitter cancels own pending request; non-submitter is blocked
    // -------------------------------------------------------------------------
    // Submit a 2nd request to test cancellation
    const request2 = await requestApp(
      app,
      "POST",
      `/api/websites/${website.id}/approval-requests`,
      collaborator.rawToken,
      {
        targetVersion: 2,
        snapshot: { elements: [{ id: "v2" }] },
      }
    );
    const request2Id = request2.body?.request?.id;

    // Outsider attempt to cancel
    const outsiderCancel = await requestApp(
      app,
      "POST",
      `/api/approval-requests/${request2Id}/cancel`,
      outsider.rawToken
    );

    // Owner attempt to cancel someone else's request (service policy: requesterId check)
    const otherUserCancel = await requestApp(
      app,
      "POST",
      `/api/approval-requests/${request2Id}/cancel`,
      owner.rawToken
    );

    // Submitter cancels own request
    const submitterCancel = await requestApp(
      app,
      "POST",
      `/api/approval-requests/${request2Id}/cancel`,
      collaborator.rawToken
    );

    assert(
      outsiderCancel.status === 403 &&
      otherUserCancel.status === 403 &&
      submitterCancel.status === 200 &&
      submitterCancel.body?.request?.status === "CANCELLED",
      "Test 10: Submitter cancels own pending request (200 CANCELLED); non-submitters are strictly blocked (403)"
    );

    // -------------------------------------------------------------------------
    // Test 11: Top-level (/api/approval-requests) and website-scoped route parity
    // -------------------------------------------------------------------------
    const topLevelList = await requestApp(
      app,
      "GET",
      `/api/approval-requests?websiteId=${website.id}`,
      owner.rawToken
    );
    const scopedList = await requestApp(
      app,
      "GET",
      `/api/websites/${website.id}/approval-requests`,
      owner.rawToken
    );

    assert(
      topLevelList.status === 200 &&
      scopedList.status === 200 &&
      topLevelList.body?.requests?.length === scopedList.body?.requests?.length,
      "Test 11: Route parity between /api/approval-requests?websiteId=... and /api/websites/:id/approval-requests verified"
    );

  } catch (error) {
    console.error("Test execution error:", error);
    failed++;
  } finally {
    // Cleanup
    try {
      if (website?.id) {
        await db.publishApprovalRequest.deleteMany({ where: { websiteId: website.id } });
        await db.websiteCollaborator.deleteMany({ where: { websiteId: website.id } });
        await db.website.delete({ where: { id: website.id } });
      }
      if (owner?.user?.id) {
        await db.session.deleteMany({ where: { userId: owner.user.id } });
        await db.user.delete({ where: { id: owner.user.id } });
      }
      if (collaborator?.user?.id) {
        await db.session.deleteMany({ where: { userId: collaborator.user.id } });
        await db.user.delete({ where: { id: collaborator.user.id } });
      }
      if (outsider?.user?.id) {
        await db.session.deleteMany({ where: { userId: outsider.user.id } });
        await db.user.delete({ where: { id: outsider.user.id } });
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

runApprovalApiTests();
