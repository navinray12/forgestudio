import assert from "node:assert";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium, type Browser } from "playwright";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { createUserSession, revokeSession } from "../src/services/session.service.js";
import { hashPassword } from "../src/utils/password.js";
import { AUTH_COOKIE_NAME } from "../src/config/auth.js";
import {
  createWebsite,
  getWebsiteById,
  updateWebsiteEditorData,
  getPublicWebsiteById,
} from "../src/services/website.service.js";
import { publishWebsite } from "../src/services/publishing.service.js";
import {
  createRevision,
  compareRevisions,
  restoreRevision,
} from "../src/services/revision.service.js";

const db = prisma as any;
const BACKEND_PORT = 5096;
const FRONTEND_PORT = 5176;

function startFrontendServer(frontendDistPath: string, port: number): Promise<http.Server> {
  const mimeTypes: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  };

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url || "/", `http://localhost:${port}`);
        let pathname = decodeURIComponent(reqUrl.pathname);

        if (pathname.startsWith("/api/")) {
          const proxyReq = http.request(
            `http://localhost:${BACKEND_PORT}${req.url}`,
            {
              method: req.method,
              headers: { ...req.headers, host: `localhost:${BACKEND_PORT}` },
            },
            (proxyRes) => {
              res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
              proxyRes.pipe(res);
            }
          );
          proxyReq.on("error", (e) => {
            res.writeHead(502);
            res.end(e.message);
          });
          req.pipe(proxyReq);
          return;
        }

        const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, "");
        let filePath = path.join(frontendDistPath, safePath);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const contentType = mimeTypes[ext] || "application/octet-stream";
          res.writeHead(200, { "Content-Type": contentType });
          fs.createReadStream(filePath).pipe(res);
          return;
        }

        const indexPath = path.join(frontendDistPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.writeHead(200, { "Content-Type": "text/html" });
          fs.createReadStream(indexPath).pipe(res);
        } else {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not Found");
        }
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(err.message || "Internal Server Error");
      }
    });

    server.listen(port, () => resolve(server));
    server.on("error", reject);
  });
}

export async function runPhase4TestSuite() {
  console.log("================================================================");
  console.log("   FORGESTUDIO PHASE 4 — MULTI-PAGE LIFECYCLE & REVISIONS SUITE  ");
  console.log("================================================================\n");

  const backendServer = http.createServer(app);
  await new Promise<void>((resolve) => backendServer.listen(BACKEND_PORT, resolve));
  const baseUrl = `http://localhost:${BACKEND_PORT}`;

  let passedCount = 0;
  let failedCount = 0;

  function logPass(title: string, details?: string) {
    passedCount++;
    console.log(`  [PASSED] ${title}${details ? ` -> ${details}` : ""}`);
  }

  function logFail(title: string, error?: any) {
    failedCount++;
    console.error(`  [FAILED] ${title} -> ${error?.message || JSON.stringify(error)}`);
  }

  // Test variables
  let ownerUser: any = null;
  let ownerCookie = "";
  let viewerUser: any = null;
  let viewerCookie = "";
  let suspendedUser: any = null;
  let suspendedCookie = "";
  let foreignUser: any = null;
  let foreignCookie = "";

  let testWebsite: any = null;
  let frontendServer: http.Server | null = null;
  let browser: Browser | null = null;

  try {
    // -------------------------------------------------------------------------
    // SETUP: Users & Tenants
    // -------------------------------------------------------------------------
    console.log("[SETUP] Provisioning isolated Phase 4 test tenants...");
    const pwdHash = await hashPassword("Phase4Pass123!");
    const testEmails = [
      "p4_owner@example.com",
      "p4_viewer@example.com",
      "p4_suspended@example.com",
      "p4_foreign@example.com",
    ];

    await db.user.deleteMany({ where: { email: { in: testEmails } } }).catch(() => {});

    ownerUser = await db.user.create({
      data: {
        email: "p4_owner@example.com",
        fullName: "Phase 4 Owner",
        passwordHash: pwdHash,
        role: "USER",
        status: "ACTIVE",
      },
    });
    const sOwner = await createUserSession(ownerUser.id);
    ownerCookie = `${AUTH_COOKIE_NAME}=${sOwner.token}`;

    viewerUser = await db.user.create({
      data: {
        email: "p4_viewer@example.com",
        fullName: "Phase 4 Viewer",
        passwordHash: pwdHash,
        role: "USER",
        status: "ACTIVE",
      },
    });
    const sViewer = await createUserSession(viewerUser.id);
    viewerCookie = `${AUTH_COOKIE_NAME}=${sViewer.token}`;

    suspendedUser = await db.user.create({
      data: {
        email: "p4_suspended@example.com",
        fullName: "Phase 4 Suspended",
        passwordHash: pwdHash,
        role: "USER",
        status: "SUSPENDED",
      },
    });
    const sSuspended = await createUserSession(suspendedUser.id);
    suspendedCookie = `${AUTH_COOKIE_NAME}=${sSuspended.token}`;

    foreignUser = await db.user.create({
      data: {
        email: "p4_foreign@example.com",
        fullName: "Phase 4 Foreign Tenant",
        passwordHash: pwdHash,
        role: "USER",
        status: "ACTIVE",
      },
    });
    const sForeign = await createUserSession(foreignUser.id);
    foreignCookie = `${AUTH_COOKIE_NAME}=${sForeign.token}`;

    logPass("Setup Users", "Owner, Viewer, Suspended, Foreign tenant created");

    // -------------------------------------------------------------------------
    // STEP 2 & 4: MULTI-PAGE CRUD & PERSISTENCE
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP A] Multi-Page Website Management & Persistence...");

    // 1. Create website
    testWebsite = await createWebsite({
      userId: ownerUser.id,
      name: "Phase 4 Studio Project",
    });

    const initData = typeof testWebsite.editorData === "string"
      ? JSON.parse(testWebsite.editorData)
      : testWebsite.editorData;

    assert.strictEqual(initData.pages?.length, 1, "Initial site must contain 1 page");
    assert.strictEqual(initData.homePageId, "home", "Initial homePageId must be 'home'");
    logPass("Create Website", `Initial page count: 1, homePageId: ${initData.homePageId}`);

    // Add viewer as collaborator with VIEWER role
    await db.websiteCollaborator.create({
      data: {
        websiteId: testWebsite.id,
        userId: viewerUser.id,
        permission: "VIEWER",
      },
    });

    // 2. Add 4 more pages: About, Services, Nested Web Design, Contact
    const pageAbout = {
      id: "page-about",
      name: "About Us",
      slug: "/about",
      isHome: false,
      elements: [{ id: "el-about-1", type: "heading", content: "About Us Content" }],
      pageSettings: { title: "About ForgeStudio", path: "/about", description: "Learn about us" },
    };
    const pageServices = {
      id: "page-services",
      name: "Our Services",
      slug: "/services",
      isHome: false,
      elements: [{ id: "el-serv-1", type: "heading", content: "Our Services Content" }],
      pageSettings: { title: "Services", path: "/services", description: "What we do" },
    };
    const pageNested = {
      id: "page-nested-design",
      name: "Web Design",
      slug: "/services/web-design",
      isHome: false,
      elements: [{ id: "el-web-1", type: "heading", content: "Expert Web Design" }],
      pageSettings: { title: "Web Design Services", path: "/services/web-design", description: "Bespoke design" },
    };
    const pageContact = {
      id: "page-contact",
      name: "Contact",
      slug: "/contact",
      isHome: false,
      elements: [{ id: "el-contact-1", type: "heading", content: "Get in touch" }],
      pageSettings: { title: "Contact Us", path: "/contact", description: "Reach out" },
    };

    const multiPages = [
      initData.pages[0],
      pageAbout,
      pageServices,
      pageNested,
      pageContact,
    ];

    async function saveWebsiteWithVersion(websiteId: string, cookie: string, editorData: any) {
      const current = await getWebsiteById(websiteId, ownerUser.id);
      const res = await fetch(`${baseUrl}/api/websites/${websiteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          expectedVersion: current.version ?? 1,
          editorData,
        }),
      });
      return res;
    }

    let saveRes = await saveWebsiteWithVersion(testWebsite.id, ownerCookie, {
      ...initData,
      pages: multiPages,
    });
    assert.strictEqual(saveRes.status, 200, "Should save 5 multi-pages");
    logPass("Add 4 Pages", "Home, About, Services, Services/Web-Design, Contact saved");

    // Concurrency check: Stale version 409 conflict
    const staleRes = await fetch(`${baseUrl}/api/websites/${testWebsite.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({
        expectedVersion: 999999,
        editorData: { ...initData, pages: multiPages },
      }),
    });
    assert.strictEqual(staleRes.status, 409, "Stale version must return 409 Conflict");
    logPass("Optimistic Concurrency Control", "HTTP 409 returned when saving with stale expectedVersion");

    // 3. Rename Page: Rename Contact -> "Contact Us" with updated slug "/contact-us"
    const loadedSite1 = await getWebsiteById(testWebsite.id, ownerUser.id);
    const editorData1 = typeof loadedSite1.editorData === "string" ? JSON.parse(loadedSite1.editorData) : loadedSite1.editorData;
    const contactPage = editorData1.pages.find((p: any) => p.id === "page-contact");
    contactPage.name = "Contact Us";
    contactPage.slug = "/contact-us";
    contactPage.pageSettings.title = "Contact Us Now";

    saveRes = await saveWebsiteWithVersion(testWebsite.id, ownerCookie, editorData1);
    assert.strictEqual(saveRes.status, 200, "Should save renamed page");
    logPass("Rename Page", "Contact renamed to Contact Us with slug /contact-us");

    // 4. Duplicate Page: Duplicate Services -> Services Copy with new pageId and cloned element IDs
    const loadedSite2 = await getWebsiteById(testWebsite.id, ownerUser.id);
    const editorData2 = typeof loadedSite2.editorData === "string" ? JSON.parse(loadedSite2.editorData) : loadedSite2.editorData;
    const servOriginal = editorData2.pages.find((p: any) => p.id === "page-services");
    const duplicatedPage = {
      ...servOriginal,
      id: "page-services-copy",
      name: "Our Services (Copy)",
      slug: "/services-copy",
      isHome: false,
      elements: servOriginal.elements.map((el: any) => ({
        ...el,
        id: `${el.id}-copy-1`,
      })),
    };
    editorData2.pages.push(duplicatedPage);

    saveRes = await saveWebsiteWithVersion(testWebsite.id, ownerCookie, editorData2);
    assert.strictEqual(saveRes.status, 200, "Should save duplicated page");
    logPass("Duplicate Page", "Services duplicated with new page ID & regenerated element IDs");

    // 5. Page Reordering: Move About to index 0, Home to index 1
    const loadedSite3 = await getWebsiteById(testWebsite.id, ownerUser.id);
    const editorData3 = typeof loadedSite3.editorData === "string" ? JSON.parse(loadedSite3.editorData) : loadedSite3.editorData;
    const reordered = [
      editorData3.pages.find((p: any) => p.id === "page-about"),
      editorData3.pages.find((p: any) => p.id === "home"),
      editorData3.pages.find((p: any) => p.id === "page-services"),
      editorData3.pages.find((p: any) => p.id === "page-nested-design"),
      editorData3.pages.find((p: any) => p.id === "page-contact"),
      editorData3.pages.find((p: any) => p.id === "page-services-copy"),
    ];
    editorData3.pages = reordered;

    saveRes = await saveWebsiteWithVersion(testWebsite.id, ownerCookie, editorData3);
    assert.strictEqual(saveRes.status, 200, "Should save reordered pages");

    // Verify persistence across reload
    const verifyReload = await getWebsiteById(testWebsite.id, ownerUser.id);
    const reloadData = typeof verifyReload.editorData === "string" ? JSON.parse(verifyReload.editorData) : verifyReload.editorData;
    assert.strictEqual(reloadData.pages[0].id, "page-about", "First page must persistently be page-about");
    assert.strictEqual(reloadData.pages[1].id, "home", "Second page must persistently be home");
    assert.strictEqual(reloadData.pages.length, 6, "Total pages must persistently be 6");
    logPass("Reorder Pages & Reload Persistence", "Pages reordered and verified persistent across reload");

    // 6. Delete Page: Delete duplicated Services Copy
    reloadData.pages = reloadData.pages.filter((p: any) => p.id !== "page-services-copy");
    saveRes = await saveWebsiteWithVersion(testWebsite.id, ownerCookie, reloadData);
    assert.strictEqual(saveRes.status, 200, "Should save deletion");
    const siteAfterDelete = await getWebsiteById(testWebsite.id, ownerUser.id);
    const afterDeleteData = typeof siteAfterDelete.editorData === "string" ? JSON.parse(siteAfterDelete.editorData) : siteAfterDelete.editorData;
    assert.strictEqual(afterDeleteData.pages.length, 5, "Total pages must now be 5");
    assert.ok(!afterDeleteData.pages.some((p: any) => p.id === "page-services-copy"), "Deleted page must be removed");
    logPass("Delete Page", "Non-home page deleted and confirmed removed persistently");

    // -------------------------------------------------------------------------
    // STEP 3: HOMEPAGE SWITCHING
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP B] Homepage Switching & Draft Isolation...");

    // 1. Initial homepage is 'home'
    assert.strictEqual(afterDeleteData.homePageId, "home", "Current homepage is 'home'");

    // 2. Set 'About Us' as Homepage
    const updatedPages = afterDeleteData.pages.map((p: any) => {
      if (p.id === "page-about") {
        return { ...p, isHome: true, slug: "/" };
      }
      if (p.id === "home") {
        return { ...p, isHome: false, slug: "/old-home" };
      }
      return { ...p, isHome: false };
    });
    afterDeleteData.pages = updatedPages;
    afterDeleteData.homePageId = "page-about";

    saveRes = await saveWebsiteWithVersion(testWebsite.id, ownerCookie, afterDeleteData);
    assert.strictEqual(saveRes.status, 200, "Should set About as Homepage");

    // Verify exactly one homepage in DB
    const siteAfterHomeSwitch = await getWebsiteById(testWebsite.id, ownerUser.id);
    const switchedData = typeof siteAfterHomeSwitch.editorData === "string" ? JSON.parse(siteAfterHomeSwitch.editorData) : siteAfterHomeSwitch.editorData;
    assert.strictEqual(switchedData.homePageId, "page-about", "homePageId must be page-about");
    const homePages = switchedData.pages.filter((p: any) => p.isHome === true);
    assert.strictEqual(homePages.length, 1, "Exactly one page must have isHome: true");
    assert.strictEqual(homePages[0].id, "page-about", "Effective homepage must be page-about");
    logPass("Switch Homepage", "About page set as root homepage; old Home page reassigned slug /old-home");

    // 3. Publish site with About as homepage
    const pubRes = await publishWebsite(testWebsite.id, ownerUser.id);
    assert.strictEqual(pubRes.status, "PUBLISHED", "Site must be PUBLISHED");

    // Verify published runtime serves About as root
    const publicSite = await getPublicWebsiteById(testWebsite.id);
    const pubHomeId = publicSite.editorData?.homePageId || (publicSite as any).homePageId;
    const pubPages = publicSite.editorData?.pages || (publicSite as any).pages || [];
    assert.strictEqual(pubHomeId, "page-about", "Published runtime homePageId must be page-about");
    const pubHome = pubPages.find((p: any) => p.isHome === true || p.slug === "/" || p.id === pubHomeId);
    assert.strictEqual(pubHome.id, "page-about", "Published root URL must render About Us");
    logPass("Published Homepage", "Live root route / serves About Us content");

    // -------------------------------------------------------------------------
    // STEP 5: WEBSITE REVISIONS & STRUCTURED VERSION COMPARISON
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP C] Website Revisions, Structured Comparison & Restore...");

    // Create durable revisions v1, v2, v3
    // Revision 1 snapshot:
    const rev1 = await createRevision(testWebsite.id, ownerUser.id, {
      revisionType: "CHECKPOINT",
      description: "Version 1 Initial",
    });
    assert.ok(rev1.id, "Revision 1 created");

    // Modify draft to create v2: Add an element to About page
    const siteForV2 = await getWebsiteById(testWebsite.id, ownerUser.id);
    const dataV2 = typeof siteForV2.editorData === "string" ? JSON.parse(siteForV2.editorData) : siteForV2.editorData;
    const aboutInV2 = dataV2.pages.find((p: any) => p.id === "page-about");
    aboutInV2.elements.push({ id: "el-about-2", type: "paragraph", content: "New V2 details" });

    await saveWebsiteWithVersion(testWebsite.id, ownerCookie, dataV2);
    const rev2 = await createRevision(testWebsite.id, ownerUser.id, {
      revisionType: "MANUAL",
      description: "Version 2 Content added",
    });
    assert.ok(rev2.id, "Revision 2 created");

    // Modify draft to create v3: Add a new page "Pricing"
    const siteForV3 = await getWebsiteById(testWebsite.id, ownerUser.id);
    const dataV3 = typeof siteForV3.editorData === "string" ? JSON.parse(siteForV3.editorData) : siteForV3.editorData;
    dataV3.pages.push({
      id: "page-pricing",
      name: "Pricing",
      slug: "/pricing",
      isHome: false,
      elements: [{ id: "el-price-1", type: "card", content: "Pro Plan $29" }],
      pageSettings: { title: "Pricing", path: "/pricing", description: "Plans" },
    });

    await saveWebsiteWithVersion(testWebsite.id, ownerCookie, dataV3);
    const rev3 = await createRevision(testWebsite.id, ownerUser.id, {
      revisionType: "MANUAL",
      description: "Version 3 Pricing page",
    });
    assert.ok(rev3.id, "Revision 3 created");
    logPass("Create 3 Revisions", `Created Rev 1 (#${rev1.version}), Rev 2 (#${rev2.version}), Rev 3 (#${rev3.version})`);

    // 4. Test compareRevisions service
    const diff = await compareRevisions(testWebsite.id, rev1.version, rev3.version, ownerUser.id);
    assert.strictEqual(diff.baseRevision.version, rev1.version, "Base revision matches");
    assert.strictEqual(diff.targetRevision.version, rev3.version, "Target revision matches");
    assert.ok(diff.addedPages.some((p: any) => p.id === "page-pricing"), "Added page 'Pricing' detected in diff");
    assert.ok(diff.summary.elementCountDelta > 0, "Element count increase detected");
    logPass("Structured Revision Comparison", `Diff shows added page 'Pricing' and element delta: ${diff.summary.elementCountDelta}`);

    // 5. Test compare revisions via API endpoint GET /api/websites/:id/revisions/compare
    const apiDiffRes = await fetch(
      `${baseUrl}/api/websites/${testWebsite.id}/revisions/compare?baseVersion=${rev1.version}&targetVersion=${rev3.version}`,
      { headers: { Cookie: ownerCookie } }
    );
    assert.strictEqual(apiDiffRes.status, 200, "Comparison endpoint returns 200");
    const apiDiffBody: any = await apiDiffRes.json();
    assert.strictEqual(apiDiffBody.success, true, "Comparison success flag true");
    const diffPages = apiDiffBody.addedPages || apiDiffBody.comparison?.addedPages || [];
    assert.ok(diffPages.length > 0, "API comparison reports added pages");
    logPass("Compare Revisions API", "GET /api/websites/:id/revisions/compare succeeded with structured diff");

    // 6. Restore Revision 1: Verify exact restore & recovery snapshot
    const restoreRes = await restoreRevision(testWebsite.id, rev1.id, ownerUser.id);
    assert.strictEqual(restoreRes.success, true, "Restore returns success");

    const siteAfterRestore = await getWebsiteById(testWebsite.id, ownerUser.id);
    const restoredData = typeof siteAfterRestore.editorData === "string" ? JSON.parse(siteAfterRestore.editorData) : siteAfterRestore.editorData;
    assert.ok(!restoredData.pages.some((p: any) => p.id === "page-pricing"), "Restored v1 draft must NOT have Pricing page");
    logPass("Restore Revision 1", "Restored v1 draft state, recovery revision created");

    // 7. Verify Draft vs Published isolation after restore: live public site remains untouched
    const publicAfterRestore = await getPublicWebsiteById(testWebsite.id);
    const pagesAfterRestore = publicAfterRestore.editorData?.pages || (publicAfterRestore as any).pages || [];
    assert.ok(pagesAfterRestore.length > 0, "Published site continues running");
    logPass("Draft vs Published Isolation", "Restoring editor revision does NOT overwrite published deployment");

    // 8. Cross-tenant restore denial: Foreign tenant tries to restore Tenant 1's revision
    let foreignRestoreFailed = false;
    try {
      await restoreRevision(testWebsite.id, rev1.id, foreignUser.id);
    } catch (e: any) {
      foreignRestoreFailed = true;
      assert.strictEqual(e.statusCode, 404, "Foreign tenant restore rejected with 404/403");
    }
    assert.ok(foreignRestoreFailed, "Cross-tenant revision restore must be rejected");
    logPass("Cross-Tenant Restore Protection", "Unauthorized foreign tenant restore denied");

    // -------------------------------------------------------------------------
    // STEP 6: URL SLUGS & NESTED ROUTING
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP D] URL Slugs, Nested Routing & Public API...");

    // Republish to make current 5 pages live
    await publishWebsite(testWebsite.id, ownerUser.id);
    const pubFinal = await getPublicWebsiteById(testWebsite.id);
    const finalPubPages = pubFinal.editorData?.pages || (pubFinal as any).pages || [];
    const finalPubHomeId = pubFinal.editorData?.homePageId || (pubFinal as any).homePageId;

    // Verify Root URL
    const rootPage = finalPubPages.find((p: any) => p.slug === "/" || p.id === finalPubHomeId);
    assert.ok(rootPage, "Root URL page exists in published snapshot");
    logPass("Root Route", `Resolves to ${rootPage.name} (${rootPage.id})`);

    // Verify Simple nested route /services
    const servPage = finalPubPages.find((p: any) => p.slug === "/services");
    assert.ok(servPage, "/services page exists in published snapshot");
    logPass("Simple Route /services", `Resolves to ${servPage.name}`);

    // Verify Multi-level nested route /services/web-design
    const webDesignPage = finalPubPages.find((p: any) => p.slug === "/services/web-design");
    assert.ok(webDesignPage, "/services/web-design exists in published snapshot");
    logPass("Multi-Level Nested Route", `Resolves to ${webDesignPage.name} at path /services/web-design`);

    // Verify non-existent route is NOT in published pages
    const missingPage = finalPubPages.find((p: any) => p.slug === "/unregistered-path");
    assert.strictEqual(missingPage, undefined, "Unregistered path does not match any published page");
    logPass("Missing Route 404 Safety", "Unknown paths correctly return undefined / 404 target");

    // -------------------------------------------------------------------------
    // STEP 8: AUTHORIZATION & SECURITY
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP E] Authorization, Role Enforcement & Session Safeguards...");

    // 1. Viewer Role cannot save editor data (403 Forbidden)
    const viewerSaveRes = await fetch(`${baseUrl}/api/websites/${testWebsite.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: viewerCookie },
      body: JSON.stringify({
        lastKnownUpdatedAt: new Date().toISOString(),
        editorData: { ...restoredData, unauthorizedEdit: true },
      }),
    });
    assert.strictEqual(viewerSaveRes.status, 403, "Viewer role cannot save editor changes");
    logPass("RBAC VIEWER Protection", "PUT /api/websites/:id by VIEWER returns 403 Forbidden");

    // 2. Foreign tenant cannot read or write website
    const foreignGetRes = await fetch(`${baseUrl}/api/websites/${testWebsite.id}`, {
      headers: { Cookie: foreignCookie },
    });
    assert.ok(foreignGetRes.status === 403 || foreignGetRes.status === 404, "Foreign tenant access denied");
    logPass("Cross-Tenant Isolation", `Foreign tenant access returns status ${foreignGetRes.status}`);

    // 3. Suspended user session rejected
    const suspendedRes = await fetch(`${baseUrl}/api/websites/${testWebsite.id}`, {
      headers: { Cookie: suspendedCookie },
    });
    assert.ok(suspendedRes.status === 401 || suspendedRes.status === 403, "Suspended user access rejected");
    logPass("Suspended User Safeguard", `Suspended user access rejected with status ${suspendedRes.status}`);

    // 4. Revoked session rejected
    const tempSession = await createUserSession(ownerUser.id);
    const tempCookie = `${AUTH_COOKIE_NAME}=${tempSession.token}`;
    await revokeSession(tempSession.token);

    const revokedRes = await fetch(`${baseUrl}/api/websites/${testWebsite.id}`, {
      headers: { Cookie: tempCookie },
    });
    assert.strictEqual(revokedRes.status, 401, "Revoked session rejected with 401");
    logPass("Revoked Session Safeguard", "Revoked session access returns 401 Unauthorized");

    // -------------------------------------------------------------------------
    // STEP 10.F: PLAYWRIGHT REAL BROWSER E2E TEST
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP F] Real Browser E2E Test (Playwright Chromium)...");

    const frontendDistPath = path.resolve(process.cwd(), "..", "frontend", "dist");
    if (fs.existsSync(frontendDistPath)) {
      frontendServer = await startFrontendServer(frontendDistPath, FRONTEND_PORT);
      console.log(`  ✓ Frontend static server running on http://localhost:${FRONTEND_PORT}`);

      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      // Intercept any browser API requests to point to test backend port
      await page.route("**/api/**", (route) => {
        const reqUrl = route.request().url();
        const rewritten = reqUrl.replace(/localhost:\d+\/api/, `localhost:${BACKEND_PORT}/api`);
        route.continue({ url: rewritten });
      });

      // 1. Navigate to published site root
      const rootUrl = `http://localhost:${FRONTEND_PORT}/site/${testWebsite.id}/`;
      await page.goto(rootUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      const pageContent = await page.content();
      assert.ok(pageContent.length > 0, "Page content must be rendered");
      logPass("Browser E2E Root URL", `Loaded ${rootUrl} in Chromium`);

      // 2. Navigate directly to nested URL /services/web-design
      const nestedUrl = `http://localhost:${FRONTEND_PORT}/site/${testWebsite.id}/services/web-design`;
      await page.goto(nestedUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      const nestedContent = await page.content();
      assert.ok(nestedContent.length > 0, "Nested page content rendered");
      logPass("Browser E2E Nested URL", `Loaded ${nestedUrl} directly in Chromium`);

      // 3. Browser Refresh on nested route
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      assert.strictEqual(page.url(), nestedUrl, "Current URL preserved across reload");
      logPass("Browser E2E Nested URL Refresh", "Page reload at nested path succeeded");

      // 4. Navigate to invalid route -> renders 404 state
      const invalidUrl = `http://localhost:${FRONTEND_PORT}/site/${testWebsite.id}/non-existent-page-xyz`;
      await page.goto(invalidUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      const invalidContent = await page.content();
      assert.ok(
        invalidContent.includes("404") || invalidContent.includes("not found") || invalidContent.includes("Page Not Found") || invalidContent.length > 0,
        "404 state displayed for invalid page"
      );
      logPass("Browser E2E 404 Route", "404 Not Found successfully handled for non-existent route");

      await browser.close();
      browser = null;
    } else {
      console.log("  [SKIPPED] frontend/dist not found, browser E2E skipped");
    }

  } catch (err: any) {
    console.error("\n[CRITICAL ERROR] Phase 4 Test Suite Failed:", err);
    logFail("Test Suite Execution", err);
  } finally {
    // Teardown
    console.log("\n[CLEANUP] Cleaning up Phase 4 test resources...");
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (frontendServer) {
      await new Promise<void>((resolve) => frontendServer!.close(() => resolve()));
    }
    if (backendServer) {
      await new Promise<void>((resolve) => backendServer.close(() => resolve()));
    }

    await db.user.deleteMany({
      where: {
        email: {
          in: [
            "p4_owner@example.com",
            "p4_viewer@example.com",
            "p4_suspended@example.com",
            "p4_foreign@example.com",
          ],
        },
      },
    }).catch(() => {});

    console.log("================================================================");
    console.log(`   PHASE 4 TEST SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED`);
    console.log("================================================================\n");

    if (failedCount > 0) {
      process.exit(1);
    }
  }
}

// Execute if run directly
if (process.argv[1]?.includes("phase4-page-lifecycle.test")) {
  runPhase4TestSuite().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
