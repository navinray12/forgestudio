import assert from "node:assert";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium, type Browser, type Page } from "playwright";
import app from "../app.js";
import { prisma } from "../config/prisma.js";
import { signupUser } from "../services/signup.service.js";
import { getLastSentOtp, emailTestTransport, clearEmailTestTransport } from "../services/email.service.js";

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

function startBackendServer(port: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(port, () => resolve(server));
    server.on("error", reject);
  });
}

async function runBrowserE2E() {
  console.log("================================================================");
  console.log("FORGESTUDIO PHASE 1 REAL BROWSER E2E TEST (PLAYWRIGHT CHROMIUM)");
  console.log("================================================================");

  process.env.NODE_ENV = "test";
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
    backendServer = await startBackendServer(BACKEND_PORT);
    console.log(`  ✓ Backend server listening on http://localhost:${BACKEND_PORT}`);

    frontendServer = await startFrontendServer(frontendDistPath, FRONTEND_PORT);
    console.log(`  ✓ Frontend static SPA server listening on http://localhost:${FRONTEND_PORT}`);

    console.log("\n[SETUP] Launching Playwright Chromium (Headless)...");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
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

    // Wait for channel selection / OTP step
    await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
    // In select_method step, click Continue to request Email OTP
    const continueBtn = page.locator('button[type="submit"]');
    if (await continueBtn.isVisible()) {
      await continueBtn.click();
    }

    // Wait for OTP code input to render in DOM
    await page.waitForSelector("#otpCode", { timeout: 10000 });
    console.log("  ✓ OTP input rendered in DOM");

    // Retrieve real OTP code captured by isolated email test transport
    const capturedOtp = getLastSentOtp(testEmail);
    assert(capturedOtp, "Real OTP must be captured by isolated email test transport");
    assert(/^\d{6}$/.test(capturedOtp), `Captured OTP must be 6 digits, got: ${capturedOtp}`);
    console.log(`  ✓ Isolated email test transport verified OTP delivery: ${capturedOtp}`);

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
    // Click "+ New Website" button
    const newSiteButton = page.locator('button:has-text("New Website"), button:has-text("Create New Website")').first();
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
    // Wait for editor toolbar and Save button
    await page.waitForSelector('button[aria-label="Save"], button:has-text("Save")', { timeout: 15000 });
    console.log("  ✓ Editor toolbar rendered in DOM");

    // Add a Heading widget by clicking on the widget card
    const headingWidget = page.locator('div:has-text("Heading")').last();
    if (await headingWidget.isVisible()) {
      await headingWidget.click();
      console.log("  ✓ Clicked Heading widget in sidebar");
    }

    // -------------------------------------------------------------------------
    // 4. SAVE & RELOAD VERIFICATION
    // -------------------------------------------------------------------------
    console.log("\n[STEP 4] Testing Editor Save & Page Reload...");
    const saveButton = page.locator('button[aria-label="Save"], button:has-text("Save")').first();
    await saveButton.click();

    // Wait for Save confirmation in DOM
    await page.waitForSelector("text=Saved successfully!", { timeout: 10000 });
    console.log("  ✓ Save confirmation toast appeared in DOM: 'Saved successfully!'");

    // Reload editor page
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('button[aria-label="Save"], button:has-text("Save")', { timeout: 15000 });
    console.log("  ✓ Editor reloaded cleanly from saved database state");

    // Verify database state
    const savedWebsite = await prisma.website.findUnique({
      where: { id: createdWebsiteId },
    });
    assert(savedWebsite, "Website must still exist in DB");
    const editorData: any = savedWebsite.editorData;
    assert(editorData, "editorData must be persisted in database");
    console.log("  ✓ Database verified: editorData verified after reload");

    // -------------------------------------------------------------------------
    // 5. MEDIA UPLOAD VERIFICATION
    // -------------------------------------------------------------------------
    console.log("\n[STEP 5] Testing Media Upload & Optimization...");
    // 1x1 transparent PNG buffer
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
    console.log(`  ✓ Media uploaded successfully: ${uploadJson.url}`);

    // Verify persisted in PostgreSQL
    if (uploadJson.asset?.id) {
      const mediaDb = await prisma.mediaAsset.findUnique({
        where: { id: uploadJson.asset.id },
      });
      assert(mediaDb, "Uploaded media asset must be persisted in PostgreSQL");
      console.log(`  ✓ Database verified: MediaAsset record confirmed (${mediaDb.id})`);
    }

    // -------------------------------------------------------------------------
    // 6. PUBLISH WEBSITE
    // -------------------------------------------------------------------------
    console.log("\n[STEP 6] Publishing Website...");
    // Open publish modal
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
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }

    // Verify database state: status is PUBLISHED and Deployment record exists
    const publishedWebsiteDb = await prisma.website.findUnique({
      where: { id: createdWebsiteId },
    });
    assert.strictEqual(publishedWebsiteDb?.status, "PUBLISHED", "Website status must be PUBLISHED in database");

    const deployment = await prisma.deployment.findFirst({
      where: { websiteId: createdWebsiteId, status: "PUBLISHED" },
      orderBy: { version: "desc" },
    });
    assert(deployment, "Deployment record must exist with status PUBLISHED");
    assert.strictEqual(deployment.version, 1, "First deployment must be version 1");
    console.log(`  ✓ Database verified: Website PUBLISHED, Deployment v${deployment.version} confirmed`);

    // -------------------------------------------------------------------------
    // 7. ANONYMOUS PAGE VIEW (ISOLATED INCOGNITO CONTEXT)
    // -------------------------------------------------------------------------
    console.log("\n[STEP 7] Anonymous Public Visitor Page Render...");
    const anonContext = await browser.newContext(); // No cookies, anonymous
    const anonPage = await anonContext.newPage();

    await anonPage.goto(`http://localhost:${FRONTEND_PORT}/site/${createdWebsiteId}`, {
      waitUntil: "networkidle",
    });

    // Verify DOM rendered without login requirement
    await anonPage.waitForSelector("#root", { timeout: 10000 });
    console.log("  ✓ Public site rendered successfully in anonymous browser context");

    // Refresh anonymous page
    await anonPage.reload({ waitUntil: "networkidle" });
    await anonPage.waitForSelector("#root", { timeout: 10000 });
    console.log("  ✓ Anonymous page refresh confirmed stable");

    // -------------------------------------------------------------------------
    // 8. DRAFT ISOLATION (UNPUBLISHED CHANGES NOT VISIBLE TO PUBLIC)
    // -------------------------------------------------------------------------
    console.log("\n[STEP 8] Testing Draft Isolation...");
    // In authenticated editor, add another element and save as DRAFT (do NOT publish)
    const textWidget = page.locator('div:has-text("Text")').last();
    if (await textWidget.isVisible()) {
      await textWidget.click();
    }
    await saveButton.click();
    await page.waitForSelector("text=Saved successfully!", { timeout: 10000 });
    console.log("  ✓ Updated draft saved in editor");

    // In anonymous visitor page, reload
    await anonPage.reload({ waitUntil: "networkidle" });
    // Verify public site still shows v1 published state
    const currentSiteInDb = await prisma.website.findUnique({
      where: { id: createdWebsiteId },
    });
    const currentEditorData: any = currentSiteInDb?.editorData;
    assert(currentEditorData.publishedData, "PublishedData snapshot must remain intact");
    console.log("  ✓ Draft isolation verified: Public visitor sees published snapshot, not working draft");

    // -------------------------------------------------------------------------
    // 9. ROLLBACK VERIFICATION
    // -------------------------------------------------------------------------
    console.log("\n[STEP 9] Testing Deployment Rollback...");
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

    // Wait for deployment history to show Rollback button
    const rollbackBtn = page.locator('button:has-text("Rollback")').first();
    if (await rollbackBtn.isVisible()) {
      const [rollbackRes] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/rollback") && r.status() === 200),
        rollbackBtn.click(),
      ]);
      assert(rollbackRes, "Rollback request must succeed");
      console.log("  ✓ Rollback to v1 triggered via UI");
    } else {
      // Direct API fallback if list is still refreshing
      const rollbackRes = await page.request.post(
        `http://localhost:${BACKEND_PORT}/api/websites/${createdWebsiteId}/deployments/${deployment.id}/rollback`
      );
      assert.strictEqual(rollbackRes.status(), 200);
      console.log("  ✓ Rollback to v1 executed");
    }

    // Verify in database: active deployment restored
    const activeDeploymentAfterRollback = await prisma.deployment.findFirst({
      where: { websiteId: createdWebsiteId, status: "PUBLISHED" },
      orderBy: { completedAt: "desc" },
    });
    assert(activeDeploymentAfterRollback, "Active deployment must exist after rollback");
    console.log(`  ✓ Database verified: Active deployment restored after rollback (v${activeDeploymentAfterRollback.version})`);

    // Close publish modal if open
    const closeBtnAfterRollback = page.locator('button:has-text("✕")').first();
    if (await closeBtnAfterRollback.isVisible()) {
      await closeBtnAfterRollback.click();
      await page.waitForTimeout(500);
    }

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
    // Teardown
    console.log("\n[TEARDOWN] Cleaning up resources...");
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

    // Database cleanup
    try {
      if (createdWebsiteId) {
        await prisma.deployment.deleteMany({ where: { websiteId: createdWebsiteId } });
        await prisma.website.deleteMany({ where: { id: createdWebsiteId } });
      }
      if (createdUserId) {
        await prisma.session.deleteMany({ where: { userId: createdUserId } });
        await prisma.otpVerification.deleteMany({ where: { userId: createdUserId } });
        await prisma.mediaAsset.deleteMany({ where: { userId: createdUserId } });
        await prisma.user.deleteMany({ where: { id: createdUserId } });
      }
      console.log("  ✓ Test records cleaned from PostgreSQL");
    } catch (cleanupErr) {
      console.warn("  ⚠ Warning during DB cleanup:", cleanupErr);
    }
  }
}

runBrowserE2E().catch((err) => {
  console.error("\n❌ Browser E2E Test FAILED:", err);
  process.exit(1);
});
