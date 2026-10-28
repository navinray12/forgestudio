import assert from "node:assert";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium, type Browser, type Page } from "playwright";
import {
  assertSafeDisposableDatabase,
  assertDatabaseIsolation,
  sanitizeDatabaseUrl,
} from "../utils/database-safety.js";

const BACKEND_PORT = 5000;
const FRONTEND_PORT = 5173;

// Lightweight SPA static file server for frontend/dist
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
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  };

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url || "/", `http://localhost:${port}`);
        let pathname = decodeURIComponent(reqUrl.pathname);

        // Security check
        const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, "");
        let filePath = path.join(frontendDistPath, safePath);

        // Check if file exists
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const contentType = mimeTypes[ext] || "application/octet-stream";
          res.writeHead(200, { "Content-Type": contentType });
          fs.createReadStream(filePath).pipe(res);
          return;
        }

        // SPA fallback: serve index.html for all non-asset routes
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

function startBackendServer(appInstance: any, port: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(appInstance);
    server.listen(port, () => resolve(server));
    server.on("error", reject);
  });
}

async function runBrowserE2E() {
  console.log("================================================================");
  console.log("FORGESTUDIO PHASE 1 REAL BROWSER E2E TEST (PLAYWRIGHT CHROMIUM)");
  console.log("================================================================\n");

  // ---------------------------------------------------------------------------
  // SAFEGUARD: Strict Disposable-Database Verification & Isolation Guard
  // 1. Validate target test DB URL before importing any database client.
  // 2. Reject remote, production, ordinary development and mismatched targets.
  // 3. Guarantee that ALLOW_DISPOSABLE_TEST_DB=true alone cannot authorize
  //    testing against an ordinary development database.
  // ---------------------------------------------------------------------------
  const targetTestDbUrl =
    process.env.TEST_DATABASE_URL ||
    "postgresql://postgres:Br22%40Bihar@localhost:5432/forgestudio_disposable_fresh?schema=public";

  // Validate the intended disposable database connection
  assertSafeDisposableDatabase(targetTestDbUrl);
  console.log(`  ✓ Database verified as safe disposable target: ${sanitizeDatabaseUrl(targetTestDbUrl)}`);

  // Explicitly configure test environment before loading application/database modules
  process.env.NODE_ENV = "test";
  process.env.TEST_DATABASE_URL = targetTestDbUrl;
  process.env.DATABASE_URL = targetTestDbUrl;

  // Dynamically import database and application modules
  const { prisma, resolveActiveDatabaseUrl } = await import("../config/prisma.js");
  const { default: app } = await import("../app.js");
  const { signupUser } = await import("../services/signup.service.js");
  const {
    getLastSentOtp,
    clearEmailTestTransport,
    enableIsolatedTestTransport,
    disableIsolatedTestTransport,
  } = await import("../services/email.service.js");

  // Strict isolation check: Prisma must be connected to the exact validated disposable database
  const activePrismaUrl = resolveActiveDatabaseUrl();
  assertDatabaseIsolation(targetTestDbUrl, activePrismaUrl);
  console.log(`  ✓ Active Prisma database connection verified: ${sanitizeDatabaseUrl(activePrismaUrl)}`);

  enableIsolatedTestTransport();
  clearEmailTestTransport();

  const testSuffix = crypto.randomBytes(4).toString("hex");
  const testEmail = `e2e_user_${testSuffix}@example.com`;
  const testPassword = "Password123!Secure";
  const testWebsiteName = `E2E Studio ${testSuffix}`;

  let backendServer: http.Server | null = null;
  let frontendServer: http.Server | null = null;
  let browser: Browser | null = null;
  let createdUserId = "";
  let createdWebsiteId = "";

  const frontendDistPath = path.resolve(process.cwd(), "..", "frontend", "dist");
  assert(fs.existsSync(frontendDistPath), `frontend/dist directory must exist at ${frontendDistPath}`);

  try {
    // -------------------------------------------------------------------------
    // 0. START SERVERS & LAUNCH CHROMIUM
    // -------------------------------------------------------------------------
    console.log("\n[SETUP] Starting Backend & Frontend Servers...");
    backendServer = await startBackendServer(app, BACKEND_PORT);
    console.log(`  ✓ Backend server listening on http://localhost:${BACKEND_PORT}`);

    frontendServer = await startFrontendServer(frontendDistPath, FRONTEND_PORT);
    console.log(`  ✓ Frontend static SPA server listening on http://localhost:${FRONTEND_PORT}`);

    console.log("\n[SETUP] Launching Playwright Chromium (Headless)...");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    // Auto-accept browser dialogs (e.g. window.confirm for rollback)
    page.on("dialog", async (dialog) => {
      console.log(`  ✓ Browser dialog handled: [${dialog.type()}] "${dialog.message()}" -> accept`);
      await dialog.accept();
    });
    console.log("  ✓ Chromium browser initialized");

    // Pre-create user account in PostgreSQL
    const signupRecord = await signupUser({
      identifier: testEmail,
      password: testPassword,
      fullName: "E2E Playwright User",
    });
    createdUserId = signupRecord.id;
    console.log(`  ✓ Test user seeded in PostgreSQL: ${testEmail} (${createdUserId})`);

    // -------------------------------------------------------------------------
    // 1. LOGIN & OTP VERIFICATION VIA REAL BROWSER UI
    // -------------------------------------------------------------------------
    console.log("\n[STEP 1] Browser Login & OTP Verification Flow...");
    await page.goto(`http://localhost:${FRONTEND_PORT}/login`, { waitUntil: "networkidle" });
    await page.waitForSelector("#identifier");
    await page.fill("#identifier", testEmail);
    await page.fill("#password", testPassword);
    console.log("  ✓ Credentials entered into LoginPage DOM");

    // Submit credentials
    await page.click('button[type="submit"]');

    // Wait for channel selection / OTP step and click submit
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.waitFor({ state: "visible", timeout: 10000 });
    await submitBtn.click();

    // Wait for OTP code input to render in DOM
    await page.waitForSelector("#otpCode", { timeout: 10000 });
    console.log("  ✓ OTP input rendered in DOM");

    // Retrieve real OTP code captured by isolated email test transport
    const capturedOtp = getLastSentOtp(testEmail);
    assert(capturedOtp, "Real OTP must be captured by isolated email test transport");
    assert(/^\d{6}$/.test(capturedOtp), `Captured OTP must be 6 digits, got: ${capturedOtp}`);
    console.log("  ✓ Isolated email test transport verified OTP delivery (credentials masked)");

    // Fill OTP in browser DOM and submit
    await page.fill("#otpCode", capturedOtp);
    await page.click('button[type="submit"]');

    // Verify browser navigates to /dashboard
    await page.waitForURL(`**/dashboard`, { timeout: 15000 });
    console.log("  ✓ Browser successfully navigated to /dashboard");

    // Verify rendered DOM elements
    await page.waitForSelector("text=Your Websites", { timeout: 10000 });
    console.log("  ✓ Dashboard DOM rendered successfully with 'Your Websites'");

    // Verify session persisted in PostgreSQL
    const userSession = await prisma.session.findFirst({
      where: { userId: createdUserId, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });
    assert(userSession, "Active user session must exist in PostgreSQL");
    console.log("  ✓ Database verified: active Session record confirmed");

    // -------------------------------------------------------------------------
    // 2. WEBSITE CREATION VIA BROWSER MODAL
    // -------------------------------------------------------------------------
    console.log("\n[STEP 2] Creating New Website via Dashboard Modal...");
    const newSiteButton = page.locator('button:has-text("New Website"), button:has-text("Create New Website")').first();
    await newSiteButton.waitFor({ state: "visible", timeout: 10000 });
    await newSiteButton.click();

    // Modal appears with #websiteName input
    await page.waitForSelector("#websiteName", { timeout: 5000 });
    await page.fill("#websiteName", testWebsiteName);
    console.log(`  ✓ Entered website name in modal: '${testWebsiteName}'`);

    // Submit website creation
    await page.click('button[type="submit"]:has-text("Create Website")');

    // Wait for navigation to /editor/:websiteId
    await page.waitForURL(`**/editor/**`, { timeout: 15000 });
    const editorUrl = page.url();
    const match = editorUrl.match(/\/editor\/([a-zA-Z0-9-]+)/);
    assert(match && match[1], `Must navigate to editor with valid website ID, got URL: ${editorUrl}`);
    createdWebsiteId = match[1];
    console.log(`  ✓ Browser navigated to WebsiteEditor: ${createdWebsiteId}`);

    // Verify persisted website record in PostgreSQL
    const websiteDb = await prisma.website.findUnique({
      where: { id: createdWebsiteId },
    });
    assert(websiteDb, "Website record must exist in PostgreSQL");
    assert.strictEqual(websiteDb.name, testWebsiteName);
    assert.strictEqual(websiteDb.status, "DRAFT");
    console.log("  ✓ Database verified: Website created with status DRAFT");

    // -------------------------------------------------------------------------
    // 3. EDITOR INTERACTIONS & ADDING ELEMENTS
    // -------------------------------------------------------------------------
    console.log("\n[STEP 3] Testing Website Editor Interactions...");
    await page.waitForSelector('button[aria-label="Save"], button:has-text("Save")', { timeout: 15000 });
    console.log("  ✓ Editor toolbar rendered in DOM");

    // Add a Heading widget by clicking on the widget card in the sidebar
    await page.locator('aside button:has-text("Elements")').click().catch(() => {});
    const headingWidget = page.locator('aside').locator('span:text-is("Heading")').first();
    await headingWidget.waitFor({ state: "visible", timeout: 10000 });
    await headingWidget.click();
    await page.waitForTimeout(500);
    console.log("  ✓ Clicked Heading widget in sidebar");

    // -------------------------------------------------------------------------
    // 4. SAVE & RELOAD VERIFICATION
    // -------------------------------------------------------------------------
    console.log("\n[STEP 4] Testing Editor Save & Page Reload...");
    const saveButton = page.locator('button[aria-label="Save"], button:has-text("Save")').first();
    await saveButton.click();

    // Wait for Save confirmation toast in DOM
    await page.waitForSelector("text=Saved successfully!", { timeout: 10000 });
    console.log("  ✓ Save confirmation toast appeared in DOM: 'Saved successfully!'");

    // Reload editor page
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('button[aria-label="Save"], button:has-text("Save")', { timeout: 15000 });
    console.log("  ✓ Editor reloaded cleanly from saved database state");

    // Verify database state: editorData must contain pages and elements
    const savedWebsite = await prisma.website.findUnique({
      where: { id: createdWebsiteId },
    });
    assert(savedWebsite, "Website must still exist in DB");
    const editorData: any = savedWebsite.editorData;
    assert(editorData, "editorData must be persisted in database");
    assert(Array.isArray(editorData.elements) || Array.isArray(editorData.pages), "editorData must contain elements or pages");
    console.log("  ✓ Database verified: editorData verified after reload");

    // -------------------------------------------------------------------------
    // 5. MEDIA UPLOAD (API UPLOAD & EDITOR INTEGRATION SEPARATED)
    // -------------------------------------------------------------------------
    console.log("\n[STEP 5] Testing Media Upload & Optimization (API & DB Verification)...");
    const testPngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const uploadResponse = await page.request.post(`http://localhost:${BACKEND_PORT}/api/uploads/image`, {
      multipart: {
        file: {
          name: "e2e_test_image.png",
          mimeType: "image/png",
          buffer: testPngBuffer,
        },
      },
    });

    assert.strictEqual(uploadResponse.status(), 200, "Image upload must return HTTP 200");
    const uploadJson = await uploadResponse.json();
    assert(uploadJson.success, "Upload response must indicate success");
    assert(uploadJson.url, "Upload response must include asset URL");
    console.log(`  ✓ Media upload API confirmed asset URL: ${uploadJson.url}`);

    // Verify persisted in PostgreSQL
    assert(uploadJson.asset?.id, "Upload response must include asset id");
    const mediaDb = await prisma.mediaAsset.findUnique({
      where: { id: uploadJson.asset.id },
    });
    assert(mediaDb, "Uploaded media asset must be persisted in PostgreSQL");
    console.log(`  ✓ Database verified: MediaAsset record confirmed (${mediaDb.id})`);

    // -------------------------------------------------------------------------
    // 6. PUBLISH WEBSITE
    // -------------------------------------------------------------------------
    console.log("\n[STEP 6] Publishing Website...");
    const publishButton = page.locator('button[aria-label="Publish"], button:has-text("Publish")').first();
    await publishButton.click();

    // Wait for Publish modal
    await page.waitForSelector('button:has-text("Publish Now")', { timeout: 10000 });
    console.log("  ✓ Publish Modal opened in DOM");

    // Click "Publish Now" and wait for backend response
    const [publishResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/publish") && r.status() === 200),
      page.click('button:has-text("Publish Now")'),
    ]);
    assert(publishResponse, "Publish request must succeed with HTTP 200");
    await page.waitForSelector("text=Website successfully published", { timeout: 10000 });
    console.log("  ✓ Publication succeeded: 'Website successfully published' confirmed in modal");

    // Close modal via close button
    const closeBtn = page.locator('button:has-text("✕")').first();
    await closeBtn.waitFor({ state: "visible", timeout: 5000 });
    await closeBtn.click();
    await page.waitForTimeout(500);

    // Verify database state: status is PUBLISHED and Deployment record exists
    const publishedWebsiteDb = await prisma.website.findUnique({
      where: { id: createdWebsiteId },
    });
    assert.strictEqual(publishedWebsiteDb?.status, "PUBLISHED", "Website status must be PUBLISHED in database");

    const deploymentV1 = await prisma.deployment.findFirst({
      where: { websiteId: createdWebsiteId, status: "PUBLISHED" },
      orderBy: { completedAt: "desc" },
    });
    assert(deploymentV1, "Deployment record must exist with status PUBLISHED");
    assert.strictEqual(deploymentV1.version, 1, "First deployment must be version 1");
    console.log(`  ✓ Database verified: Website PUBLISHED, Deployment v${deploymentV1.version} confirmed`);

    // -------------------------------------------------------------------------
    // 7. ANONYMOUS PAGE VIEW (ISOLATED INCOGNITO CONTEXT WITH DOM ASSERTIONS)
    // -------------------------------------------------------------------------
    console.log("\n[STEP 7] Anonymous Public Visitor Page Render & DOM Verification...");
    const anonContext = await browser.newContext(); // No cookies, anonymous
    const anonPage = await anonContext.newPage();

    await anonPage.goto(`http://localhost:${FRONTEND_PORT}/site/${createdWebsiteId}`, {
      waitUntil: "networkidle",
    });

    // Helper: wait until anonymous visitor page completes API hydration (not showing loading indicator)
    const waitForAnonymousSiteLoaded = async (p: Page) => {
      await p.waitForFunction(
        () => {
          const el = document.getElementById("root");
          const text = (el?.innerText || "").trim();
          return Boolean(el && text.length > 0 && !/^loading/i.test(text));
        },
        { timeout: 15000 }
      );
    };

    // Verify DOM rendered without login requirement
    await waitForAnonymousSiteLoaded(anonPage);

    // Assert actual rendered widget content in DOM, not only #root container
    const publicDomText = await anonPage.locator("#root").innerText();
    assert(
      publicDomText.length > 0,
      "Public anonymous DOM must render non-empty published website content"
    );
    assert(
      publicDomText.includes("Heading Text"),
      `Public DOM must render specific published Heading widget content, got: "${publicDomText}"`
    );
    assert(
      !publicDomText.includes("Click here to edit this paragraph text"),
      "Draft-only Text widget content must NOT be present in v1 published DOM"
    );
    console.log(`  ✓ Public DOM rendered actual published Heading widget verified: "${publicDomText.slice(0, 40).trim()}..."`);

    // Refresh anonymous page
    await anonPage.reload({ waitUntil: "networkidle" });
    await waitForAnonymousSiteLoaded(anonPage);
    console.log("  ✓ Anonymous page refresh confirmed stable");

    // -------------------------------------------------------------------------
    // 8. DRAFT ISOLATION (UNPUBLISHED CHANGES NOT VISIBLE TO PUBLIC)
    // -------------------------------------------------------------------------
    console.log("\n[STEP 8] Testing Draft Isolation (Public DOM Unchanged)...");
    // In authenticated editor, add another element and save as DRAFT (do NOT publish)
    await page.locator('aside button:has-text("Elements")').click().catch(() => {});
    const textWidget = page.locator('aside').locator('span:text-is("Text")').first();
    await textWidget.waitFor({ state: "visible", timeout: 10000 });
    await textWidget.click();
    await page.waitForTimeout(500);

    await saveButton.click();
    await page.waitForSelector("text=Saved successfully!", { timeout: 10000 });
    console.log("  ✓ Updated draft saved in editor");

    // In anonymous visitor page, reload
    await anonPage.reload({ waitUntil: "networkidle" });
    await waitForAnonymousSiteLoaded(anonPage);
    const anonDomAfterDraft = await anonPage.locator("#root").innerText();

    // Verify public site still shows exact v1 published state and draft is hidden
    assert.strictEqual(
      anonDomAfterDraft,
      publicDomText,
      "Public visitor DOM MUST remain identical to published v1 snapshot after unpublished draft edits"
    );
    assert(
      !anonDomAfterDraft.includes("Click here to edit this paragraph text"),
      "Draft-only content must stay strictly hidden from public visitor before publication"
    );
    console.log("  ✓ Draft isolation verified: Public visitor sees exact published v1 snapshot, draft-only content remains hidden");

    // -------------------------------------------------------------------------
    // 9. ROLLBACK VERIFICATION (BROWSER UI ONLY, NO API FALLBACK)
    // -------------------------------------------------------------------------
    console.log("\n[STEP 9] Testing Deployment Rollback via Browser UI...");
    // In editor, publish draft as v2
    await publishButton.click();
    await page.waitForSelector('button:has-text("Publish Now")', { timeout: 10000 });

    const [publishV2Response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/publish") && r.status() === 200),
      page.click('button:has-text("Publish Now")'),
    ]);
    assert(publishV2Response, "Publish v2 request must succeed");
    await page.waitForSelector("text=Website successfully published", { timeout: 10000 });

    // Verify Deployment v2 in DB
    const v2Deployment = await prisma.deployment.findFirst({
      where: { websiteId: createdWebsiteId, version: 2 },
    });
    assert(v2Deployment, "Deployment v2 must exist in database");
    console.log("  ✓ Deployment v2 published");

    // Confirm anonymous visitor now sees v2 and v2 differs from v1
    await anonPage.reload({ waitUntil: "networkidle" });
    await waitForAnonymousSiteLoaded(anonPage);
    const anonDomV2 = await anonPage.locator("#root").innerText();
    assert.notStrictEqual(
      anonDomV2,
      publicDomText,
      "Public visitor DOM for v2 MUST differ from v1 after republishing new content"
    );
    assert(
      anonDomV2.includes("Heading Text"),
      `v2 DOM must retain published Heading widget content, got: "${anonDomV2}"`
    );
    assert(
      anonDomV2.includes("Click here to edit this paragraph text"),
      `v2 DOM must include newly published Text widget content, got: "${anonDomV2}"`
    );
    console.log("  ✓ Browser DOM verified: v2 content differs from v1 and renders both Heading and Text widgets");

    // In editor publish modal, click Rollback button for v1 (dialog is auto-accepted by page.on('dialog'))
    const rollbackBtn = page.locator('button:has-text("Rollback")').first();
    await rollbackBtn.waitFor({ state: "visible", timeout: 15000 });
    const [rollbackRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/rollback") && r.status() === 200),
      rollbackBtn.click(),
    ]);
    assert(rollbackRes, "Rollback request must succeed with HTTP 200");
    console.log("  ✓ Rollback to v1 triggered exclusively via browser UI (no direct API fallback)");

    // Verify in database: active deployment restored deployment version 1
    const activeDeploymentAfterRollback = await prisma.deployment.findFirst({
      where: { websiteId: createdWebsiteId, status: "PUBLISHED" },
      orderBy: { completedAt: "desc" },
    });
    assert(activeDeploymentAfterRollback, "Active deployment must exist after rollback");
    const rollbackMeta = activeDeploymentAfterRollback.metadata as any;
    const restoredVersion = rollbackMeta?.rolledBackVersion ?? activeDeploymentAfterRollback.version;
    assert.strictEqual(
      restoredVersion,
      1,
      `Rollback must restore deployment version 1, got: ${restoredVersion}`
    );
    console.log(`  ✓ Database verified: Active deployment restored deployment version 1 (restoredFrom: v${restoredVersion}, deployment: v${activeDeploymentAfterRollback.version})`);

    // Verify public anonymous visitor DOM restores exact v1 content
    await anonPage.reload({ waitUntil: "networkidle" });
    await waitForAnonymousSiteLoaded(anonPage);
    const anonDomAfterRollback = await anonPage.locator("#root").innerText();
    assert.strictEqual(
      anonDomAfterRollback,
      publicDomText,
      "Public visitor DOM MUST restore exact v1 content after rollback"
    );
    assert(
      anonDomAfterRollback.includes("Heading Text"),
      "Rollback DOM must contain original v1 Heading Text"
    );
    assert(
      !anonDomAfterRollback.includes("Click here to edit this paragraph text"),
      "Rollback DOM must NOT contain v2 Text widget content"
    );
    console.log("  ✓ Browser DOM verified: Public site restored deployment version 1 and exact published content after rollback");

    // Close publish modal
    const closeBtnAfterRollback = page.locator('button:has-text("✕")').first();
    await closeBtnAfterRollback.waitFor({ state: "visible", timeout: 5000 });
    await closeBtnAfterRollback.click();
    await page.waitForTimeout(500);

    // Clean up anonymous context
    await anonContext.close();

    // -------------------------------------------------------------------------
    // 10. LOGOUT & ROUTE PROTECTION
    // -------------------------------------------------------------------------
    console.log("\n[STEP 10] Testing User Logout & Session Revocation...");
    await page.goto(`http://localhost:${FRONTEND_PORT}/dashboard`, { waitUntil: "networkidle" });
    const logoutBtn = page.locator('button:has-text("Logout")').first();
    await logoutBtn.waitFor({ state: "visible", timeout: 10000 });
    await logoutBtn.click();

    // Verify redirected to /login
    await page.waitForURL(`**/login`, { timeout: 10000 });
    console.log("  ✓ Browser redirected to /login on logout");

    // Attempt direct navigation to /dashboard
    await page.goto(`http://localhost:${FRONTEND_PORT}/dashboard`, { waitUntil: "networkidle" });
    // Must be bounced back to /login
    await page.waitForURL(`**/login`, { timeout: 10000 });
    console.log("  ✓ Route protection verified: Unauthenticated access redirected to /login");

    // Verify session revoked in PostgreSQL
    const revokedSession = await prisma.session.findFirst({
      where: { userId: createdUserId },
      orderBy: { createdAt: "desc" },
    });
    assert(revokedSession?.revokedAt !== null, "Session must have revokedAt set in PostgreSQL");
    console.log("  ✓ Database verified: Session revokedAt confirmed in PostgreSQL");

    console.log("\n================================================================");
    console.log("ALL REAL BROWSER E2E TESTS PASSED SUCCESSFULLY (10/10 STEPS)");
    console.log("================================================================");
  } finally {
    // Teardown with strict safety checks: refusal to delete non-test records
    console.log("\n[TEARDOWN] Cleaning up resources...");
    disableIsolatedTestTransport();

    if (browser) {
      await browser.close().catch(() => {});
      console.log("  ✓ Chromium closed");
    }
    if (frontendServer) {
      await new Promise<void>((r) => frontendServer!.close(() => r()));
      console.log("  ✓ Frontend server closed");
    }
    if (backendServer) {
      await new Promise<void>((r) => backendServer!.close(() => r()));
      console.log("  ✓ Backend server closed");
    }

    // Database cleanup with strict safeguards
    try {
      assert(testEmail.startsWith("e2e_user_"), "Safety violation: testEmail must start with e2e_user_");
      assert(testWebsiteName.startsWith("E2E Studio"), "Safety violation: testWebsiteName must start with E2E Studio");

      if (createdWebsiteId) {
        const site = await prisma.website.findUnique({ where: { id: createdWebsiteId } });
        if (site && site.name.startsWith("E2E Studio")) {
          await prisma.deployment.deleteMany({ where: { websiteId: createdWebsiteId } });
          await prisma.website.deleteMany({ where: { id: createdWebsiteId } });
        }
      }
      if (createdUserId) {
        const user = await prisma.user.findUnique({ where: { id: createdUserId } });
        if (user && user.email?.startsWith("e2e_user_")) {
          await prisma.session.deleteMany({ where: { userId: createdUserId } });
          await prisma.otpVerification.deleteMany({ where: { userId: createdUserId } });
          await prisma.mediaAsset.deleteMany({ where: { userId: createdUserId } });
          await prisma.user.deleteMany({ where: { id: createdUserId } });
        }
      }
      console.log("  ✓ Verified test records safely cleaned from PostgreSQL");
    } catch (cleanupErr) {
      console.warn("  ⚠ Warning during safe DB cleanup:", cleanupErr);
    }
  }
}

runBrowserE2E().catch((err) => {
  console.error("\n❌ Browser E2E Test FAILED:", err);
  process.exit(1);
});
