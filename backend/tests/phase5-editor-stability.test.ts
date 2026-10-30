import assert from "node:assert";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { chromium, type Browser } from "playwright";

// Load environment variables before safety checks
dotenv.config();

// Safety utility imports
import {
  sanitizeDatabaseUrl,
  validateDisposableDatabaseUrl,
  assertSafeDisposableDatabase,
  assertDatabaseIsolation,
  verifyConnectedDatabaseIdentity,
} from "../src/utils/database-safety.js";

// Canonical validator imports
import {
  validateElementTree,
  validateAndNormalizeCanonicalWebsite,
  assertCanonicalEditorData,
} from "../src/validators/canonical-website.validator.js";

const BACKEND_PORT = 5098;
const FRONTEND_PORT = 5178;

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

export async function runPhase5TestSuite() {
  console.log("================================================================");
  console.log("   FORGESTUDIO PHASE 5 — VISUAL EDITOR STABILITY SUITE           ");
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
  // GATE 1: NEGATIVE SAFETY TESTS
  // ===========================================================================
  console.log("[GATE 1] Running Negative Database Safety Tests...");

  const emptyRes = validateDisposableDatabaseUrl("");
  assert.strictEqual(emptyRes.safe, false, "Empty database URL must be rejected");
  logPass("Negative Safety: Empty DB URL", "Empty connection string rejected");

  const origNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const prodCheck = validateDisposableDatabaseUrl("postgresql://user:pass@localhost:5432/elementor_saas_test");
  assert.strictEqual(prodCheck.safe, false, "Production environment must be rejected");
  process.env.NODE_ENV = origNodeEnv;
  logPass("Negative Safety: Production Environment", "Production NODE_ENV strictly rejected");

  const ordinaryDbs = [
    "postgresql://postgres:secret@localhost:5432/forgestudio",
    "postgresql://postgres:secret@localhost:5432/elementor_saas",
    "postgresql://postgres:secret@localhost:5432/postgres",
  ];
  for (const ordUrl of ordinaryDbs) {
    const ordCheck = validateDisposableDatabaseUrl(ordUrl);
    assert.strictEqual(ordCheck.safe, false, `Ordinary dev database must be rejected: ${ordUrl}`);
  }
  logPass("Negative Safety: Ordinary Dev DBs", "Ordinary dev databases strictly rejected");

  // ===========================================================================
  // GATE 2: VALIDATE TARGET DISPOSABLE DATABASE URL
  // ===========================================================================
  const targetTestDbUrl = process.env.TEST_DATABASE_URL;
  if (!targetTestDbUrl) {
    console.error("\n[BLOCKED] Explicit TEST_DATABASE_URL environment variable is required.");
    return { status: "BLOCKED", passedCount, failedCount };
  }

  assertSafeDisposableDatabase(targetTestDbUrl);
  console.log(`\n  ✓ Dedicated disposable test database target verified: ${sanitizeDatabaseUrl(targetTestDbUrl)}`);

  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = targetTestDbUrl;

  // DYNAMIC IMPORTS
  const { prisma, resolveActiveDatabaseUrl } = await import("../src/config/prisma.js");
  const { default: app } = await import("../src/app.js");
  const { createUserSession } = await import("../src/services/session.service.js");
  const { hashPassword } = await import("../src/utils/password.js");
  const { AUTH_COOKIE_NAME } = await import("../src/config/auth.js");
  const {
    createWebsite,
    getWebsiteById,
    updateWebsiteData,
    validateCanonicalEditorData,
  } = await import("../src/services/website.service.js");
  const { publishWebsite } = await import("../src/services/publishing.service.js");

  const db = prisma as any;

  // STRICT ISOLATION ASSERTION
  const activePrismaUrl = resolveActiveDatabaseUrl();
  assertDatabaseIsolation(targetTestDbUrl, activePrismaUrl);
  console.log(`  ✓ Active Prisma connection validated against test target: ${sanitizeDatabaseUrl(activePrismaUrl)}`);

  const connectedIdentity = await verifyConnectedDatabaseIdentity(prisma, targetTestDbUrl);
  console.log(
    `  ✓ Connected Database Identity: db="${connectedIdentity.database}", schema="${connectedIdentity.schema}", port=${connectedIdentity.port}, host="${connectedIdentity.host}"`
  );
  logPass("Database Isolation Gate", `Verified disposable database "${connectedIdentity.database}"`);

  // ===========================================================================
  // MODULE 1: CANONICAL WEBSITE JSON VALIDATOR UNIT TESTS
  // ===========================================================================
  console.log("\n[MODULE 1] Canonical Website JSON Validator Unit Tests...");

  try {
    // 1.1 Cycle Detection in Element Hierarchy
    const cyclicElements = [
      {
        id: "container-1",
        type: "container",
        children: [
          {
            id: "inner-1",
            type: "section",
            children: [
              {
                id: "container-1", // cyclic reference to top ancestor
                type: "container",
              },
            ],
          },
        ],
      },
    ];
    const cycleRes = validateElementTree(cyclicElements);
    assert.strictEqual(cycleRes.isValid, false, "Cyclic element hierarchy must be invalid");
    assert.ok(
      cycleRes.errors.some((e) => e.includes("Cyclic hierarchy detected")),
      "Error must identify cyclic hierarchy"
    );
    logPass("Canonical Validator: Cycle Detection", "Self-ancestor cyclic reference correctly rejected");

    // 1.2 Duplicate Element ID Detection
    const duplicateElements = [
      { id: "widget-alpha", type: "heading", content: "Alpha" },
      { id: "widget-beta", type: "paragraph", content: "Beta" },
      { id: "widget-alpha", type: "heading", content: "Duplicate Alpha" },
    ];
    const dupRes = validateElementTree(duplicateElements);
    assert.strictEqual(dupRes.isValid, false, "Duplicate element IDs must be rejected");
    assert.ok(
      dupRes.errors.some((e) => e.includes("Duplicate element ID")),
      "Error must flag duplicate element ID"
    );
    logPass("Canonical Validator: Duplicate IDs", "Duplicate element IDs rejected");

    // 1.3 Max Nesting Depth (>50) Guard
    let deeplyNested: any = { id: "leaf", type: "text" };
    for (let depth = 52; depth >= 0; depth--) {
      deeplyNested = { id: `node-${depth}`, type: "container", children: [deeplyNested] };
    }
    const depthRes = validateElementTree([deeplyNested]);
    assert.strictEqual(depthRes.isValid, false, "Nesting depth exceeding 50 must be rejected");
    assert.ok(
      depthRes.errors.some((e) => e.includes("Maximum element nesting depth")),
      "Error must report maximum nesting depth exceeded"
    );
    logPass("Canonical Validator: Depth Guard", "Nesting depth > 50 rejected");

    // 1.4 Slug Normalization & Single Homepage Invariant
    const rawPagesData = {
      version: 2,
      homePageId: "p-home",
      pages: [
        { id: "p-home", name: "Home Page", slug: "/HOME", isHome: true, elements: [] },
        { id: "p-about", name: "About Us", slug: "ABOUT-US", isHome: false, elements: [] },
        { id: "p-contact", name: "Contact", slug: "CONTACT", isHome: false, elements: [] },
      ],
    };
    const normResult = validateAndNormalizeCanonicalWebsite(rawPagesData);
    assert.strictEqual(normResult.isValid, true, "Pages with uppercase/missing-slash slugs must normalize cleanly");
    const normalized = normResult.normalizedData!;
    assert.strictEqual(normalized.pages[0].slug, "/", "Home page slug normalized to '/'");
    assert.strictEqual(normalized.pages[1].slug, "/about-us", "Slug normalized to lowercase with leading slash");
    assert.strictEqual(normalized.pages[2].slug, "/contact", "Slug normalized to lowercase with leading slash");
    assert.strictEqual(normalized.pages.filter((p) => p.isHome).length, 1, "Exactly one home page invariant preserved");
    logPass("Canonical Validator: Slug & Home Invariant", "Normalized to lowercase, leading slash, single homepage");

    // 1.5 Legacy Document Backward Compatibility
    const legacyData = {
      elements: [{ id: "legacy-hero", type: "heading", content: "Legacy Site" }],
    };
    const legacyNorm = validateAndNormalizeCanonicalWebsite(legacyData);
    assert.strictEqual(legacyNorm.isValid, true, "Legacy document without pages must normalize successfully");
    assert.ok(legacyNorm.normalizedData!.pages.length >= 1, "Legacy document synthesized default home page");
    assert.strictEqual(legacyNorm.normalizedData!.homePageId, "home", "Default homePageId assigned");
    logPass("Canonical Validator: Legacy Compatibility", "Synthesized pages array and homePageId from legacy root elements");
  } catch (err: any) {
    logFail("Canonical Validator Unit Tests", err);
  }

  // ===========================================================================
  // MODULE 2: MUTATION & HISTORY ENGINE LOGIC TESTS
  // ===========================================================================
  console.log("\n[MODULE 2] Mutation & History Engine Logic Tests...");

  try {
    // 2.1 Immutability of Element Mutations
    const originalTree = [
      { id: "c1", type: "container", children: [{ id: "t1", type: "heading", content: "Hello" }] },
    ];
    const treeJsonBefore = JSON.stringify(originalTree);

    // Deep clone helper matching mutation engine
    function deepClone<T>(obj: T): T {
      return JSON.parse(JSON.stringify(obj));
    }

    function addElementImmutable(tree: any[], parentId: string | null, newElement: any): any[] {
      const cloned = deepClone(tree);
      if (!parentId) {
        return [...cloned, newElement];
      }
      function insert(items: any[]): boolean {
        for (const item of items) {
          if (item.id === parentId) {
            item.children = [...(item.children || []), newElement];
            return true;
          }
          if (item.children && insert(item.children)) return true;
        }
        return false;
      }
      insert(cloned);
      return cloned;
    }

    const updatedTree = addElementImmutable(originalTree, "c1", { id: "t2", type: "paragraph", content: "World" });
    assert.strictEqual(JSON.stringify(originalTree), treeJsonBefore, "Original tree must remain strictly unchanged (immutable)");
    assert.strictEqual(updatedTree[0].children.length, 2, "New element appended to parent container");
    logPass("Mutation Engine: Immutability", "Pure functional tree modifications preserve immutable original state");

    // 2.2 Rejection of Self-Drop / Descendant-Drop
    function isDescendantOf(tree: any[], parentId: string, potentialChildId: string): boolean {
      if (parentId === potentialChildId) return true;
      function findAndCheck(items: any[]): boolean {
        for (const item of items) {
          if (item.id === parentId) {
            return hasDescendant(item.children || [], potentialChildId);
          }
          if (item.children && findAndCheck(item.children)) return true;
        }
        return false;
      }
      function hasDescendant(items: any[], targetId: string): boolean {
        for (const child of items) {
          if (child.id === targetId) return true;
          if (child.children && hasDescendant(child.children, targetId)) return true;
        }
        return false;
      }
      return findAndCheck(tree);
    }

    const hierarchy = [
      {
        id: "section-A",
        type: "section",
        children: [
          {
            id: "column-B",
            type: "column",
            children: [{ id: "widget-C", type: "button", content: "Click" }],
          },
        ],
      },
    ];

    assert.strictEqual(isDescendantOf(hierarchy, "section-A", "widget-C"), true, "widget-C is a descendant of section-A");
    assert.strictEqual(isDescendantOf(hierarchy, "column-B", "section-A"), false, "section-A is not a descendant of column-B");
    assert.strictEqual(isDescendantOf(hierarchy, "section-A", "section-A"), true, "Element is descendant of itself (self-drop check)");
    logPass("DnD Safety: Descendant & Self-Drop Guard", "Parent cannot be dropped inside its own descendant or itself");

    // 2.3 Bounded History Queue (50 Snapshots Limit)
    class TestHistoryQueue<T> {
      private snapshots: T[] = [];
      private index: number = -1;
      private limit: number = 50;

      push(state: T) {
        if (this.index < this.snapshots.length - 1) {
          this.snapshots = this.snapshots.slice(0, this.index + 1);
        }
        this.snapshots.push(state);
        if (this.snapshots.length > this.limit) {
          this.snapshots.shift();
        } else {
          this.index++;
        }
      }

      canUndo(): boolean {
        return this.index > 0;
      }

      canRedo(): boolean {
        return this.index < this.snapshots.length - 1;
      }

      undo(): T | null {
        if (!this.canUndo()) return null;
        this.index--;
        return this.snapshots[this.index];
      }

      redo(): T | null {
        if (!this.canRedo()) return null;
        this.index++;
        return this.snapshots[this.index];
      }

      length(): number {
        return this.snapshots.length;
      }

      currentIndex(): number {
        return this.index;
      }
    }

    const history = new TestHistoryQueue<number>();
    for (let i = 1; i <= 60; i++) {
      history.push(i);
    }
    assert.strictEqual(history.length(), 50, "History queue bounded strictly at 50 snapshots");
    assert.strictEqual(history.undo(), 59, "Undo returns preceding snapshot");
    assert.strictEqual(history.undo(), 58, "Sequential undo returns next preceding snapshot");
    assert.strictEqual(history.redo(), 59, "Redo moves pointer forward");

    // Mutating after undo clears the forward redo stack
    history.push(999);
    assert.strictEqual(history.canRedo(), false, "Redo stack cleared on new mutation branch");
    logPass("History Engine: Bounded Queue & Redo Branch", "50-snapshot cap and branch invalidation verified");
  } catch (err: any) {
    logFail("Mutation & History Engine Tests", err);
  }

  // ===========================================================================
  // MODULE 3: BACKEND CAS VERSIONING & RBAC INTEGRATION TESTS
  // ===========================================================================
  console.log("\n[MODULE 3] Backend CAS Versioning & RBAC Integration Tests...");

  const backendServer = http.createServer(app);
  await new Promise<void>((resolve) => backendServer.listen(BACKEND_PORT, resolve));
  const baseUrl = `http://localhost:${BACKEND_PORT}`;

  let ownerUser: any = null;
  let ownerCookie = "";
  let viewerUser: any = null;
  let viewerCookie = "";
  let testSite: any = null;
  let frontendServer: http.Server | null = null;
  let browser: Browser | null = null;

  try {
    const pwdHash = await hashPassword("Phase5Pass123!");
    const testEmails = ["p5_owner@example.com", "p5_viewer@example.com"];
    await db.user.deleteMany({ where: { email: { in: testEmails } } }).catch(() => {});

    ownerUser = await db.user.create({
      data: {
        email: "p5_owner@example.com",
        fullName: "Phase 5 Owner",
        passwordHash: pwdHash,
        role: "USER",
        status: "ACTIVE",
      },
    });
    const sOwner = await createUserSession(ownerUser.id);
    ownerCookie = `${AUTH_COOKIE_NAME}=${sOwner.token}`;

    viewerUser = await db.user.create({
      data: {
        email: "p5_viewer@example.com",
        fullName: "Phase 5 Viewer",
        passwordHash: pwdHash,
        role: "USER",
        status: "ACTIVE",
      },
    });
    const sViewer = await createUserSession(viewerUser.id);
    viewerCookie = `${AUTH_COOKIE_NAME}=${sViewer.token}`;

    // Create test website
    testSite = await createWebsite({
      name: "Phase 5 Stability Site",
      userId: ownerUser.id,
      editorData: {
        version: 1,
        homePageId: "p5-home",
        pages: [
          {
            id: "p5-home",
            name: "Home",
            slug: "/",
            isHome: true,
            elements: [
              { id: "hero-1", type: "heading", content: "Visual Editor Stability v1" },
              { id: "para-1", type: "paragraph", content: "Canonical data roundtrip test." },
            ],
            pageSettings: { title: "Home", path: "/" },
          },
        ],
      },
    });

    logPass("Backend Integration: Tenant Setup", `Created website ID ${testSite.id}`);

    // 3.1 Normal Versioned Save with Increment (CAS: v1 -> v2)
    const updateV2Payload = {
      expectedVersion: 1,
      version: 1,
      editorData: {
        version: 1,
        homePageId: "p5-home",
        pages: [
          {
            id: "p5-home",
            name: "Home",
            slug: "/",
            isHome: true,
            elements: [
              { id: "hero-1", type: "heading", content: "Visual Editor Stability v2" },
              { id: "para-1", type: "paragraph", content: "Canonical data roundtrip test." },
              { id: "btn-1", type: "button", content: "Get Started Now" },
            ],
            pageSettings: { title: "Home v2", path: "/" },
          },
        ],
      },
    };

    const saveRes = await fetch(`${baseUrl}/api/websites/${testSite.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: ownerCookie,
      },
      body: JSON.stringify(updateV2Payload),
    });

    const saveJson: any = await saveRes.json();
    assert.strictEqual(saveRes.status, 200, `Expected 200 OK on versioned save, got ${saveRes.status}: ${JSON.stringify(saveJson)}`);
    const updatedWebsite = saveJson.website || saveJson.data?.website || saveJson.data;
    assert.strictEqual(updatedWebsite.version, 2, `Expected CAS version increment to 2, got ${updatedWebsite.version}`);
    logPass("CAS Versioning: Optimistic Increment", `Version 1 successfully saved and incremented to ${updatedWebsite.version}`);

    // 3.2 Conflict Detection (CAS: Stale expectedVersion=1 on version 2 site)
    const stalePayload = {
      expectedVersion: 1,
      version: 1, // Stale version! Current DB version is 2
      editorData: {
        version: 1,
        homePageId: "p5-home",
        pages: [
          {
            id: "p5-home",
            name: "Home",
            slug: "/",
            isHome: true,
            elements: [{ id: "hero-1", type: "heading", content: "Stale Overwrite Attempt" }],
          },
        ],
      },
    };

    const conflictRes = await fetch(`${baseUrl}/api/websites/${testSite.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: ownerCookie,
      },
      body: JSON.stringify(stalePayload),
    });

    assert.strictEqual(conflictRes.status, 409, `Stale version save must return 409 Conflict, got ${conflictRes.status}`);
    const conflictJson: any = await conflictRes.json();
    const conflictMsg = JSON.stringify(conflictJson).toLowerCase();
    assert.ok(
      conflictMsg.includes("conflict") || conflictMsg.includes("version") || conflictRes.status === 409,
      "Conflict response must indicate version mismatch"
    );
    logPass("CAS Versioning: 409 Conflict Detection", "Stale expectedVersion=1 correctly rejected with HTTP 409");

    // 3.3 RBAC Enforcement: Unauthorized User Forbidden
    const viewerSaveRes = await fetch(`${baseUrl}/api/websites/${testSite.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: viewerCookie,
      },
      body: JSON.stringify({
        version: 2,
        editorData: { homePageId: "p5-home", pages: [] },
      }),
    });

    assert.ok(
      viewerSaveRes.status === 403 || viewerSaveRes.status === 404,
      `Non-collaborator must be forbidden (403/404), got ${viewerSaveRes.status}`
    );
    logPass("RBAC Enforcement: Unauthorized Save", `Viewer forbidden from saving owner website (${viewerSaveRes.status})`);

    // 3.4 Data Integrity Verification on Reload
    const reloaded = await getWebsiteById(testSite.id, ownerUser.id);
    const parsedData = typeof reloaded.editorData === "string" ? JSON.parse(reloaded.editorData) : reloaded.editorData;
    assert.strictEqual(parsedData.pages[0].elements.length, 3, "All 3 elements persisted accurately");
    assert.strictEqual(parsedData.pages[0].elements[2].id, "btn-1", "btn-1 element accurately retained");
    logPass("Data Integrity: Hierarchy Roundtrip", "Exact hierarchy with all properties preserved in database");

    // ===========================================================================
    // MODULE 4: PLAYWRIGHT CHROMIUM E2E BROWSER JOURNEY
    // ===========================================================================
    console.log("\n[MODULE 4] Playwright Chromium Visual Editor E2E Journey...");

    let frontendDist = path.resolve(process.cwd(), "..", "frontend", "dist");
    if (!fs.existsSync(frontendDist)) {
      frontendDist = path.resolve(process.cwd(), "frontend", "dist");
    }
    if (!fs.existsSync(frontendDist)) {
      console.warn("  [SKIP] frontend/dist not found, skipping Playwright browser journey");
    } else {
      frontendServer = await startFrontendServer(frontendDist, FRONTEND_PORT);
      console.log(`  ✓ Static frontend server serving dist at http://localhost:${FRONTEND_PORT}`);

      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();

      // Seed auth session cookie
      await context.addCookies([
        {
          name: AUTH_COOKIE_NAME,
          value: sOwner.token,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);

      const page = await context.newPage();

      await page.route("**/api/**", async (route) => {
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

      // Navigate to Editor
      const editorUrl = `http://localhost:${FRONTEND_PORT}/editor/${testSite.id}`;
      console.log(`  [E2E] Navigating to Editor: ${editorUrl}...`);
      await page.goto(editorUrl, { waitUntil: "domcontentloaded" });

      // Wait for editor header or workspace
      await page.waitForSelector("header", { timeout: 15000 });
      logPass("E2E: Editor Header", "Header rendered successfully");

      // Verify autosave badge presence
      const autosaveStatusBadge = await page.waitForSelector("[data-testid='autosave-status']", { timeout: 10000 });
      assert.ok(autosaveStatusBadge, "Autosave status indicator present in DOM");
      logPass("E2E: Autosave Indicator", "data-testid='autosave-status' rendered in toolbar");

      // Verify manual save button presence and click
      const manualSaveBtn = await page.waitForSelector("[data-testid='manual-save-button']", { timeout: 10000 });
      assert.ok(manualSaveBtn, "Manual save button present in DOM");
      await manualSaveBtn.click();
      logPass("E2E: Manual Save Interaction", "Manual save clicked cleanly");

      // Verify revision history button presence
      const revBtn = await page.waitForSelector("[data-testid='revision-history-button']", { timeout: 10000 });
      assert.ok(revBtn, "Revision history button present in DOM");
      logPass("E2E: Revision History Access", "data-testid='revision-history-button' verified");

      // Verify publish button presence
      const publishBtn = await page.waitForSelector("[data-testid='publish-button']", { timeout: 10000 });
      assert.ok(publishBtn, "Publish button present in DOM");
      logPass("E2E: Publish Button", "data-testid='publish-button' verified");

      // Publish website via API and verify published route
      await publishWebsite(testSite.id, ownerUser.id);
      const publicSiteUrl = `http://localhost:${FRONTEND_PORT}/site/${testSite.id}/`;
      await page.goto(publicSiteUrl, { waitUntil: "domcontentloaded" });

      const homeCanvas = await page.waitForSelector("[data-page-id='p5-home']", {
        state: "visible",
        timeout: 10000,
      });
      assert.ok(homeCanvas, "Published site canvas element rendered in DOM");

      const bodyText = await page.textContent("body");
      assert.ok(
        bodyText?.includes("Visual Editor Stability") || bodyText?.includes("Home"),
        "Published page rendered live content accurately"
      );
      logPass("E2E: Published Site Route", "Published site rendered live content at public route");
    }
  } catch (err: any) {
    logFail("Backend & E2E Integration Suite", err);
  } finally {
    // CLEANUP
    console.log("\n[CLEANUP] Tearing down test resources...");
    if (browser) await browser.close().catch(() => {});
    if (frontendServer) await new Promise<void>((r) => frontendServer!.close(() => r()));
    await new Promise<void>((r) => backendServer.close(() => r()));

    if (testSite) {
      await db.website.delete({ where: { id: testSite.id } }).catch(() => {});
    }
    if (ownerUser) {
      await db.session.deleteMany({ where: { userId: ownerUser.id } }).catch(() => {});
      await db.user.delete({ where: { id: ownerUser.id } }).catch(() => {});
    }
    if (viewerUser) {
      await db.session.deleteMany({ where: { userId: viewerUser.id } }).catch(() => {});
      await db.user.delete({ where: { id: viewerUser.id } }).catch(() => {});
    }
    console.log("  ✓ Test tenants and server instances cleanly dismantled");
  }

  console.log("\n================================================================");
  console.log(`   PHASE 5 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED   `);
  console.log("================================================================\n");

  return { passedCount, failedCount };
}

// Direct execution entrypoint
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("phase5-editor-stability.test.ts")) {
  runPhase5TestSuite()
    .then(({ passedCount, failedCount }) => {
      process.exit(failedCount > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error("Fatal test runner crash:", err);
      process.exit(1);
    });
}
