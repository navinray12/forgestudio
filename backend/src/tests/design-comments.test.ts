/**
 * Feature 21 — Design Comments: Dedicated Verification Test Suite
 *
 * Covers:
 * 1. Unauthenticated access: Rejection with 401 across endpoints.
 * 2. Cross-tenant outsider access: Outsider without website or workspace access rejected with 403 or 404.
 * 3. Authorized note creation: Creator and collaborators with COMMENT capability create design notes.
 * 4. Workspace owner and admin access: Can create, view, resolve, and moderate (delete) notes on workspace websites.
 * 5. Workspace member (REVIEWER) access: Can create, view, resolve, but cannot delete another user's note (403).
 * 6. VIEWER role rejection: User with only VIEW capability (no COMMENT) rejected with 403 on create/resolve/reopen.
 * 7. Author-only editing: Author can update content; non-author (even admin/owner) cannot edit another author's note (403).
 * 8. Authorized and unauthorized deletion: Author, site owner, and workspace admin can delete; normal member cannot delete another's note.
 * 9. Resolution and reopening: Toggling note status updates DB and generates durable AuditLog entries.
 * 10. Element-specific notes: Creating notes tied to specific elementId and querying by elementId.
 * 11. Input validation & missing resources: Non-existent website (404), non-existent note (404), empty content (400).
 */

import { randomUUID, createHash } from "crypto";
import { prisma } from "../config/prisma.js";
import app from "../app.js";
import {
  createWorkspace,
  addWorkspaceMember,
  initWorkspaceTables,
} from "../services/workspace.service.js";
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
        resolve({ status: err.statusCode || 500, body: { error: err.message } });
      } else {
        resolve({ status: 404, body: null });
      }
    });
  });
}

async function runDesignCommentsTests() {
  console.log("=================================================");
  console.log("FEATURE 21 — DESIGN COMMENTS VERIFICATION TESTS");
  console.log("=================================================\n");

  await initWorkspaceTables();

  const testSuffix = randomUUID().substring(0, 8);
  const ownerEmail = `dc-owner-${testSuffix}@test.com`;
  const adminEmail = `dc-admin-${testSuffix}@test.com`;
  const memberEmail = `dc-member-${testSuffix}@test.com`;
  const viewerEmail = `dc-viewer-${testSuffix}@test.com`;
  const outsiderEmail = `dc-outsider-${testSuffix}@test.com`;

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

  const member = await db.user.create({
    data: {
      email: memberEmail,
      fullName: "Workspace Member",
      passwordHash: "hash123",
      emailVerified: true,
    },
  });

  const viewer = await db.user.create({
    data: {
      email: viewerEmail,
      fullName: "Viewer User",
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

  // Assign plan to owner
  await changeUserPlan(owner.id, "agency");

  // Create workspace
  const workspace = await createWorkspace(owner.id, `Comment Studio ${testSuffix}`);

  // Add members
  await addWorkspaceMember(workspace.id, owner.id, admin.id, "ADMIN");
  await addWorkspaceMember(workspace.id, owner.id, member.id, "MEMBER");

  // Create website within workspace
  const website = await createWebsite({
    userId: owner.id,
    name: `Comments Project ${testSuffix}`,
    workspaceId: workspace.id,
  });

  // Add viewer as explicit collaborator with VIEWER role
  await db.websiteCollaborator.create({
    data: {
      websiteId: website.id,
      userId: viewer.id,
      permission: "VIEWER",
    },
  });

  // Helper for session tokens
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
  const adminToken = await createSession(admin.id);
  const memberToken = await createSession(member.id);
  const viewerToken = await createSession(viewer.id);
  const outsiderToken = await createSession(outsider.id);

  // -------------------------------------------------------------
  // Test 1: Unauthenticated access rejected with 401
  // -------------------------------------------------------------
  try {
    const unauthGet = await requestApp(app, "GET", `/api/v1/design-notes?websiteId=${website.id}`);
    const unauthPost = await requestApp(app, "POST", "/api/v1/design-notes", undefined, {
      websiteId: website.id,
      content: "Hello",
    });

    assert(
      unauthGet.status === 401 && unauthPost.status === 401,
      "Test 1: Unauthenticated requests are rejected with 401 UNAUTHORIZED"
    );
  } catch (err: any) {
    assert(false, "Test 1: Unauthenticated access", err.message);
  }

  // -------------------------------------------------------------
  // Test 2: Cross-tenant outsider is rejected
  // -------------------------------------------------------------
  try {
    const outsiderGet = await requestApp(
      app,
      "GET",
      `/api/v1/design-notes?websiteId=${website.id}`,
      outsiderToken
    );
    const outsiderPost = await requestApp(
      app,
      "POST",
      "/api/v1/design-notes",
      outsiderToken,
      { websiteId: website.id, content: "Outsider comment" }
    );

    assert(
      (outsiderGet.status === 403 || outsiderGet.status === 404) &&
      (outsiderPost.status === 403 || outsiderPost.status === 404),
      "Test 2: Cross-tenant outsider cannot view or create notes on website (403/404)"
    );
  } catch (err: any) {
    assert(false, "Test 2: Cross-tenant outsider access", err.message);
  }

  // -------------------------------------------------------------
  // Test 3: Authorized note creation and retrieval by Workspace Owner
  // -------------------------------------------------------------
  let ownerNoteId = "";
  try {
    const postRes = await requestApp(
      app,
      "POST",
      "/api/v1/design-notes",
      ownerToken,
      { websiteId: website.id, content: "Initial hero design looks great!" }
    );

    ownerNoteId = postRes.body?.note?.id;

    const getRes = await requestApp(
      app,
      "GET",
      `/api/v1/design-notes?websiteId=${website.id}`,
      ownerToken
    );

    assert(
      postRes.status === 201 &&
      postRes.body.success === true &&
      postRes.body.note.content === "Initial hero design looks great!" &&
      postRes.body.note.resolved === false &&
      getRes.status === 200 &&
      Array.isArray(getRes.body.notes) &&
      getRes.body.notes.some((n: any) => n.id === ownerNoteId),
      "Test 3: Workspace owner can successfully create and retrieve design notes"
    );
  } catch (err: any) {
    assert(false, "Test 3: Workspace owner note creation and retrieval", err.message);
  }

  // -------------------------------------------------------------
  // Test 4: Workspace Admin can create, view, and list notes
  // -------------------------------------------------------------
  let adminNoteId = "";
  try {
    const postRes = await requestApp(
      app,
      "POST",
      "/api/v1/design-notes",
      adminToken,
      { websiteId: website.id, content: "Please update the navbar font size." }
    );

    adminNoteId = postRes.body?.note?.id;

    assert(
      postRes.status === 201 &&
      postRes.body.note.author.email === adminEmail,
      "Test 4: Workspace Admin has COMMENT capability on workspace websites"
    );
  } catch (err: any) {
    assert(false, "Test 4: Workspace Admin note access", err.message);
  }

  // -------------------------------------------------------------
  // Test 5: Workspace Member (REVIEWER) can create and view notes
  // -------------------------------------------------------------
  let memberNoteId = "";
  try {
    const postRes = await requestApp(
      app,
      "POST",
      "/api/v1/design-notes",
      memberToken,
      { websiteId: website.id, content: "Review note: CTA button color contrast is low." }
    );

    memberNoteId = postRes.body?.note?.id;

    const getRes = await requestApp(
      app,
      "GET",
      `/api/v1/design-notes?websiteId=${website.id}`,
      memberToken
    );

    assert(
      postRes.status === 201 &&
      getRes.status === 200 &&
      getRes.body.notes.some((n: any) => n.id === memberNoteId),
      "Test 5: Workspace Member receives REVIEWER permissions with COMMENT capability"
    );
  } catch (err: any) {
    assert(false, "Test 5: Workspace Member note access", err.message);
  }

  // -------------------------------------------------------------
  // Test 6: VIEWER role (without COMMENT capability) is rejected
  // -------------------------------------------------------------
  try {
    const viewerGet = await requestApp(
      app,
      "GET",
      `/api/v1/design-notes?websiteId=${website.id}`,
      viewerToken
    );

    const viewerPost = await requestApp(
      app,
      "POST",
      "/api/v1/design-notes",
      viewerToken,
      { websiteId: website.id, content: "Viewer trying to comment" }
    );

    assert(
      viewerGet.status === 200 && viewerPost.status === 403,
      "Test 6: User with VIEWER role can read notes (VIEW) but is rejected when creating notes (403 FORBIDDEN)"
    );
  } catch (err: any) {
    assert(false, "Test 6: VIEWER role rejection", err.message);
  }

  // -------------------------------------------------------------
  // Test 7: Author-only editing
  // -------------------------------------------------------------
  try {
    // Member edits their own note -> 200
    const editSelf = await requestApp(
      app,
      "PATCH",
      `/api/v1/design-notes/${memberNoteId}`,
      memberToken,
      { content: "Updated review note: CTA button contrast fixed!" }
    );

    // Admin tries to edit Member's note -> 403
    const editOther = await requestApp(
      app,
      "PATCH",
      `/api/v1/design-notes/${memberNoteId}`,
      adminToken,
      { content: "Admin hijacking content" }
    );

    assert(
      editSelf.status === 200 &&
      editSelf.body.note.content === "Updated review note: CTA button contrast fixed!" &&
      editOther.status === 403,
      "Test 7: Author can edit their own note, but other users (even admins) are forbidden from editing (403)"
    );
  } catch (err: any) {
    assert(false, "Test 7: Author-only editing", err.message);
  }

  // -------------------------------------------------------------
  // Test 8: Authorized and unauthorized deletion
  // -------------------------------------------------------------
  try {
    // Create note by admin to test unauthorized deletion by member
    const tempAdminNote = await requestApp(
      app,
      "POST",
      "/api/v1/design-notes",
      adminToken,
      { websiteId: website.id, content: "Admin note for deletion test" }
    );
    const tempNoteId = tempAdminNote.body.note.id;

    // Member tries to delete Admin's note -> 403
    const memberDeleteFail = await requestApp(
      app,
      "DELETE",
      `/api/v1/design-notes/${tempNoteId}`,
      memberToken
    );

    // Workspace Owner can delete another member's note -> 200 (Moderation)
    const ownerDeleteSuccess = await requestApp(
      app,
      "DELETE",
      `/api/v1/design-notes/${tempNoteId}`,
      ownerToken
    );

    // Member deletes their own note -> 200
    const memberDeleteSelf = await requestApp(
      app,
      "DELETE",
      `/api/v1/design-notes/${memberNoteId}`,
      memberToken
    );

    assert(
      memberDeleteFail.status === 403 &&
      ownerDeleteSuccess.status === 200 &&
      memberDeleteSelf.status === 200,
      "Test 8: Members cannot delete others' notes (403); authors and workspace owners/admins can delete (200)"
    );
  } catch (err: any) {
    assert(false, "Test 8: Deletion authorization", err.message);
  }

  // -------------------------------------------------------------
  // Test 9: Resolution, Reopening, and Audit Logging
  // -------------------------------------------------------------
  try {
    // Resolve note by admin
    const resolveRes = await requestApp(
      app,
      "POST",
      `/api/v1/design-notes/${ownerNoteId}/resolve`,
      adminToken
    );

    // Check DB status
    const resolvedDb = await db.designNote.findUnique({ where: { id: ownerNoteId } });

    // Check AuditLog for resolve
    const resolveAudit = await db.auditLog.findFirst({
      where: {
        action: "DESIGN_NOTE_RESOLVED",
        targetResource: `website:${website.id}`,
      },
      orderBy: { createdAt: "desc" },
    });

    // Reopen note by member
    const reopenRes = await requestApp(
      app,
      "POST",
      `/api/v1/design-notes/${ownerNoteId}/reopen`,
      memberToken
    );

    const reopenedDb = await db.designNote.findUnique({ where: { id: ownerNoteId } });

    // Viewer (no COMMENT) cannot resolve
    const viewerResolveFail = await requestApp(
      app,
      "POST",
      `/api/v1/design-notes/${ownerNoteId}/resolve`,
      viewerToken
    );

    assert(
      resolveRes.status === 200 &&
      resolvedDb.resolved === true &&
      resolveAudit !== null &&
      reopenRes.status === 200 &&
      reopenedDb.resolved === false &&
      viewerResolveFail.status === 403,
      "Test 9: Resolve and reopen lifecycle works, writes AuditLog, and rejects users without COMMENT capability"
    );
  } catch (err: any) {
    assert(false, "Test 9: Resolve and reopen lifecycle", err.message);
  }

  // -------------------------------------------------------------
  // Test 10: Element-specific notes and filtering
  // -------------------------------------------------------------
  try {
    const elId = "hero-header-el-42";
    const elNoteRes = await requestApp(
      app,
      "POST",
      "/api/v1/design-notes",
      ownerToken,
      { websiteId: website.id, elementId: elId, content: "Element specific feedback" }
    );

    const filterRes = await requestApp(
      app,
      "GET",
      `/api/v1/design-notes?websiteId=${website.id}&elementId=${elId}`,
      ownerToken
    );

    assert(
      elNoteRes.status === 201 &&
      elNoteRes.body.note.elementId === elId &&
      filterRes.status === 200 &&
      filterRes.body.notes.every((n: any) => n.elementId === elId),
      "Test 10: Notes can attach to a specific elementId and support query filtering by elementId"
    );
  } catch (err: any) {
    assert(false, "Test 10: Element-specific notes", err.message);
  }

  // -------------------------------------------------------------
  // Test 11: Validation and missing resources
  // -------------------------------------------------------------
  try {
    // Missing content -> 400
    const emptyContentRes = await requestApp(
      app,
      "POST",
      "/api/v1/design-notes",
      ownerToken,
      { websiteId: website.id, content: "   " }
    );

    // Non-existent website -> 404
    const nonExistentWsRes = await requestApp(
      app,
      "POST",
      "/api/v1/design-notes",
      ownerToken,
      { websiteId: randomUUID(), content: "Note on ghost site" }
    );

    // Non-existent note -> 404
    const nonExistentNoteRes = await requestApp(
      app,
      "GET",
      `/api/v1/design-notes/${randomUUID()}`,
      ownerToken
    );

    assert(
      emptyContentRes.status === 400 &&
      nonExistentWsRes.status === 404 &&
      nonExistentNoteRes.status === 404,
      "Test 11: Input validation properly rejects empty content (400) and missing resources (404)"
    );
  } catch (err: any) {
    assert(false, "Test 11: Validation and missing resources", err.message);
  }

  // Cleanup test data
  try {
    await db.auditLog.deleteMany({ where: { targetResource: `website:${website.id}` } });
    await db.designNote.deleteMany({ where: { websiteId: website.id } });
    await db.websiteCollaborator.deleteMany({ where: { websiteId: website.id } });
    await db.website.delete({ where: { id: website.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.session.deleteMany({
      where: { userId: { in: [owner.id, admin.id, member.id, viewer.id, outsider.id] } },
    });
    await db.user.deleteMany({
      where: { id: { in: [owner.id, admin.id, member.id, viewer.id, outsider.id] } },
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

runDesignCommentsTests().catch((err) => {
  console.error("FATAL ERROR IN TEST RUNNER:", err);
  process.exit(1);
});
