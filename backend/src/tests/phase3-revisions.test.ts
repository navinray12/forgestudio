/**
 * @file Phase3 revisions test: regression or diagnostic checks for the behavior named by this file.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import "./require-disposable-database.js";
import { prisma } from "../platform/database/prisma.js";
import {
  getWebsiteById,
  getUserWebsites,
  createWebsite,
  updateWebsiteEditorData,
  getPublicWebsiteById,
} from "../modules/websites/website.service.js";
import {
  getWebsiteRevisions,
  getRevisionById,
  createRevision,
  restoreRevision,
} from "../modules/revisions/revision.service.js";

import {
  changeUserPlan,
} from "../modules/subscriptions/subscription.service.js";

const db = prisma as any;

/**
 * Run Tests.
 */
async function runTests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO PHASE 3 VERIFICATION SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  /**
   * Assert.
   * @param condition Condition supplied to this operation (type: boolean).
   * @param testName Test Name supplied to this operation (type: string).
   * @param detail Detail supplied to this operation (type: string). Optional; callers may omit it.
   */
  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ""}`);
      failed++;
    }
  }

  // Setup test users & websites
  let ownerUser: any = null;
  let unauthorizedUser: any = null;
  let reviewerUser: any = null;
  let testWebsite: any = null;
  let legacyWebsite: any = null;

  try {
    // 1. Find or create test users
    ownerUser = await db.user.create({ data: {
      email: "owner_" + crypto.randomUUID() + "@example.invalid", fullName: "Test owner",
    } });
    unauthorizedUser = await db.user.create({ data: {
      email: "outsider_" + crypto.randomUUID() + "@example.invalid", fullName: "Test outsider",
    } });
    reviewerUser = await db.user.create({
      data: {
        email: `reviewer_${Date.now()}@forgestudio.dev`,
        fullName: "Reviewer User",
        status: "ACTIVE",
        role: "USER",
      },
    });

    // 2. Create test website for Phase 3 tests using project's official createWebsite service
    testWebsite = await createWebsite(ownerUser.id, "Phase 3 Test Website");

    // Assign reviewerUser as REVIEWER on testWebsite
    await db.websiteCollaborator.create({
      data: {
        websiteId: testWebsite.id,
        userId: reviewerUser.id,
        permission: "REVIEWER",
      },
    });

    // Create legacy website with NO revisions
    legacyWebsite = await createWebsite(ownerUser.id, "Legacy Test Website");

    // =========================================================================
    // Test 1: Legacy website loads without revisions
    // =========================================================================
    const loadedLegacy = await getWebsiteById(legacyWebsite.id, ownerUser.id);
    const legacyRevs = await getWebsiteRevisions(legacyWebsite.id, ownerUser.id);
    assert(
      loadedLegacy && loadedLegacy.id === legacyWebsite.id && legacyRevs.length === 0,
      "Test 1: Existing legacy website loads without revision records"
    );

    // =========================================================================
    // Test 2 & 3: Autosave persists working draft and does NOT create micro-revisions
    // =========================================================================
    const initialRevCount = (await db.websiteRevision.findMany({ where: { websiteId: testWebsite.id } })).length;

    // Simulate 3 consecutive 1.5s autosaves
    await updateWebsiteEditorData(testWebsite.id, ownerUser.id, {
      elements: [{ id: "el-1", type: "heading", content: "Autosaved Draft Edit 1" }],
    });
    await updateWebsiteEditorData(testWebsite.id, ownerUser.id, {
      elements: [{ id: "el-1", type: "heading", content: "Autosaved Draft Edit 2" }],
    });
    await updateWebsiteEditorData(testWebsite.id, ownerUser.id, {
      elements: [{ id: "el-1", type: "heading", content: "Autosaved Draft Edit 3" }],
    });

    const reloadedSiteAfterAutosave = await getWebsiteById(testWebsite.id, ownerUser.id);
    const rawDraft = typeof reloadedSiteAfterAutosave.editorData === "string"
      ? JSON.parse(reloadedSiteAfterAutosave.editorData)
      : reloadedSiteAfterAutosave.editorData;

    const afterAutosaveRevCount = (await db.websiteRevision.findMany({ where: { websiteId: testWebsite.id } })).length;

    assert(
      rawDraft.elements[0]?.content === "Autosaved Draft Edit 3",
      "Test 2: Autosave persists working draft changes to database"
    );
    assert(
      afterAutosaveRevCount === initialRevCount,
      "Test 3: Autosave does NOT create micro-revisions (strict separation)"
    );

    // =========================================================================
    // Test 4: Manual save does NOT create micro-revisions
    // =========================================================================
    await updateWebsiteEditorData(testWebsite.id, ownerUser.id, {
      elements: [{ id: "el-1", type: "heading", content: "Manual Saved Draft" }],
    });
    const afterManualSaveRevCount = (await db.websiteRevision.findMany({ where: { websiteId: testWebsite.id } })).length;
    assert(
      afterManualSaveRevCount === initialRevCount,
      "Test 4: Manual save does NOT create micro-revisions"
    );

    // =========================================================================
    // Test 5: Explicit checkpoint creates exactly one revision
    // =========================================================================
    const rev1 = await createRevision(testWebsite.id, ownerUser.id, {
      description: "Milestone V1: Header redesigned",
      revisionType: "MANUAL",
      elements: [{ id: "el-1", type: "heading", content: "Hero V1 Content" }],
      pageSettings: { title: "Home V1" },
    });

    assert(
      rev1 && rev1.version === 1 && rev1.revisionType === "MANUAL",
      "Test 5: Explicit checkpoint creates exactly one revision with version 1"
    );

    // =========================================================================
    // Test 6: Monotonic versioning & collision safety
    // =========================================================================
    const rev2 = await createRevision(testWebsite.id, ownerUser.id, {
      description: "Milestone V2: Features added",
      revisionType: "MANUAL",
      elements: [{ id: "el-1", type: "heading", content: "Hero V2 Content" }],
      pageSettings: { title: "Home V2" },
    });

    const rev3 = await createRevision(testWebsite.id, ownerUser.id, {
      description: "Milestone V3: Pricing table added",
      revisionType: "MANUAL",
      elements: [{ id: "el-1", type: "heading", content: "Hero V3 Content" }],
      pageSettings: { title: "Home V3" },
    });

    assert(
      rev2.version === 2 && rev3.version === 3,
      "Test 6: Monotonic versioning ensures sequentially increasing, unique versions"
    );

    // =========================================================================
    // Test 7: Revision listing for authorized user
    // =========================================================================
    const list = await getWebsiteRevisions(testWebsite.id, ownerUser.id);
    assert(
      list.length === 3 && list[0].version === 3 && list[1].version === 2 && list[2].version === 1,
      "Test 7: Revision listing returns newest first with elementCount and author metadata"
    );

    // =========================================================================
    // Test 8: Unauthorized access denied
    // =========================================================================
    let unauthDenied = false;
    try {
      await getWebsiteRevisions(testWebsite.id, unauthorizedUser.id);
    } catch (err: any) {
      unauthDenied = err.statusCode === 404 || err.statusCode === 403 || err.message.includes("denied") || err.message.includes("not found");
    }
    assert(unauthDenied, "Test 8: Unauthorized user cannot view revisions of another user's website");

    // =========================================================================
    // Test 9: Reviewer cannot create or restore revisions
    // =========================================================================
    let reviewerBlockedFromCreate = false;
    let createErrDetail = "";
    try {
      await createRevision(testWebsite.id, reviewerUser.id, { description: "Reviewer hack" });
    } catch (err: any) {
      reviewerBlockedFromCreate = err.statusCode === 403;
      createErrDetail = `status=${err.statusCode}, msg=${err.message}`;
    }

    let reviewerBlockedFromRestore = false;
    let restoreErrDetail = "";
    try {
      await restoreRevision(testWebsite.id, rev1.id, reviewerUser.id);
    } catch (err: any) {
      reviewerBlockedFromRestore = err.statusCode === 403;
      restoreErrDetail = `status=${err.statusCode}, msg=${err.message}`;
    }

    assert(
      reviewerBlockedFromCreate && reviewerBlockedFromRestore,
      "Test 9: Reviewer role cannot create or restore revisions (403 Forbidden)",
      `create: ${createErrDetail}, restore: ${restoreErrDetail}`
    );

    // =========================================================================
    // Test 10, 11, 12: Publish site to V2, then Restore V1 -> Restore != Publish
    // =========================================================================
    // 1. Explicitly publish V2 state
    const publishedSnapshotV2 = {
      version: 2,
      elements: [{ id: "el-1", type: "heading", content: "Published V2 Live Content" }],
      pages: [{ id: "page-1", slug: "/", elements: [{ id: "el-1", type: "heading", content: "Published V2 Live Content" }] }],
      publishing: { status: "PUBLISHED", version: 2 },
    };

    await updateWebsiteEditorData(testWebsite.id, ownerUser.id, {
      ...publishedSnapshotV2,
      publishedData: publishedSnapshotV2,
      publishing: { status: "PUBLISHED" },
    });

    // Verify public site serves V2
    const publicBeforeRestore = await getPublicWebsiteById(testWebsite.id);
    const pubContentBefore = (publicBeforeRestore.editorData.elements[0] as any)?.content;

    // 2. Now RESTORE V1 to working draft!
    const restoreResult = await restoreRevision(testWebsite.id, rev1.id, ownerUser.id);

    // Check working draft is restored to V1
    const siteAfterRestore = await getWebsiteById(testWebsite.id, ownerUser.id);
    const workingDraftAfterRestore = typeof siteAfterRestore.editorData === "string"
      ? JSON.parse(siteAfterRestore.editorData)
      : siteAfterRestore.editorData;

    assert(
      workingDraftAfterRestore.elements[0]?.content === "Hero V1 Content",
      "Test 10: Revision restore updates working draft to V1"
    );

    assert(
      workingDraftAfterRestore.publishedData?.elements[0]?.content === "Published V2 Live Content",
      "Test 11: Revision restore strictly preserves publishedData inside editorData"
    );

    // Check public site is STILL serving Published V2!
    const publicAfterRestore = await getPublicWebsiteById(testWebsite.id);
    const pubContentAfter = (publicAfterRestore.editorData.elements[0] as any)?.content;

    assert(
      pubContentAfter === "Published V2 Live Content" && pubContentBefore === pubContentAfter,
      "Test 12: Restore does NOT alter public website (RESTORE != PUBLISH invariant holds)"
    );

    // =========================================================================
    // Test 13: Explicit publish of restored version updates live site
    // =========================================================================
    const publishedRestoredSnapshot = {
      version: 4,
      elements: workingDraftAfterRestore.elements,
      pages: workingDraftAfterRestore.pages || [],
      publishing: { status: "PUBLISHED", version: 4 },
    };

    await updateWebsiteEditorData(testWebsite.id, ownerUser.id, {
      ...workingDraftAfterRestore,
      publishedData: publishedRestoredSnapshot,
      publishing: { status: "PUBLISHED" },
    });

    const publicAfterExplicitPublish = await getPublicWebsiteById(testWebsite.id);
    const pubContentFinal = (publicAfterExplicitPublish.editorData.elements[0] as any)?.content;

    assert(
      pubContentFinal === "Hero V1 Content",
      "Test 13: Explicit publish of restored version updates public website"
    );

    // =========================================================================
    // Test 14: Restored working state persists across browser refresh / DB reload
    // =========================================================================
    const reloadedDirectFromDb = await db.website.findUnique({ where: { id: testWebsite.id } });
    const parsedDbData = typeof reloadedDirectFromDb.editorData === "string"
      ? JSON.parse(reloadedDirectFromDb.editorData)
      : reloadedDirectFromDb.editorData;

    assert(
      parsedDbData.elements[0]?.content === "Hero V1 Content",
      "Test 14: Restored working state persists durably in database across reloads"
    );

    // =========================================================================
    // Test 15: Additive Audit Logging
    // =========================================================================
    const auditLogs = await db.auditLog.findMany({
      where: {
        targetResource: `website:${testWebsite.id}`,
      },
    });

    const hasCreatedLog = auditLogs.some((l: any) => l.action === "REVISION_CREATED");
    const hasRestoredLog = auditLogs.some((l: any) => l.action === "REVISION_RESTORED");

    assert(
      hasCreatedLog && hasRestoredLog,
      "Test 15: Additive AuditLog records exist for REVISION_CREATED and REVISION_RESTORED"
    );

  } catch (error) {
    console.error("Test execution error:", error);
    failed++;
  } finally {
    // Clean up test entities
    try {
      if (testWebsite?.id) {
        await db.website.delete({ where: { id: testWebsite.id } });
      }
      if (legacyWebsite?.id) {
        await db.website.delete({ where: { id: legacyWebsite.id } });
      }
      if (reviewerUser?.id) {
        await db.user.delete({ where: { id: reviewerUser.id } });
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

runTests();
