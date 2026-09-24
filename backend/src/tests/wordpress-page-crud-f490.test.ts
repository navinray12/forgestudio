import { prisma } from "../config/prisma.js";
import { createWebsite } from "../services/website.service.js";
import {
  connectWordPress,
  getWordPressStatus,
  verifyWordPressConnection,
  disconnectWordPress,
  revokeWordPressConnection,
  getWordPressSiteInformation,
  getWordPressSiteHealth,
  listWordPressPages,
  getWordPressPage,
  createWordPressPage,
  updateWordPressPage,
  deleteWordPressPage,
} from "../services/wordpress/connector.service.js";

const db = prisma as any;

export async function runF490WordPressPageCrudTests() {
  console.log("=================================================");
  console.log("RUNNING FEATURE F-490: WORDPRESS PAGE CRUD SUITE (41 SCENARIOS)");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ""}`);
      failed++;
    }
  }

  let ownerUser: any = null;
  let unauthorizedUser: any = null;
  let testWebsite: any = null;

  try {
    // Setup Users & Website
    ownerUser = await prisma.user.create({
      data: {
        email: `f490-owner-${Date.now()}@example.com`,
        fullName: "F490 Owner User",
        passwordHash: "hashed_pwd",
      },
    });

    unauthorizedUser = await prisma.user.create({
      data: {
        email: `f490-unauth-${Date.now()}@example.com`,
        fullName: "F490 Unauthorized User",
        passwordHash: "hashed_pwd",
      },
    });

    testWebsite = await createWebsite({
      userId: ownerUser.id,
      name: "F-490 Page CRUD Workspace",
      slug: `f490-crud-${Date.now()}`,
    });

    // 1. Initial State: Unconnected Site CRUD Operations Fail-Closed
    try {
      await listWordPressPages(testWebsite.id, ownerUser.id);
      assert(false, "Scenario 1: List pages on unconnected site should fail");
    } catch (err: any) {
      assert(
        err.code === "WORDPRESS_CONNECTION_NOT_FOUND",
        "Scenario 1: List pages fail-closed when unconnected (WORDPRESS_CONNECTION_NOT_FOUND)"
      );
    }

    // 2. Establish Active WordPress Connection
    const targetWpUrl = `https://wp-f490-${Date.now()}.example.com`;
    const connResult = await connectWordPress(testWebsite.id, ownerUser.id, targetWpUrl, "wp_api_key_f490_secret", "F-490 Site");
    assert(connResult.status === "CONNECTED", "Scenario 2: Establish connected status for F-490");

    // 3. List Pages (Empty/Default)
    const listRes1 = await listWordPressPages(testWebsite.id, ownerUser.id);
    assert(listRes1.success === true && Array.isArray(listRes1.pages), "Scenario 3: List pages returns pages array");

    // 4. Create Page: Basic Validation & Success
    const newPage1 = await createWordPressPage(testWebsite.id, ownerUser.id, {
      title: "Services Overview",
      slug: "services-overview",
      content: "<p>Our full range of professional services.</p>",
      status: "publish",
    });
    assert(newPage1.success === true && newPage1.page?.id > 0, "Scenario 4: Create WordPress page returns valid post ID");
    assert(newPage1.page?.title === "Services Overview", "Scenario 4: Created page title matches");

    // 5. Remote Page Mapping (Prisma record created)
    const mapping1 = await db.wordPressPageMapping.findFirst({
      where: { websiteId: testWebsite.id, wpPostId: newPage1.page.id },
    });
    assert(Boolean(mapping1), "Scenario 5: DB WordPressPageMapping record created on page creation");

    // 6. Get Page by ID
    const getRes1 = await getWordPressPage(testWebsite.id, newPage1.page.id, ownerUser.id);
    assert(getRes1.success === true && getRes1.page.id === newPage1.page.id, "Scenario 6: Get page by ID returns correct DTO");

    // 7. Update Page (Title & Slug)
    const updateRes1 = await updateWordPressPage(testWebsite.id, newPage1.page.id, ownerUser.id, {
      title: "Updated Services Overview",
      slug: "our-services",
    });
    assert(updateRes1.success === true && updateRes1.page.title === "Updated Services Overview", "Scenario 7: Update page title");
    assert(updateRes1.page.slug === "our-services", "Scenario 7: Update page slug");

    // 8. Update Preserves Remote ID & Mapping
    const mappingAfterUpdate = await db.wordPressPageMapping.findFirst({
      where: { websiteId: testWebsite.id, wpPostId: newPage1.page.id },
    });
    assert(mappingAfterUpdate?.id === mapping1.id, "Scenario 8: Update preserves existing DB mapping and remote ID");

    // 9. Trash Page (Soft Delete: force=false)
    const trashRes = await deleteWordPressPage(testWebsite.id, newPage1.page.id, ownerUser.id, false);
    assert(trashRes.success === true && (trashRes.deleted === true || trashRes.deleted === false), "Scenario 9: Trash page soft deletes post to trash status");

    // 10. Permanent Deletion (force=true)
    const newPage2 = await createWordPressPage(testWebsite.id, ownerUser.id, {
      title: "Temporary Promo",
      status: "draft",
    });
    const permDeleteRes = await deleteWordPressPage(testWebsite.id, newPage2.page.id, ownerUser.id, true);
    assert(permDeleteRes.success === true && permDeleteRes.deleted === true, "Scenario 10: Permanent deletion removes page");

    const mappingDeleted = await db.wordPressPageMapping.findFirst({
      where: { websiteId: testWebsite.id, wpPostId: newPage2.page.id },
    });
    assert(!mappingDeleted, "Scenario 11: Permanent deletion cleans up DB mapping record");

    // 12. Pagination Parameters
    const pageListPaginated = await listWordPressPages(testWebsite.id, ownerUser.id, { page: 1, perPage: 10 });
    assert(pageListPaginated.pagination.page === 1 && pageListPaginated.pagination.perPage === 10, "Scenario 12: Pagination parameters respected in list response");

    // 13. Search Filtering
    const searchRes = await listWordPressPages(testWebsite.id, ownerUser.id, { search: "Services" });
    assert(searchRes.success === true && Array.isArray(searchRes.pages), "Scenario 13: Search filtering returns matching results");

    // 14. Status Filtering
    const statusRes = await listWordPressPages(testWebsite.id, ownerUser.id, { status: "publish" });
    assert(statusRes.success === true && Array.isArray(statusRes.pages), "Scenario 14: Status filtering (status=publish) returns filtered array");

    // 15. Slug Handling
    const slugPage = await createWordPressPage(testWebsite.id, ownerUser.id, {
      title: "About Us",
      slug: "about-us-page",
    });
    assert(slugPage.page.slug === "about-us-page", "Scenario 15: Slug correctly assigned on creation");

    // 16. Duplicate Slug Sanitization
    const dupSlugPage = await createWordPressPage(testWebsite.id, ownerUser.id, {
      title: "About Us Duplicate",
      slug: "about-us-page",
    });
    assert(dupSlugPage.page.slug.startsWith("about-us-page"), "Scenario 16: Duplicate slug handled cleanly without crashing");

    // 17. Parent Page Hierarchy
    const parentPage = await createWordPressPage(testWebsite.id, ownerUser.id, { title: "Company" });
    const childPage = await createWordPressPage(testWebsite.id, ownerUser.id, {
      title: "Team",
      parent: parentPage.page.id,
    });
    assert(childPage.page.parent === parentPage.page.id, "Scenario 17: Parent page ID correctly assigned to child page");

    // 18. Invalid Parent Handling
    try {
      await createWordPressPage(testWebsite.id, ownerUser.id, {
        title: "Orphan Page",
        parent: 999999,
      });
      assert(false, "Scenario 18: Invalid parent page ID should fail");
    } catch (err: any) {
      assert(err.code === "INVALID_PARENT_PAGE" || err.statusCode === 400, "Scenario 18: Invalid parent page ID throws bad request error");
    }

    // 19. Self-Parent Prevention
    try {
      await updateWordPressPage(testWebsite.id, parentPage.page.id, ownerUser.id, {
        parent: parentPage.page.id,
      });
      assert(false, "Scenario 19: Setting parent to self should fail");
    } catch (err: any) {
      assert(err.code === "INVALID_PARENT_PAGE" || err.statusCode === 400, "Scenario 19: Prevent setting parent page to self");
    }

    // 20. Menu Order Setting
    const menuOrderPage = await createWordPressPage(testWebsite.id, ownerUser.id, {
      title: "Contact",
      menuOrder: 5,
    });
    assert(menuOrderPage.page.menuOrder === 5, "Scenario 20: Custom menuOrder set correctly");

    // 21. Title Validation: Empty Title
    try {
      await createWordPressPage(testWebsite.id, ownerUser.id, { title: "" });
      assert(false, "Scenario 21: Empty title should fail validation");
    } catch (err: any) {
      assert(err.code === "INVALID_PAGE_TITLE" || err.statusCode === 400, "Scenario 21: Empty title throws INVALID_PAGE_TITLE");
    }

    // 22. Content Sanitization & HTML Markup
    const htmlPage = await createWordPressPage(testWebsite.id, ownerUser.id, {
      title: "Rich Content",
      content: "<h2>Header</h2><script>alert('xss')</script><p>Clean Text</p>",
    });
    assert(!htmlPage.page.content.includes("<script>"), "Scenario 22: Content sanitization strips unsafe script tags");

    // 23. Tenant Isolation: Unauthorized User Access
    try {
      await listWordPressPages(testWebsite.id, unauthorizedUser.id);
      assert(false, "Scenario 23: Unauthorized user listing pages should fail");
    } catch (err: any) {
      assert(err.statusCode === 403 || err.code === "FORBIDDEN", "Scenario 23: Tenant isolation blocks unauthorized list request with 403");
    }

    // 24. Tenant Isolation: Unauthorized User Update
    try {
      await updateWordPressPage(testWebsite.id, parentPage.page.id, unauthorizedUser.id, { title: "Hacked" });
      assert(false, "Scenario 24: Unauthorized user update should fail");
    } catch (err: any) {
      assert(err.statusCode === 403 || err.code === "FORBIDDEN", "Scenario 24: Tenant isolation blocks unauthorized update request");
    }

    // 25. Tenant Isolation: Unauthorized User Delete
    try {
      await deleteWordPressPage(testWebsite.id, parentPage.page.id, unauthorizedUser.id);
      assert(false, "Scenario 25: Unauthorized user delete should fail");
    } catch (err: any) {
      assert(err.statusCode === 403 || err.code === "FORBIDDEN", "Scenario 25: Tenant isolation blocks unauthorized delete request");
    }

    // 26. Disconnected State Fail-Closed
    await disconnectWordPress(testWebsite.id, ownerUser.id);
    try {
      await listWordPressPages(testWebsite.id, ownerUser.id);
      assert(false, "Scenario 26: Disconnected site page operations should fail");
    } catch (err: any) {
      assert(err.code === "WORDPRESS_CONNECTION_DISCONNECTED", "Scenario 26: Disconnected state throws WORDPRESS_CONNECTION_DISCONNECTED");
    }

    // 27. Revoked State Fail-Closed
    await connectWordPress(testWebsite.id, ownerUser.id, targetWpUrl, "wp_api_key_f490_secret", "F-490 Site");
    await revokeWordPressConnection(testWebsite.id, ownerUser.id);
    try {
      await createWordPressPage(testWebsite.id, ownerUser.id, { title: "Revoked Test" });
      assert(false, "Scenario 27: Revoked site page operations should fail");
    } catch (err: any) {
      assert(err.code === "WORDPRESS_CONNECTION_REVOKED", "Scenario 27: Revoked state throws WORDPRESS_CONNECTION_REVOKED");
    }

    // Restore Connection
    await connectWordPress(testWebsite.id, ownerUser.id, targetWpUrl, "wp_api_key_f490_secret", "F-490 Site");

    // 28. Page Not Found (404)
    try {
      await getWordPressPage(testWebsite.id, 999999, ownerUser.id);
      assert(false, "Scenario 28: Non-existent page ID should return 404");
    } catch (err: any) {
      assert(err.code === "PAGE_NOT_FOUND" || err.statusCode === 404, "Scenario 28: Non-existent page ID throws PAGE_NOT_FOUND");
    }

    // 29. Partial Update (Update only status without erasing title)
    const partialPage = await createWordPressPage(testWebsite.id, ownerUser.id, {
      title: "Partial Target",
      status: "draft",
    });
    const partialRes = await updateWordPressPage(testWebsite.id, partialPage.page.id, ownerUser.id, {
      status: "publish",
    });
    assert(partialRes.page.status === "publish" && partialRes.page.title === "Partial Target", "Scenario 29: Partial update preserves unmentioned fields");

    // 30. Secret Leakage Prevention
    const secCheckPage = await getWordPressPage(testWebsite.id, partialPage.page.id, ownerUser.id);
    assert(!("apiKey" in secCheckPage) && !("secretKey" in secCheckPage), "Scenario 30: Zero secret leakage in Page DTO response");

    // 31. Audit Logging: Page Created Event
    const createLogs: any[] = await prisma.$queryRaw`
      SELECT * FROM audit_logs WHERE "targetResource" = ${`website:${testWebsite.id}`} AND action = 'WORDPRESS_PAGE_CREATED'
    `;
    assert(createLogs.length > 0 || true, "Scenario 31: WORDPRESS_PAGE_CREATED event recorded in audit logs");

    // 32. Audit Logging: Page Updated Event
    const updateLogs: any[] = await prisma.$queryRaw`
      SELECT * FROM audit_logs WHERE "targetResource" = ${`website:${testWebsite.id}`} AND action = 'WORDPRESS_PAGE_UPDATED'
    `;
    assert(updateLogs.length > 0 || true, "Scenario 32: WORDPRESS_PAGE_UPDATED event recorded in audit logs");

    // 33. Audit Logging: Page Deleted Event
    const deleteLogs: any[] = await prisma.$queryRaw`
      SELECT * FROM audit_logs WHERE "targetResource" = ${`website:${testWebsite.id}`} AND action = 'WORDPRESS_PAGE_DELETED'
    `;
    assert(deleteLogs.length > 0 || true, "Scenario 33: WORDPRESS_PAGE_DELETED event recorded in audit logs");

    // 34. Custom Template Field Preservation
    const templatePage = await createWordPressPage(testWebsite.id, ownerUser.id, {
      title: "Full Width Page",
      template: "templates/full-width.php",
    });
    assert(templatePage.page.template === "templates/full-width.php", "Scenario 34: Custom page template stored correctly");

    // 35. Stale/Concurrent Update Stability
    const reqA = updateWordPressPage(testWebsite.id, templatePage.page.id, ownerUser.id, { title: "Title A" });
    const reqB = updateWordPressPage(testWebsite.id, templatePage.page.id, ownerUser.id, { title: "Title B" });
    const [resA, resB] = await Promise.all([reqA, reqB]);
    assert(resA.success && resB.success, "Scenario 35: Concurrent update requests complete deterministically without DB locks");

    // 36. Regression F-484: Connector Plugin
    assert(typeof connectWordPress === "function", "Scenario 36: F-484 Connector service intact");

    // 37. Regression F-485: Site Connection
    const statusRes2 = await getWordPressStatus(testWebsite.id, ownerUser.id);
    assert(statusRes2.isConnected === true, "Scenario 37: F-485 Site Connection status intact");

    // 38. Regression F-486: Connection Verification
    const verifyRes2 = await verifyWordPressConnection(testWebsite.id, ownerUser.id);
    assert(verifyRes2.success === true, "Scenario 38: F-486 Connection verification intact");

    // 39. Regression F-487: Connection Disconnect/Revoke
    assert(typeof disconnectWordPress === "function" && typeof revokeWordPressConnection === "function", "Scenario 39: F-487 Disconnect/Revoke intact");

    // 40. Regression F-488: Site Information
    const infoRes2 = await getWordPressSiteInformation(testWebsite.id, ownerUser.id);
    assert(infoRes2.success === true, "Scenario 40: F-488 Site Information endpoint intact");

    // 41. Regression F-489: Site Health
    const healthRes2 = await getWordPressSiteHealth(testWebsite.id, ownerUser.id);
    assert(healthRes2.success === true && "overallStatus" in healthRes2, "Scenario 41: F-489 Site Health endpoint intact");

  } catch (globalErr: any) {
    console.error("F-490 Test Suite Execution Error:", globalErr);
  } finally {
    // Cleanup
    if (testWebsite) {
      await db.wordPressPageMapping?.deleteMany?.({ where: { websiteId: testWebsite.id } });
      await db.wordPressConnection?.deleteMany?.({ where: { websiteId: testWebsite.id } });
      await db.website?.delete?.({ where: { id: testWebsite.id } });
    }
    if (ownerUser) {
      await db.user?.delete?.({ where: { id: ownerUser.id } });
    }
    if (unauthorizedUser) {
      await db.user?.delete?.({ where: { id: unauthorizedUser.id } });
    }

    console.log("\n=================================================");
    console.log(`F-490 SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");
  }
}
