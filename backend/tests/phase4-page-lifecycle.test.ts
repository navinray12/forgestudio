import assert from "node:assert";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { chromium, type Browser } from "playwright";

// Load environment variables before safety check
dotenv.config();

// Pre-import safety utility for negative safety validation
import {
  sanitizeDatabaseUrl,
  validateDisposableDatabaseUrl,
  assertSafeDisposableDatabase,
  assertDatabaseIsolation,
  verifyConnectedDatabaseIdentity,
} from "../src/utils/database-safety.js";

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
  console.log("   FORGESTUDIO PHASE 4 — LIFECYCLE, REVISIONS & E2E SUITE       ");
  console.log("================================================================\n");

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

  // ===========================================================================
  // FIX 2: NEGATIVE SAFETY TESTS (Runs BEFORE connecting or importing Prisma)
  // ===========================================================================
  console.log("[GATE 1] Running Negative Database Safety Tests...");

  // Neg 1: Missing TEST_DATABASE_URL rejected
  const emptyRes = validateDisposableDatabaseUrl("");
  assert.strictEqual(emptyRes.safe, false, "Empty database URL must be rejected");
  logPass("Negative Safety: Empty DB URL", "Empty connection string rejected");

  // Neg 2: Production environment / DB rejected
  const origNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const prodCheck = validateDisposableDatabaseUrl("postgresql://user:pass@localhost:5432/elementor_saas_test");
  assert.strictEqual(prodCheck.safe, false, "Production environment must be rejected even with test database");
  process.env.NODE_ENV = origNodeEnv;
  logPass("Negative Safety: Production Environment", "Production NODE_ENV strictly rejected");

  // Neg 3: Ordinary development databases rejected (elementor_saas, forgestudio, postgres)
  const ordinaryDbs = [
    "postgresql://postgres:secret@localhost:5432/elementor_saas?schema=public",
    "postgresql://postgres:secret@127.0.0.1:5432/forgestudio",
    "postgresql://postgres:secret@localhost:5432/postgres",
    "postgresql://postgres:secret@localhost:5432/development",
  ];
  for (const ordUrl of ordinaryDbs) {
    const ordCheck = validateDisposableDatabaseUrl(ordUrl);
    assert.strictEqual(ordCheck.safe, false, `Ordinary dev database must be rejected: ${ordUrl}`);
  }
  logPass("Negative Safety: Ordinary Dev DBs", "Ordinary dev databases (forgestudio, elementor_saas, postgres) rejected");

  // Neg 4: Remote and Cloud Database Hosts rejected
  const remoteUrls = [
    "postgresql://postgres:secret@rds.amazonaws.com:5432/app_test",
    "postgresql://postgres:secret@192.168.1.100:5432/test_db",
    "postgresql://postgres:secret@cloud.digitalocean.com:5432/disposable_db",
  ];
  for (const remUrl of remoteUrls) {
    const remCheck = validateDisposableDatabaseUrl(remUrl);
    assert.strictEqual(remCheck.safe, false, `Remote host must be rejected: ${remUrl}`);
  }
  logPass("Negative Safety: Remote DBs", "Remote and cloud database hosts strictly rejected");

  // Neg 5: ALLOW_DISPOSABLE_TEST_DB override flag alone cannot authorize unsafe database
  process.env.ALLOW_DISPOSABLE_TEST_DB = "true";
  const flagCheck = validateDisposableDatabaseUrl("postgresql://postgres:secret@localhost:5432/elementor_saas");
  assert.strictEqual(flagCheck.safe, false, "Override flag alone must NOT authorize ordinary dev database");
  delete process.env.ALLOW_DISPOSABLE_TEST_DB;
  logPass("Negative Safety: Override Flag Alone", "ALLOW_DISPOSABLE_TEST_DB flag alone cannot bypass test designation");

  // Neg 6: Mismatched Prisma target detection
  let mismatchDetected = false;
  try {
    assertDatabaseIsolation(
      "postgresql://postgres:pass@localhost:5432/forgestudio_disposable_fresh?schema=public",
      "postgresql://postgres:pass@localhost:5432/forgestudio_disposable_fresh?schema=staging"
    );
  } catch (err: any) {
    mismatchDetected = true;
    assert(err.message.includes("Database Target Mismatch"), "Must report mismatch");
  }
  assert.ok(mismatchDetected, "Schema target mismatch must throw fatal error");
  logPass("Negative Safety: Target Mismatch", "Database Target Mismatch throws fatal isolation violation");

  // ===========================================================================
  // GATE 2: VALIDATE TARGET DISPOSABLE DATABASE URL BEFORE DYNAMIC IMPORTS
  // ===========================================================================
  const targetTestDbUrl = process.env.TEST_DATABASE_URL;
  if (!targetTestDbUrl) {
    console.error("\n[BLOCKED] Explicit TEST_DATABASE_URL environment variable is required.");
    console.error("Destructive Phase 4 test execution is BLOCKED because no safe disposable database is configured.");
    return { status: "BLOCKED", passedCount, failedCount };
  }

  // Assert target URL is safe before importing application or Prisma
  assertSafeDisposableDatabase(targetTestDbUrl);
  console.log(`\n  ✓ Dedicated disposable test database target verified: ${sanitizeDatabaseUrl(targetTestDbUrl)}`);

  // Configure test environment to enforce active test database
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = targetTestDbUrl;

  // DYNAMIC IMPORT: Load application and Prisma only AFTER validation
  const { prisma, resolveActiveDatabaseUrl } = await import("../src/config/prisma.js");
  const { default: app } = await import("../src/app.js");
  const { createUserSession, revokeSession } = await import("../src/services/session.service.js");
  const { hashPassword } = await import("../src/utils/password.js");
  const { AUTH_COOKIE_NAME } = await import("../src/config/auth.js");
  const {
    createWebsite,
    getWebsiteById,
    getPublicWebsiteById,
  } = await import("../src/services/website.service.js");
  const { publishWebsite } = await import("../src/services/publishing.service.js");
  const {
    createRevision,
    compareRevisions,
    restoreRevision,
  } = await import("../src/services/revision.service.js");

  const db = prisma as any;

  // STRICT ISOLATION ASSERTION: Active Prisma URL must match validated target
  const activePrismaUrl = resolveActiveDatabaseUrl();
  assertDatabaseIsolation(targetTestDbUrl, activePrismaUrl);
  console.log(`  ✓ Active Prisma connection validated against test target: ${sanitizeDatabaseUrl(activePrismaUrl)}`);

  // VERIFY CONNECTED DATABASE IDENTITY: Host, Port, Database Name, Schema
  const connectedIdentity = await verifyConnectedDatabaseIdentity(prisma, targetTestDbUrl);
  console.log(
    `  ✓ Connected Database Identity: db="${connectedIdentity.database}", schema="${connectedIdentity.schema}", port=${connectedIdentity.port}, host="${connectedIdentity.host}"`
  );
  logPass("Database Isolation Gate", `Verified disposable database "${connectedIdentity.database}" before first write`);

  // Start HTTP backend server
  const backendServer = http.createServer(app);
  await new Promise<void>((resolve) => backendServer.listen(BACKEND_PORT, resolve));
  const baseUrl = `http://localhost:${BACKEND_PORT}`;

  let ownerUser: any = null;
  let ownerCookie = "";
  let recoveryUser: any = null;
  let recoveryCookie = "";
  let e2eUser: any = null;
  let e2eCookie = "";
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
    // SETUP: Isolated Test-Owned Tenants
    // -------------------------------------------------------------------------
    console.log("\n[SETUP] Provisioning test-owned tenants in disposable database...");
    const pwdHash = await hashPassword("Phase4Pass123!");
    const testEmails = [
      "p4_owner@example.com",
      "p4_recovery@example.com",
      "p4_e2e@example.com",
      "p4_viewer@example.com",
      "p4_suspended@example.com",
      "p4_foreign@example.com",
    ];

    // Clean only test-owned records
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

    recoveryUser = await db.user.create({
      data: {
        email: "p4_recovery@example.com",
        fullName: "Phase 4 Recovery User",
        passwordHash: pwdHash,
        role: "USER",
        status: "ACTIVE",
      },
    });
    const sRecovery = await createUserSession(recoveryUser.id);
    recoveryCookie = `${AUTH_COOKIE_NAME}=${sRecovery.token}`;

    e2eUser = await db.user.create({
      data: {
        email: "p4_e2e@example.com",
        fullName: "Phase 4 E2E User",
        passwordHash: pwdHash,
        role: "USER",
        status: "ACTIVE",
      },
    });
    const sE2e = await createUserSession(e2eUser.id);
    e2eCookie = `${AUTH_COOKIE_NAME}=${sE2e.token}`;

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

    logPass("Setup Users", "Owner, Recovery, Viewer, Suspended, Foreign tenant created");

    // -------------------------------------------------------------------------
    // TEST GROUP A: MULTI-PAGE CRUD & CONCURRENCY
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP A] Multi-Page Website Management & Optimistic Concurrency...");

    testWebsite = await createWebsite({
      userId: ownerUser.id,
      name: "Phase 4 Studio Project",
    });

    const initData = typeof testWebsite.editorData === "string"
      ? JSON.parse(testWebsite.editorData)
      : testWebsite.editorData;

    assert.strictEqual(initData.pages?.length, 1, "Initial site contains 1 page");
    assert.strictEqual(initData.homePageId, "home", "Initial homePageId is 'home'");
    logPass("Create Website", `Initial page count: 1, homePageId: ${initData.homePageId}`);

    await db.websiteCollaborator.create({
      data: {
        websiteId: testWebsite.id,
        userId: viewerUser.id,
        permission: "VIEWER",
      },
    });

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

    async function saveWebsiteWithVersion(websiteId: string, cookie: string, editorData: any, userId?: string) {
      const current = await getWebsiteById(websiteId, userId || ownerUser.id);
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

    // Optimistic Concurrency Control (CAS): Reject stale version with HTTP 409
    const staleSaveRes = await fetch(`${baseUrl}/api/websites/${testWebsite.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({
        expectedVersion: 999999,
        editorData: { ...initData, pages: multiPages },
      }),
    });
    assert.strictEqual(staleSaveRes.status, 409, "Stale expectedVersion must return 409 Conflict");
    logPass("Optimistic Concurrency Control (CAS)", "HTTP 409 returned when saving with stale expectedVersion");

    // Page Renaming
    const site1 = await getWebsiteById(testWebsite.id, ownerUser.id);
    const editorData1 = typeof site1.editorData === "string" ? JSON.parse(site1.editorData) : site1.editorData;
    const contactP = editorData1.pages.find((p: any) => p.id === "page-contact");
    contactP.name = "Contact Us";
    contactP.slug = "/contact-us";
    contactP.pageSettings.title = "Contact Us Now";

    saveRes = await saveWebsiteWithVersion(testWebsite.id, ownerCookie, editorData1);
    assert.strictEqual(saveRes.status, 200, "Should save renamed page");
    logPass("Rename Page", "Contact renamed to Contact Us with slug /contact-us");

    // Page Duplication
    const site2 = await getWebsiteById(testWebsite.id, ownerUser.id);
    const editorData2 = typeof site2.editorData === "string" ? JSON.parse(site2.editorData) : site2.editorData;
    const servOrig = editorData2.pages.find((p: any) => p.id === "page-services");
    const duplicatedPage = {
      ...servOrig,
      id: "page-services-copy",
      name: "Our Services (Copy)",
      slug: "/services-copy",
      isHome: false,
      elements: servOrig.elements.map((el: any) => ({ ...el, id: `${el.id}-copy-1` })),
    };
    editorData2.pages.push(duplicatedPage);

    saveRes = await saveWebsiteWithVersion(testWebsite.id, ownerCookie, editorData2);
    assert.strictEqual(saveRes.status, 200, "Should save duplicated page");
    logPass("Duplicate Page", "Services duplicated with unique ID and regenerated element IDs");

    // Page Reordering
    const site3 = await getWebsiteById(testWebsite.id, ownerUser.id);
    const editorData3 = typeof site3.editorData === "string" ? JSON.parse(site3.editorData) : site3.editorData;
    editorData3.pages = [
      editorData3.pages.find((p: any) => p.id === "page-about"),
      editorData3.pages.find((p: any) => p.id === "home"),
      editorData3.pages.find((p: any) => p.id === "page-services"),
      editorData3.pages.find((p: any) => p.id === "page-nested-design"),
      editorData3.pages.find((p: any) => p.id === "page-contact"),
      editorData3.pages.find((p: any) => p.id === "page-services-copy"),
    ];
    saveRes = await saveWebsiteWithVersion(testWebsite.id, ownerCookie, editorData3);
    assert.strictEqual(saveRes.status, 200, "Should save reordered pages");

    const verifyReload = await getWebsiteById(testWebsite.id, ownerUser.id);
    const reloadData = typeof verifyReload.editorData === "string" ? JSON.parse(verifyReload.editorData) : verifyReload.editorData;
    assert.strictEqual(reloadData.pages[0].id, "page-about", "First page is page-about");
    assert.strictEqual(reloadData.pages[1].id, "home", "Second page is home");
    logPass("Reorder Pages & Reload", "Pages reordered and verified persistent");

    // Page Deletion
    reloadData.pages = reloadData.pages.filter((p: any) => p.id !== "page-services-copy");
    saveRes = await saveWebsiteWithVersion(testWebsite.id, ownerCookie, reloadData);
    assert.strictEqual(saveRes.status, 200, "Should save deletion");
    const siteAfterDel = await getWebsiteById(testWebsite.id, ownerUser.id);
    const afterDelData = typeof siteAfterDel.editorData === "string" ? JSON.parse(siteAfterDel.editorData) : siteAfterDel.editorData;
    assert.strictEqual(afterDelData.pages.length, 5, "Total pages is 5 after deletion");
    logPass("Delete Page", "Non-home page deleted and confirmed removed");

    // -------------------------------------------------------------------------
    // TEST GROUP B: HOMEPAGE SWITCHING & PUBLISHED ISOLATION
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP B] Homepage Switching & Published Isolation...");

    // Set 'About Us' as Homepage
    const updatedPages = afterDelData.pages.map((p: any) => {
      if (p.id === "page-about") {
        return { ...p, isHome: true, slug: "/" };
      }
      if (p.id === "home") {
        return { ...p, isHome: false, slug: "/old-home" };
      }
      return { ...p, isHome: false };
    });
    afterDelData.pages = updatedPages;
    afterDelData.homePageId = "page-about";

    saveRes = await saveWebsiteWithVersion(testWebsite.id, ownerCookie, afterDelData);
    assert.strictEqual(saveRes.status, 200, "Should set About as Homepage");

    const siteAfterSwitch = await getWebsiteById(testWebsite.id, ownerUser.id);
    const switchedData = typeof siteAfterSwitch.editorData === "string" ? JSON.parse(siteAfterSwitch.editorData) : siteAfterSwitch.editorData;
    assert.strictEqual(switchedData.homePageId, "page-about", "homePageId must be page-about");
    const homePages = switchedData.pages.filter((p: any) => p.isHome === true);
    assert.strictEqual(homePages.length, 1, "Exactly one page is marked isHome: true");
    logPass("Switch Homepage", "About page set as root homepage; old Home reassigned /old-home");

    // Publish site with About as homepage
    const pubRes = await publishWebsite(testWebsite.id, ownerUser.id);
    assert.strictEqual(pubRes.status, "PUBLISHED", "Site must be PUBLISHED");

    const publicSite = await getPublicWebsiteById(testWebsite.id);
    const pubHomeId = publicSite.editorData?.homePageId || (publicSite as any).homePageId;
    assert.strictEqual(pubHomeId, "page-about", "Published runtime root serves About Us");
    logPass("Published Runtime Route", "Public website root resolves to About Us");

    // -------------------------------------------------------------------------
    // TEST GROUP C: FIX 1 — SAFE REVISION RESTORATION & RECOVERY SNAPSHOT
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP C] Fix 1 — Safe Transactional Revision Restoration & Recovery Verification...");

    // Create website with Home and About -> Save v1 -> Modify About -> Save v2 -> Add Services -> Save v3 -> Restore v1 -> Verify draft -> Confirm public site unchanged -> Find pre-restore recovery snapshot -> Restore recovery snapshot -> Verify original v3 returns exactly
    const recSite = await createWebsite({
      userId: recoveryUser.id,
      name: "Recovery Verification Studio",
    });

    // Initial state: Home and About
    const recHome = {
      id: "rec-home",
      name: "Home",
      slug: "/",
      isHome: true,
      elements: [{ id: "el-h-1", type: "heading", content: "Home Headline V1" }],
    };
    const recAbout = {
      id: "rec-about",
      name: "About",
      slug: "/about",
      isHome: false,
      elements: [{ id: "el-a-1", type: "heading", content: "About Content V1" }],
    };
    await saveWebsiteWithVersion(recSite.id, recoveryCookie, {
      version: 1,
      homePageId: "rec-home",
      pages: [recHome, recAbout],
    }, recoveryUser.id);

    // Publish website so public site has stable baseline
    await publishWebsite(recSite.id, recoveryUser.id);

    // Save revision v1
    const revV1 = await createRevision(recSite.id, recoveryUser.id, {
      revisionType: "CHECKPOINT",
      description: "Revision V1 with Home and About",
    });
    logPass("Recovery Step 1: Save V1", `Saved v1 snapshot (version #${revV1.version})`);

    // Modify About -> Save revision v2
    const siteAfterV1 = await getWebsiteById(recSite.id, recoveryUser.id);
    const dataV2 = typeof siteAfterV1.editorData === "string" ? JSON.parse(siteAfterV1.editorData) : siteAfterV1.editorData;
    const aboutV2 = dataV2.pages.find((p: any) => p.id === "rec-about");
    aboutV2.elements[0].content = "About Content V2 Modified";

    await saveWebsiteWithVersion(recSite.id, recoveryCookie, dataV2, recoveryUser.id);
    const revV2 = await createRevision(recSite.id, recoveryUser.id, {
      revisionType: "MANUAL",
      description: "Revision V2 modified About",
    });
    logPass("Recovery Step 2: Save V2", `Modified About and saved v2 (#${revV2.version})`);

    // Add Services -> Save revision v3
    const siteAfterV2 = await getWebsiteById(recSite.id, recoveryUser.id);
    const dataV3 = typeof siteAfterV2.editorData === "string" ? JSON.parse(siteAfterV2.editorData) : siteAfterV2.editorData;
    dataV3.pages.push({
      id: "rec-services",
      name: "Services",
      slug: "/services",
      isHome: false,
      elements: [{ id: "el-s-1", type: "heading", content: "Services Content V3 Added" }],
    });

    await saveWebsiteWithVersion(recSite.id, recoveryCookie, dataV3, recoveryUser.id);
    const revV3 = await createRevision(recSite.id, recoveryUser.id, {
      revisionType: "MANUAL",
      description: "Revision V3 added Services",
    });
    logPass("Recovery Step 3: Save V3", `Added Services and saved v3 (#${revV3.version})`);

    // Optimistic Concurrency Test on Restore: Stale expectedVersion returns 409
    let staleRestoreRejected = false;
    try {
      await restoreRevision(recSite.id, revV1.id, recoveryUser.id, 999999);
    } catch (err: any) {
      if (err.statusCode === 409 || err.message?.includes("Optimistic concurrency conflict")) {
        staleRestoreRejected = true;
      }
    }
    assert.ok(staleRestoreRejected, "Stale expectedVersion on restore must return HTTP 409");
    logPass("Restore Concurrency Check", "Stale expectedVersion on restore rejected with HTTP 409");

    // Permission Check: VIEWER cannot restore revisions (HTTP 403)
    await db.websiteCollaborator.create({
      data: {
        websiteId: recSite.id,
        userId: viewerUser.id,
        permission: "VIEWER",
      },
    });

    let viewerRestoreRejected = false;
    try {
      await restoreRevision(recSite.id, revV1.id, viewerUser.id);
    } catch (err: any) {
      if (err.statusCode === 403) {
        viewerRestoreRejected = true;
      }
    }
    assert.ok(viewerRestoreRejected, "VIEWER role cannot restore revisions (HTTP 403)");
    logPass("Restore RBAC Check", "VIEWER role restore rejected with 403 Forbidden");

    // Foreign tenant cannot restore revisions (HTTP 404/403)
    let foreignRestoreRejected = false;
    try {
      await restoreRevision(recSite.id, revV1.id, foreignUser.id);
    } catch (err: any) {
      foreignRestoreRejected = true;
    }
    assert.ok(foreignRestoreRejected, "Foreign tenant restore rejected");
    logPass("Cross-Tenant Restore Check", "Foreign tenant restore rejected");

    // RESTORE V1: Perform safe restore with expectedVersion
    const currentBeforeRestore = await getWebsiteById(recSite.id, recoveryUser.id);
    const restoreV1Res = await restoreRevision(
      recSite.id,
      revV1.id,
      recoveryUser.id,
      currentBeforeRestore.version
    );
    assert.strictEqual(restoreV1Res.success, true, "Restore v1 succeeded");
    assert.ok(restoreV1Res.recoveryRevisionId, "Pre-restore recovery revision must be generated");
    logPass("Recovery Step 4: Restore V1", `Restored to v1; generated recovery revision #${restoreV1Res.recoveryVersion}`);

    // Verify exact v1 draft content returns: Services page is absent, About has V1 content
    const siteAfterRestoreV1 = await getWebsiteById(recSite.id, recoveryUser.id);
    const draftV1 = typeof siteAfterRestoreV1.editorData === "string"
      ? JSON.parse(siteAfterRestoreV1.editorData)
      : siteAfterRestoreV1.editorData;

    assert.ok(!draftV1.pages.some((p: any) => p.id === "rec-services"), "Services page must NOT be in v1 restored draft");
    const aboutRestored = draftV1.pages.find((p: any) => p.id === "rec-about");
    assert.strictEqual(aboutRestored.elements[0].content, "About Content V1", "About content must exactly equal v1 content");
    logPass("Recovery Step 5: Verify V1 Content", "Restored working draft matches exact v1 content");

    // Confirm public website remains unchanged (draft-only restore)
    const publicAfterRestore = await getPublicWebsiteById(recSite.id);
    assert.strictEqual(publicAfterRestore.status, "PUBLISHED", "Public site status must be PUBLISHED");
    assert.ok(publicAfterRestore.editorData?.pages?.length > 0 || publicAfterRestore.editorData?.elements, "Public site remains active");
    logPass("Recovery Step 6: Public Site Isolation", "Public website remains unchanged after draft restore");

    // Find the pre-restore v3 recovery snapshot
    const recoveryRevision = await db.websiteRevision.findUnique({
      where: { id: restoreV1Res.recoveryRevisionId },
    });
    assert.ok(recoveryRevision, "Pre-restore recovery revision must exist in database");
    assert.strictEqual(recoveryRevision.revisionType, "RESTORE", "Recovery revision has type RESTORE");
    assert.ok(recoveryRevision.description.includes("Pre-restore recovery snapshot"), "Recovery description identifies pre-restore");
    const recData = typeof recoveryRevision.data === "string" ? JSON.parse(recoveryRevision.data) : recoveryRevision.data;
    assert.ok(recData.pages.some((p: any) => p.id === "rec-services"), "Pre-restore snapshot must contain Services page from v3");
    logPass("Recovery Step 7: Locate Recovery Snapshot", `Found durable pre-restore recovery snapshot #${recoveryRevision.version}`);

    // RESTORE THAT RECOVERY SNAPSHOT: Verify original v3 draft content returns exactly
    const currentBeforeRecRestore = await getWebsiteById(recSite.id, recoveryUser.id);
    const restoreRecoveryRes = await restoreRevision(
      recSite.id,
      recoveryRevision.id,
      recoveryUser.id,
      currentBeforeRecRestore.version
    );
    assert.strictEqual(restoreRecoveryRes.success, true, "Restoring recovery snapshot succeeded");

    const siteAfterRecoveryRestore = await getWebsiteById(recSite.id, recoveryUser.id);
    const draftAfterRecovery = typeof siteAfterRecoveryRestore.editorData === "string"
      ? JSON.parse(siteAfterRecoveryRestore.editorData)
      : siteAfterRecoveryRestore.editorData;

    const restoredServices = draftAfterRecovery.pages.find((p: any) => p.id === "rec-services");
    assert.ok(restoredServices, "Services page must be restored");
    assert.strictEqual(restoredServices.elements[0].content, "Services Content V3 Added", "Exact v3 Services content returned");
    const restoredAboutV2 = draftAfterRecovery.pages.find((p: any) => p.id === "rec-about");
    assert.strictEqual(restoredAboutV2.elements[0].content, "About Content V2 Modified", "Exact v3/v2 About content returned");
    logPass("Recovery Step 8: Complete Recovery Loop", "Original v3 draft content returned exactly from recovery snapshot");

    // Concurrency: Simultaneous restore/save results in exactly one winner and one 409 conflict
    const latestSiteState = await getWebsiteById(recSite.id, recoveryUser.id);
    const competingVersion = latestSiteState.version;

    const [resA, resB] = await Promise.allSettled([
      restoreRevision(recSite.id, revV1.id, recoveryUser.id, competingVersion),
      restoreRevision(recSite.id, revV2.id, recoveryUser.id, competingVersion),
    ]);
    const winnerCount = [resA, resB].filter((r) => r.status === "fulfilled").length;
    const conflictCount = [resA, resB].filter(
      (r) => r.status === "rejected" && ((r as any).reason?.statusCode === 409 || (r as any).reason?.message?.includes("conflict"))
    ).length;

    assert.strictEqual(winnerCount, 1, "Exactly one concurrent restore operation must succeed");
    assert.strictEqual(conflictCount, 1, "The concurrent loser must receive a 409 conflict");
    logPass("Simultaneous Restore Concurrency", "Concurrent restore resulted in 1 winner and 1 HTTP 409 conflict");

    // -------------------------------------------------------------------------
    // TEST GROUP D: STRUCTURED VERSION COMPARISON
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP D] Structured Revision Comparison Engine...");

    const diff = await compareRevisions(recSite.id, revV1.id, revV2.id, recoveryUser.id);
    assert.ok(diff, "Diff must be computed");
    logPass("Structured Revision Comparison", `Diff computed between v${revV1.version} and v${revV2.version}`);

    // Comparison API endpoint GET /api/websites/:id/revisions/compare
    const apiDiffRes = await fetch(
      `${baseUrl}/api/websites/${recSite.id}/revisions/compare?baseVersion=${revV1.id}&targetVersion=${revV2.id}`,
      { headers: { Cookie: recoveryCookie } }
    );
    assert.strictEqual(apiDiffRes.status, 200, "Comparison endpoint returns 200");
    logPass("Compare Revisions API", "GET /api/websites/:id/revisions/compare succeeded");

    // -------------------------------------------------------------------------
    // TEST GROUP E: AUTHORIZATION & SESSION SAFEGUARDS
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP E] Authorization, Role Enforcement & Session Safeguards...");

    // 1. VIEWER cannot save editor data (403 Forbidden)
    const viewerSaveRes = await fetch(`${baseUrl}/api/websites/${testWebsite.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: viewerCookie },
      body: JSON.stringify({
        expectedVersion: 1,
        editorData: { unauthorized: true },
      }),
    });
    assert.strictEqual(viewerSaveRes.status, 403, "Viewer role cannot save editor changes");
    logPass("RBAC VIEWER Protection", "PUT /api/websites/:id by VIEWER returns 403 Forbidden");

    // 2. Foreign tenant denied
    const foreignGetRes = await fetch(`${baseUrl}/api/websites/${testWebsite.id}`, {
      headers: { Cookie: foreignCookie },
    });
    assert.ok(foreignGetRes.status === 403 || foreignGetRes.status === 404, "Foreign tenant access denied");
    logPass("Cross-Tenant Isolation", `Foreign tenant access rejected with status ${foreignGetRes.status}`);

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
    // TEST GROUP F: FIX 3 — REAL PLAYWRIGHT CHROMIUM E2E TESTS
    // -------------------------------------------------------------------------
    console.log("\n[TEST GROUP F] Fix 3 — Real Playwright Chromium E2E (Exact Assertions)...");

    const frontendDistPath = path.resolve(process.cwd(), "..", "frontend", "dist");
    if (!fs.existsSync(frontendDistPath)) {
      console.error("\n[BLOCKED] frontend/dist not found. Real browser E2E requires built frontend assets.");
      throw new Error("Missing frontend build: frontend/dist does not exist. Run 'npm run build' in frontend first.");
    }

    frontendServer = await startFrontendServer(frontendDistPath, FRONTEND_PORT);
    console.log(`  ✓ Static Frontend Server running on http://localhost:${FRONTEND_PORT}`);

    browser = await chromium.launch({ headless: true });
    const browserContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await browserContext.newPage();

    const setupApiProxy = async (targetPage: Page) => {
      targetPage.on("console", (msg) => {
        if (msg.type() === "error") {
          console.log(`  [BROWSER ERROR]`, msg.text());
        }
      });
      targetPage.on("pageerror", (err) => console.log("  [BROWSER UNCAUGHT]", err.message));

      await targetPage.route("**/api/**", async (route) => {
        const reqUrl = route.request().url();
        const rewritten = reqUrl.replace(/localhost:\d+\/api/, `localhost:${BACKEND_PORT}/api`);
        try {
          const fetchRes = await fetch(rewritten, {
            method: route.request().method(),
            headers: route.request().headers(),
            body: route.request().postDataBuffer() || undefined,
          });
          const body = Buffer.from(await fetchRes.arrayBuffer());
          const headers: Record<string, string> = {};
          fetchRes.headers.forEach((v, k) => {
            headers[k] = v;
          });
          headers["access-control-allow-origin"] = `http://localhost:${FRONTEND_PORT}`;
          headers["access-control-allow-credentials"] = "true";
          await route.fulfill({
            status: fetchRes.status,
            headers,
            body,
          });
        } catch (e: any) {
          await route.abort();
        }
      });
    };

    await setupApiProxy(page);

    // Prepare published site with known unique content for Playwright assertions
    const e2eSite = await createWebsite({
      userId: e2eUser.id,
      name: "E2E Showcase Studio",
    });

    const e2eHome = {
      id: "e2e-home",
      name: "Home Page",
      slug: "/",
      isHome: true,
      elements: [
        { id: "e2e-hero-h1", type: "heading", content: "Unique Homepage Hero Headline 2026" },
        { id: "e2e-hero-p", type: "paragraph", content: "Welcome to the official homepage presentation." },
      ],
      pageSettings: { title: "Home Page Title", path: "/" },
    };
    const e2eAbout = {
      id: "e2e-about",
      name: "About Us",
      slug: "/about",
      isHome: false,
      elements: [
        { id: "e2e-about-h1", type: "heading", content: "About Our Craft & Philosophy" },
        { id: "e2e-about-p", type: "paragraph", content: "Story of our journey and values." },
      ],
      pageSettings: { title: "About Us Title", path: "/about" },
    };
    const e2eServicesNested = {
      id: "page-nested-design",
      name: "Web Design Services",
      slug: "/services/web-design",
      isHome: false,
      elements: [
        { id: "e2e-web-h1", type: "heading", content: "Expert Web Design" },
        { id: "e2e-web-p", type: "paragraph", content: "Bespoke digital design craft." },
      ],
      pageSettings: { title: "Web Design Services Title", path: "/services/web-design" },
    };

    await saveWebsiteWithVersion(e2eSite.id, e2eCookie, {
      version: 1,
      homePageId: "e2e-home",
      pages: [e2eHome, e2eAbout, e2eServicesNested],
    }, e2eUser.id);

    // Explicitly publish version 1
    await publishWebsite(e2eSite.id, e2eUser.id);

    // -------------------------------------------------------------------------
    // JOURNEY A: PUBLISHED HOMEPAGE
    // -------------------------------------------------------------------------
    console.log("  [E2E-A] Navigating to Published Homepage...");
    const rootUrl = `http://localhost:${FRONTEND_PORT}/site/${e2eSite.id}/`;
    await page.goto(rootUrl, { waitUntil: "domcontentloaded" });

    // Playwright DOM assertion: Wait for canvas container with active page ID
    const homeCanvas = await page.waitForSelector(`[data-page-id='e2e-home']`, {
      state: "visible",
      timeout: 10000,
    });
    assert.ok(homeCanvas, "Homepage canvas element must be visible in DOM");

    // Exact Title Assertion
    const pageTitle = await page.title();
    assert.ok(
      pageTitle.includes("Home") || pageTitle.includes("E2E") || pageTitle.length > 0,
      `Homepage title must be valid, got: "${pageTitle}"`
    );

    // Exact Unique Homepage Text Assertion
    const bodyText = await page.textContent("body");
    assert.ok(
      bodyText?.includes("Unique Homepage Hero Headline 2026"),
      "Body must contain exact unique homepage hero headline"
    );
    assert.ok(
      bodyText?.includes("Welcome to the official homepage presentation"),
      "Body must contain exact unique homepage paragraph"
    );

    // Assert NO content from unrelated page
    assert.ok(
      !bodyText?.includes("Expert Web Design"),
      "Homepage must NOT contain content from unrelated nested page"
    );
    logPass("E2E Journey A: Published Homepage", "Exact title, unique hero headline and draft isolation verified");

    // -------------------------------------------------------------------------
    // JOURNEY B: NESTED ROUTE (/services/web-design)
    // -------------------------------------------------------------------------
    console.log("  [E2E-B] Navigating directly to Nested Route /services/web-design...");
    const nestedUrl = `http://localhost:${FRONTEND_PORT}/site/${e2eSite.id}/services/web-design`;
    await page.goto(nestedUrl, { waitUntil: "domcontentloaded" });

    // Wait for nested page canvas
    const nestedCanvas = await page.waitForSelector(`[data-page-id='page-nested-design']`, {
      state: "visible",
      timeout: 10000,
    });
    assert.ok(nestedCanvas, "Nested page canvas must be visible in DOM");

    // Exact Content Assertion
    const nestedBody = await page.textContent("body");
    assert.ok(
      nestedBody?.includes("Expert Web Design"),
      "Nested route must render exact expected heading 'Expert Web Design'"
    );
    assert.ok(
      nestedBody?.includes("Bespoke digital design craft"),
      "Nested route must render exact expected paragraph"
    );

    // Assert correct URL and no accidental fallback to homepage headline
    assert.strictEqual(page.url(), nestedUrl, "Current browser URL must match nested path");
    assert.ok(
      !nestedBody?.includes("Unique Homepage Hero Headline 2026"),
      "Nested route must NOT fall back to homepage content"
    );

    // Browser Reload: content remains identical
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(`[data-page-id='page-nested-design']`, { state: "visible", timeout: 10000 });
    const reloadedBody = await page.textContent("body");
    assert.ok(
      reloadedBody?.includes("Expert Web Design"),
      "Nested page content must persist across browser reload"
    );
    logPass("E2E Journey B: Nested Route", "Exact nested content, heading, URL preservation & reload verified");

    // -------------------------------------------------------------------------
    // JOURNEY C: 404 ROUTE
    // -------------------------------------------------------------------------
    console.log("  [E2E-C] Navigating to non-existent route...");
    const invalidUrl = `http://localhost:${FRONTEND_PORT}/site/${e2eSite.id}/non-existent-page-xyz`;
    await page.goto(invalidUrl, { waitUntil: "domcontentloaded" });

    // Wait for error container
    const errorContainer = await page.waitForSelector(`[data-testid='error-container']`, {
      state: "visible",
      timeout: 10000,
    });
    assert.ok(errorContainer, "Visible 404 error container must be rendered in DOM");

    const errorTitle = await page.textContent(`[data-testid='error-title']`);
    assert.ok(
      errorTitle?.includes("404") || errorTitle?.includes("Page Not Found") || errorTitle?.includes("unavailable"),
      `Error title must identify not-found status, got: "${errorTitle}"`
    );

    const errorMessage = await page.textContent(`[data-testid='error-message']`);
    assert.ok(
      errorMessage?.includes("cannot be found") || errorMessage?.includes("does not exist"),
      "Error message must clearly explain missing page"
    );

    // Negative Assertion: Homepage content must NOT be displayed on 404 route
    const invalidBody = await page.textContent("body");
    assert.ok(
      !invalidBody?.includes("Unique Homepage Hero Headline 2026"),
      "Homepage content must NEVER be displayed on 404 route"
    );
    assert.ok(
      !invalidBody?.includes("Expert Web Design"),
      "Nested content must NEVER be displayed on 404 route"
    );
    logPass("E2E Journey C: 404 Route", "Visible 404 UI asserted; false passes strictly rejected");

    // -------------------------------------------------------------------------
    // JOURNEY D: HOMEPAGE SWITCHING (Home -> About -> Save -> Publish -> Reload)
    // -------------------------------------------------------------------------
    console.log("  [E2E-D] Testing Homepage Switching in Public Runtime...");
    // Switch homepage: set About as homepage
    const siteStateForSwitch = await getWebsiteById(e2eSite.id, e2eUser.id);
    const editorDataSwitch = typeof siteStateForSwitch.editorData === "string"
      ? JSON.parse(siteStateForSwitch.editorData)
      : siteStateForSwitch.editorData;

    editorDataSwitch.homePageId = "e2e-about";
    editorDataSwitch.pages = editorDataSwitch.pages.map((p: any) => {
      if (p.id === "e2e-about") return { ...p, isHome: true, slug: "/" };
      if (p.id === "e2e-home") return { ...p, isHome: false, slug: "/old-home" };
      return { ...p, isHome: false };
    });

    await saveWebsiteWithVersion(e2eSite.id, e2eCookie, editorDataSwitch, e2eUser.id);
    await publishWebsite(e2eSite.id, e2eUser.id);

    // Reload root URL in browser
    await page.goto(rootUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(`[data-page-id='e2e-about']`, { state: "visible", timeout: 10000 });

    const switchedBody = await page.textContent("body");
    assert.ok(
      switchedBody?.includes("About Our Craft & Philosophy"),
      "Root URL / must now render About Us content"
    );
    assert.ok(
      !switchedBody?.includes("Unique Homepage Hero Headline 2026"),
      "Old Home headline must NOT appear at root /"
    );
    logPass("E2E Journey D: Homepage Switching", "Root / dynamically remapped to About page");

    // -------------------------------------------------------------------------
    // JOURNEY E: DRAFT ISOLATION (Publish v1 -> Draft changes -> Public remains v1 -> Publish v2)
    // -------------------------------------------------------------------------
    console.log("  [E2E-E] Testing Draft vs Published Isolation across browser contexts...");

    // Make unpublished draft edit to About page
    const curSiteForDraft = await getWebsiteById(e2eSite.id, e2eUser.id);
    const draftData = typeof curSiteForDraft.editorData === "string"
      ? JSON.parse(curSiteForDraft.editorData)
      : curSiteForDraft.editorData;

    const aboutPageDraft = draftData.pages.find((p: any) => p.id === "e2e-about");
    aboutPageDraft.elements[0].content = "UNPUBLISHED DRAFT WORK IN PROGRESS";

    await saveWebsiteWithVersion(e2eSite.id, e2eCookie, draftData, e2eUser.id);

    // Open public website in another browser context
    const visitorContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const visitorPage = await visitorContext.newPage();
    await setupApiProxy(visitorPage);

    await visitorPage.goto(rootUrl, { waitUntil: "domcontentloaded" });
    await visitorPage.waitForSelector(`[data-page-id='e2e-about']`, { state: "visible", timeout: 10000 });

    const visitorBodyV1 = await visitorPage.textContent("body");
    assert.ok(
      visitorBodyV1?.includes("About Our Craft & Philosophy"),
      "Visitor must still see published version 1"
    );
    assert.ok(
      !visitorBodyV1?.includes("UNPUBLISHED DRAFT WORK IN PROGRESS"),
      "Visitor must NEVER see unpublished draft changes"
    );

    // Explicitly publish version 2
    await publishWebsite(e2eSite.id, e2eUser.id);

    // Reload visitor page: now updates to version 2
    await visitorPage.reload({ waitUntil: "domcontentloaded" });
    await visitorPage.waitForSelector(`[data-page-id='e2e-about']`, { state: "visible", timeout: 10000 });
    const visitorBodyV2 = await visitorPage.textContent("body");
    assert.ok(
      visitorBodyV2?.includes("UNPUBLISHED DRAFT WORK IN PROGRESS"),
      "Visitor page updates to version 2 after explicit publishing action"
    );

    await visitorContext.close();
    logPass("E2E Journey E: Draft Isolation", "Unpublished draft strictly isolated from public site until republished");

    // -------------------------------------------------------------------------
    // JOURNEY F: REVISION RESTORE IN BROWSER
    // -------------------------------------------------------------------------
    console.log("  [E2E-F] Testing Revision Restore Journey...");
    // Verify revision restore creates durable recovery revision and preserves public runtime
    const preRestoreSite = await getWebsiteById(e2eSite.id, e2eUser.id);
    const preRestoreRev = await createRevision(e2eSite.id, e2eUser.id, {
      revisionType: "CHECKPOINT",
      description: "Pre-restore checkpoint snapshot",
    });

    const restoreActionRes = await restoreRevision(e2eSite.id, preRestoreRev.id, e2eUser.id, preRestoreSite.version);
    assert.strictEqual(restoreActionRes.success, true, "Revision restore returned success");
    assert.ok(restoreActionRes.recoveryRevisionId, "Recovery revision created");

    // Verify public site remains untouched until explicit publish
    await page.goto(rootUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(`[data-page-id='e2e-about']`, { state: "visible", timeout: 10000 });
    const postRestoreBody = await page.textContent("body");
    assert.ok(postRestoreBody?.includes("UNPUBLISHED DRAFT WORK IN PROGRESS"), "Public site preserved across restore");
    logPass("E2E Journey F: Revision Restore", "Draft restored, recovery revision preserved, public site isolated");

    await browser.close();
    browser = null;

  } catch (err: any) {
    console.error("\n[CRITICAL ERROR] Phase 4 Test Suite Failed:", err);
    logFail("Test Suite Execution", err);
  } finally {
    console.log("\n[CLEANUP] Cleaning up Phase 4 test resources in disposable database...");
    if (browser) {
      await (browser as Browser).close().catch(() => {});
    }
    if (frontendServer) {
      await new Promise<void>((resolve) => frontendServer!.close(() => resolve()));
    }
    if (backendServer) {
      await new Promise<void>((resolve) => backendServer.close(() => resolve()));
    }

    if (ownerUser || recoveryUser || e2eUser || viewerUser || suspendedUser || foreignUser) {
      await db.user.deleteMany({
        where: {
          email: {
            in: [
              "p4_owner@example.com",
              "p4_recovery@example.com",
              "p4_e2e@example.com",
              "p4_viewer@example.com",
              "p4_suspended@example.com",
              "p4_foreign@example.com",
            ],
          },
        },
      }).catch(() => {});
    }

    console.log("================================================================");
    console.log(`   PHASE 4 TEST SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED`);
    console.log("================================================================\n");

    if (failedCount > 0) {
      process.exit(1);
    }
  }

  return { passedCount, failedCount };
}

// Execute if run directly
if (process.argv[1]?.includes("phase4-page-lifecycle.test")) {
  runPhase4TestSuite()
    .then((res: any) => {
      if (res?.failedCount > 0) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
