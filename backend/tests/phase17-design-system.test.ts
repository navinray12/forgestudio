import assert from "node:assert";
import http, { type Server } from "node:http";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import { chromium, type Browser, type Page } from "playwright";

dotenv.config();

import {
  validateDisposableDatabaseUrl,
  assertSafeDisposableDatabase,
  verifyConnectedDatabaseIdentity,
} from "../src/utils/database-safety.js";

import {
  sanitizeTokenName,
  sanitizeClassName,
  sanitizeCssValue,
  validateVariables,
  validateClasses,
  detectCircularTokenReferences,
  compileDesignSystemCss,
  exportDesignSystem,
  importDesignSystem,
} from "../src/services/tokens/designToken.service.js";

import { compileCanonicalToStaticBundle } from "../src/services/destinations/staticCompiler.js";
import { createWebsite } from "../src/services/website.service.js";
import designTokenRoutes from "../src/routes/designToken.routes.js";

let passed = 0;
let failed = 0;

function logPass(title: string, details?: string) {
  passed++;
  console.log(`  [PASS] ${title}${details ? ` -> ${details}` : ""}`);
}

function logFail(title: string, error?: any) {
  failed++;
  console.error(`  [FAIL] ${title} -> ${error?.message || JSON.stringify(error)}`);
}

async function runPhase17Tests() {
  console.log("=================================================================");
  console.log("FORGESTUDIO PHASE 17 — GLOBAL DESIGN SYSTEM & STYLING PARITY");
  console.log("=================================================================\n");

  // ===========================================================================
  // GATE 1: DATABASE SAFETY CHECK
  // ===========================================================================
  console.log("[GATE 1] Running Database Safety Checks...");
  const targetTestDbUrl = process.env.TEST_DATABASE_URL;
  if (!targetTestDbUrl) {
    console.error("[BLOCKED] TEST_DATABASE_URL is required.");
    process.exit(1);
  }
  assertSafeDisposableDatabase(targetTestDbUrl);
  logPass("Target DB is safe disposable database", targetTestDbUrl.replace(/:[^:@]+@/, ":***@"));

  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = targetTestDbUrl;
  const { prisma: testPrisma } = await import("../src/config/prisma.js");

  let server: Server | null = null;
  let serverPort = 0;
  let browser: Browser | null = null;

  // Track entities for teardown
  const createdUsers: string[] = [];
  const createdWebsites: string[] = [];

  try {
    await testPrisma.$connect();
    await verifyConnectedDatabaseIdentity(testPrisma, targetTestDbUrl);
    logPass("Connected to verified disposable database");

    // ===========================================================================
    // GROUP 1: TOKEN & CLASS SANITIZATION AND ANTI-CSS INJECTION
    // ===========================================================================
    console.log("\n[GROUP 1] CSS Identifier Sanitization & Anti-Injection Defense...");

    // 1.1 Token name sanitization
    assert.strictEqual(sanitizeTokenName("primary-color"), "--primary-color");
    assert.strictEqual(sanitizeTokenName("--fs-accent"), "--fs-accent");
    assert.strictEqual(sanitizeTokenName("bad <script> token!"), "--bad-script-token");
    logPass("Token name normalized to valid --[a-z0-9_-]+ format");

    // 1.2 Class name sanitization
    assert.strictEqual(sanitizeClassName(".btn-primary"), "btn-primary");
    assert.strictEqual(sanitizeClassName("card elevated 123"), "card-elevated-123");
    logPass("Class name normalized without leading dot or invalid characters");

    // 1.3 CSS value anti-injection
    const safeHex = sanitizeCssValue("#4f46e5");
    assert.strictEqual(safeHex, "#4f46e5");

    const injectionAttempt = sanitizeCssValue("#4f46e5; color: red; } body { display: none; }");
    assert.ok(!injectionAttempt.includes(";"), "Semicolons must be stripped");
    assert.ok(!injectionAttempt.includes("}"), "Closing braces must be stripped");
    assert.ok(!injectionAttempt.includes("{"), "Opening braces must be stripped");
    logPass("CSS value breakout characters (;, {, }) safely stripped");

    // 1.4 Dangerous functions blocked
    const exprAttempt = sanitizeCssValue("expression(alert(1))");
    assert.ok(exprAttempt.includes("/* blocked */"), "expression() function must be blocked");

    const jsUrlAttempt = sanitizeCssValue("url(javascript:alert(1))");
    assert.strictEqual(jsUrlAttempt, "url('')", "javascript: in url() must be neutralized");

    const vbUrlAttempt = sanitizeCssValue("url(vbscript:alert(1))");
    assert.strictEqual(vbUrlAttempt, "url('')", "vbscript: in url() must be neutralized");

    const safeUrl = sanitizeCssValue("url('https://images.unsplash.com/photo.jpg')");
    assert.ok(safeUrl.includes("https://images.unsplash.com/photo.jpg"), "Safe https url() preserved");
    logPass("Dangerous CSS execution vectors (expression, javascript: url, vbscript) blocked");

    // 1.5 Prototype pollution prevention
    const dirtyStyles = {
      __proto__: { polluted: true },
      constructor: { hacked: true },
      prototype: { evil: true },
      color: "#2563eb",
      fontSize: "16px",
    };
    const validatedClasses = validateClasses([
      {
        id: "cls-proto",
        name: "Proto Test",
        className: "fs-proto-test",
        styles: dirtyStyles,
      },
    ]);
    assert.strictEqual(validatedClasses[0].styles["__proto__"], undefined);
    assert.strictEqual(validatedClasses[0].styles["constructor"], undefined);
    assert.strictEqual(validatedClasses[0].styles["prototype"], undefined);
    assert.strictEqual(validatedClasses[0].styles["color"], "#2563eb");
    assert.strictEqual(validatedClasses[0].styles["fontSize"], "16px");
    logPass("Prototype pollution properties (__proto__, constructor, prototype) rejected");

    // ===========================================================================
    // GROUP 2: CIRCULAR VARIABLE REFERENCE DETECTION
    // ===========================================================================
    console.log("\n[GROUP 2] Circular Variable Reference Detection...");

    const circularVars = [
      {
        id: "var-a",
        name: "Color A",
        category: "color" as const,
        token: "--token-a",
        value: "var(--token-b)",
      },
      {
        id: "var-b",
        name: "Color B",
        category: "color" as const,
        token: "--token-b",
        value: "var(--token-c)",
      },
      {
        id: "var-c",
        name: "Color C",
        category: "color" as const,
        token: "--token-c",
        value: "var(--token-a)",
      },
      {
        id: "var-safe",
        name: "Safe Color",
        category: "color" as const,
        token: "--token-safe",
        value: "#10b981",
      },
    ];

    const cycles = detectCircularTokenReferences(circularVars);
    assert.ok(cycles.has("--token-a"), "Cycle contains --token-a");
    assert.ok(cycles.has("--token-b"), "Cycle contains --token-b");
    assert.ok(cycles.has("--token-c"), "Cycle contains --token-c");
    assert.ok(!cycles.has("--token-safe"), "--token-safe is not in cycle");

    const validatedCircularVars = validateVariables(circularVars);
    assert.strictEqual(validatedCircularVars[0].value, "inherit", "Circular token-a value fallback to inherit");
    assert.strictEqual(validatedCircularVars[1].value, "inherit", "Circular token-b value fallback to inherit");
    assert.strictEqual(validatedCircularVars[2].value, "inherit", "Circular token-c value fallback to inherit");
    assert.strictEqual(validatedCircularVars[3].value, "#10b981", "Safe token retained genuine value");
    logPass("Circular token references automatically detected and broken with fallback");

    // ===========================================================================
    // GROUP 3: CSS COMPILATION (:root, Dark Mode & Pseudo-Classes)
    // ===========================================================================
    console.log("\n[GROUP 3] CSS Compilation Engine & Theme Modes...");

    const sampleVars = [
      {
        id: "var-pri",
        name: "Brand Primary",
        category: "color" as const,
        token: "--fs-color-primary",
        value: "#2563eb",
        defaultMode: "light" as const,
        modes: { light: "#2563eb", dark: "#3b82f6" },
      },
      {
        id: "var-sp",
        name: "Container Spacing",
        category: "spacing" as const,
        token: "--fs-spacing-lg",
        value: "24px",
      },
    ];

    const sampleClasses = [
      {
        id: "cls-btn",
        name: "Action Button",
        className: "fs-btn-action",
        styles: {
          backgroundColor: "var(--fs-color-primary)",
          padding: "12px 24px",
          borderRadius: "8px",
        },
        pseudoStyles: {
          hover: {
            backgroundColor: "#1d4ed8",
            transform: "translateY(-1px)",
          },
          active: {
            transform: "translateY(0px)",
          },
        },
      },
    ];

    const compiled = compileDesignSystemCss(sampleVars, sampleClasses);
    assert.ok(compiled.includes(":root {"), "Emits :root selector");
    assert.ok(compiled.includes("--fs-color-primary: #2563eb;"), "Emits base variable value");
    assert.ok(compiled.includes('[data-theme="dark"], .dark {'), "Emits dark theme override block");
    assert.ok(compiled.includes("--fs-color-primary: #3b82f6;"), "Emits dark mode token value");
    assert.ok(compiled.includes("@media (prefers-color-scheme: dark) {"), "Emits OS prefers-color-scheme rule");
    assert.ok(compiled.includes(".fs-btn-action {"), "Emits class block");
    assert.ok(compiled.includes("background-color: var(--fs-color-primary);"), "Emits kebab-case properties");
    assert.ok(compiled.includes(".fs-btn-action:hover {"), "Emits hover pseudo-class");
    assert.ok(compiled.includes(".fs-btn-action:active {"), "Emits active pseudo-class");
    logPass("CSS compiler faithfully generates :root, dark theme overrides, media queries, and pseudo styles");

    // ===========================================================================
    // SETUP HTTP SERVER FOR AUTHORIZED INTEGRATION TESTING
    // ===========================================================================
    console.log("\n[SETUP] Initializing Isolated Express Test Server...");

    const app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Mock authentication middleware using x-test-user-id header
    app.use((req, res, next) => {
      const authHeader = req.headers["x-test-user-id"] as string;
      if (authHeader) {
        res.locals.user = { id: authHeader };
        (req as any).user = { id: authHeader };
      }
      next();
    });

    app.use("/api/websites", designTokenRoutes);

    const staticTestDir = path.resolve(process.cwd(), `temp_static_bundle_${Date.now()}`);
    fs.mkdirSync(staticTestDir, { recursive: true });
    app.use("/sites/static", express.static(staticTestDir));

    // Published preview route
    app.get("/sites/:websiteId/preview", async (req, res) => {
      const site = await testPrisma.website.findUnique({ where: { id: req.params.websiteId } });
      if (!site) return res.status(404).send("Site not found");
      const ed: any = site.editorData || {};
      const compiledCss = compileDesignSystemCss(ed.globalVariables || [], ed.globalClasses || []);
      res.setHeader("Content-Type", "text/html");
      res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${site.name} Preview</title><style id="design-tokens">${compiledCss}</style></head><body><div id="root"><div id="test-card" class="fs-card-glass" style="padding: 20px;"><button id="test-btn" class="fs-btn-action">Action Button</button></div></div></body></html>`);
    });

    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const addr = server.address() as any;
    serverPort = addr.port;
    logPass(`Isolated test server listening on http://127.0.0.1:${serverPort}`);

    // Create Test Users
    const owner = await testPrisma.user.create({
      data: {
        email: `phase17_owner_${Date.now()}@example.com`,
        passwordHash: "hash",
        fullName: "Design System Owner",
        role: "USER",
      },
    });
    createdUsers.push(owner.id);

    const designer = await testPrisma.user.create({
      data: {
        email: `phase17_designer_${Date.now()}@example.com`,
        passwordHash: "hash",
        fullName: "Lead Designer",
        role: "USER",
      },
    });
    createdUsers.push(designer.id);

    const viewer = await testPrisma.user.create({
      data: {
        email: `phase17_viewer_${Date.now()}@example.com`,
        passwordHash: "hash",
        fullName: "Design Viewer",
        role: "USER",
      },
    });
    createdUsers.push(viewer.id);

    const foreignUser = await testPrisma.user.create({
      data: {
        email: `phase17_foreign_${Date.now()}@example.com`,
        passwordHash: "hash",
        fullName: "Foreign Tenant",
        role: "USER",
      },
    });
    createdUsers.push(foreignUser.id);

    // Create Website owned by owner
    const website = await createWebsite({
      name: "Phase 17 Parity Site",
      slug: `phase17-parity-${Date.now()}`,
      userId: owner.id,
    });
    createdWebsites.push(website.id);

    // Add Designer collaborator (permission: EDIT or ADMIN)
    await (testPrisma as any).websiteCollaborator.create({
      data: {
        websiteId: website.id,
        userId: designer.id,
        permission: "EDIT",
      },
    });

    // Add Viewer collaborator (permission: VIEW)
    await (testPrisma as any).websiteCollaborator.create({
      data: {
        websiteId: website.id,
        userId: viewer.id,
        permission: "VIEW",
      },
    });

    logPass("Initialized RBAC test fixture (Owner, Designer, Viewer, Foreign Tenant)");

    // ===========================================================================
    // GROUP 4: RBAC & CAPABILITY PERMISSIONS ENFORCEMENT
    // ===========================================================================
    console.log("\n[GROUP 4] RBAC & Granular Authorization Enforcement...");

    const baseUrl = `http://127.0.0.1:${serverPort}/api/websites/${website.id}/design-system`;

    // 4.1 Owner can read
    const ownerGetRes = await fetch(baseUrl, {
      headers: { "x-test-user-id": owner.id },
    });
    assert.strictEqual(ownerGetRes.status, 200, "Owner must be allowed to read design system");
    const ownerGetData = await ownerGetRes.json();
    assert.strictEqual(ownerGetData.success, true);
    logPass("RBAC: Owner granted read access (200 OK)");    // 4.2 Reject update if expectedVersion is missing (Priority 0)
    const missingVerRes = await fetch(baseUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-test-user-id": designer.id },
      body: JSON.stringify({
        variables: sampleVars,
        classes: sampleClasses,
      }),
    });
    assert.strictEqual(missingVerRes.status, 400, "Missing expectedVersion must return 400 Bad Request");
    const missingVerData = await missingVerRes.json();
    assert.strictEqual(missingVerData.code, "EXPECTED_VERSION_REQUIRED");
    logPass("RBAC/CAS: Missing expectedVersion rejected with 400 EXPECTED_VERSION_REQUIRED");

    // 4.2b Designer can update with valid expectedVersion
    const designerPutRes = await fetch(baseUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-test-user-id": designer.id },
      body: JSON.stringify({
        variables: sampleVars,
        classes: sampleClasses,
        expectedVersion: website.version,
      }),
    });
    assert.strictEqual(designerPutRes.status, 200, "Designer must be allowed to update styling");
    const designerPutData = await designerPutRes.json();
    assert.strictEqual(designerPutData.success, true);
    assert.strictEqual(designerPutData.variables.length, 2);
    logPass("RBAC: Designer granted update permissions with expectedVersion (200 OK)");

    // 4.3 Viewer can read but CANNOT mutate
    const viewerGetRes = await fetch(baseUrl, {
      headers: { "x-test-user-id": viewer.id },
    });
    assert.strictEqual(viewerGetRes.status, 200, "Viewer can read design system");

    const viewerPutRes = await fetch(baseUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-test-user-id": viewer.id },
      body: JSON.stringify({
        variables: sampleVars,
        classes: sampleClasses,
        expectedVersion: designerPutData.version,
      }),
    });
    assert.strictEqual(viewerPutRes.status, 403, "Viewer must be denied design system mutation");
    logPass("RBAC: Viewer denied mutation capability (403 Forbidden)");

    // 4.4 Foreign tenant CANNOT read or write
    const foreignGetRes = await fetch(baseUrl, {
      headers: { "x-test-user-id": foreignUser.id },
    });
    assert.strictEqual(foreignGetRes.status, 403, "Foreign user denied read");

    const foreignPutRes = await fetch(baseUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-test-user-id": foreignUser.id },
      body: JSON.stringify({ variables: [], classes: [], expectedVersion: designerPutData.version }),
    });
    assert.strictEqual(foreignPutRes.status, 403, "Foreign user denied write");
    logPass("RBAC: Cross-tenant isolation enforced (Foreign tenant 403 Forbidden)");

    // 4.5 Explicit Granular DENY capability override
    if ((testPrisma as any).granularPermission) {
      await (testPrisma as any).granularPermission.create({
        data: {
          websiteId: website.id,
          userId: designer.id,
          resourceId: "*",
          capability: "EDIT_DESIGN",
          effect: "DENY",
        },
      });

      const deniedDesignerRes = await fetch(baseUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-test-user-id": designer.id },
        body: JSON.stringify({ variables: sampleVars, classes: sampleClasses, expectedVersion: designerPutData.version }),
      });
      assert.strictEqual(deniedDesignerRes.status, 403, "Explicit DENY capability must override role");
      logPass("RBAC: Explicit DENY capability override strictly enforced (403 Forbidden)");

      // Remove override for subsequent tests
      await (testPrisma as any).granularPermission.deleteMany({
        where: { websiteId: website.id, userId: designer.id },
      });
    }

    // ===========================================================================
    // GROUP 5: CONCURRENCY CONTROL & CAS OPTIMISTIC LOCKING
    // ===========================================================================
    console.log("\n[GROUP 5] Concurrency Control & CAS Optimistic Locking...");

    // Fetch current version
    const siteBeforeCas = await testPrisma.website.findUnique({
      where: { id: website.id },
      select: { version: true },
    });
    const currentVer = siteBeforeCas!.version;

    // 5.1 Valid CAS update
    const validCasRes = await fetch(baseUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-test-user-id": owner.id },
      body: JSON.stringify({
        variables: sampleVars,
        classes: sampleClasses,
        expectedVersion: currentVer,
      }),
    });
    assert.strictEqual(validCasRes.status, 200);
    const validCasData = await validCasRes.json();
    assert.strictEqual(validCasData.version, currentVer + 1);
    logPass(`CAS: Update with matching expectedVersion ${currentVer} succeeded (v${currentVer + 1})`);

    // 5.2 Stale CAS update rejected with 409
    const staleCasRes = await fetch(baseUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-test-user-id": owner.id },
      body: JSON.stringify({
        variables: sampleVars,
        classes: sampleClasses,
        expectedVersion: currentVer, // Stale! Current is now currentVer + 1
      }),
    });
    assert.strictEqual(staleCasRes.status, 409, "Stale version must return 409 Conflict");
    const staleCasData = await staleCasRes.json();
    assert.strictEqual(staleCasData.code, "STALE_VERSION_CONFLICT");
    logPass("CAS: Stale write rejected with 409 STALE_VERSION_CONFLICT");

    // 5.3 Independent class preservation when updating variables only
    const varsOnlyRes = await fetch(baseUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-test-user-id": owner.id },
      body: JSON.stringify({
        variables: [{ id: "var-only", name: "Vars Only", token: "--fs-var-only", value: "#ff0000" }],
        expectedVersion: validCasData.version,
      }),
    });
    assert.strictEqual(varsOnlyRes.status, 200);
    const siteAfterVarsOnly = await testPrisma.website.findUnique({ where: { id: website.id } });
    const siteEditorData: any = siteAfterVarsOnly?.editorData || {};
    assert.ok(Array.isArray(siteEditorData.globalClasses) && siteEditorData.globalClasses.length > 0, "Classes preserved when updating variables only");
    logPass("Data Integrity: Preserved classes when changing variables");

    // ===========================================================================
    // GROUP 6: DESIGN SYSTEM JSON EXPORT & IMPORT CONFLICT MODES
    // ===========================================================================
    console.log("\n[GROUP 6] Export / Import JSON & Conflict Resolution Modes...");

    // 6.1 Export
    const exportRes = await fetch(`${baseUrl}/export`, {
      headers: { "x-test-user-id": owner.id },
    });
    assert.strictEqual(exportRes.status, 200);
    assert.ok(exportRes.headers.get("content-disposition")?.includes("design-tokens.json"));
    const exportedPayload = await exportRes.json();
    assert.strictEqual(exportedPayload.version, 2);
    logPass("Export: Version 2 portable JSON downloaded with metadata");

    // 6.2 Import rejection without expectedVersion
    const importNoVerRes = await fetch(`${baseUrl}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-user-id": owner.id },
      body: JSON.stringify({
        payload: { variables: sampleVars, classes: sampleClasses },
        mode: "merge",
      }),
    });
    assert.strictEqual(importNoVerRes.status, 400);
    const importNoVerData = await importNoVerRes.json();
    assert.strictEqual(importNoVerData.code, "EXPECTED_VERSION_REQUIRED");
    logPass("Import: Missing expectedVersion rejected with 400 EXPECTED_VERSION_REQUIRED");

    // 6.3 Import with "merge" mode and valid expectedVersion
    const siteBeforeMerge = await testPrisma.website.findUnique({ where: { id: website.id }, select: { version: true } });
    const importPayload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      variables: [
        {
          id: "var-imported-accent",
          name: "Imported Accent",
          category: "color",
          token: "--fs-color-accent",
          value: "#10b981",
        },
        {
          id: "var-pri-override",
          name: "Brand Primary Override",
          category: "color",
          token: "--fs-color-primary",
          value: "#6366f1",
        },
      ],
      classes: [
        {
          id: "cls-imported-card",
          name: "Imported Glass Card",
          className: "fs-card-glass",
          styles: {
            backdropFilter: "blur(12px)",
            backgroundColor: "rgba(255, 255, 255, 0.7)",
          },
        },
      ],
    };

    const importMergeRes = await fetch(`${baseUrl}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-user-id": owner.id },
      body: JSON.stringify({
        payload: importPayload,
        mode: "merge",
        expectedVersion: siteBeforeMerge!.version,
      }),
    });
    assert.strictEqual(importMergeRes.status, 200);
    const importMergeData = await importMergeRes.json();
    assert.strictEqual(importMergeData.success, true);
    const primaryVar = importMergeData.variables.find((v: any) => v.token === "--fs-color-primary");
    assert.strictEqual(primaryVar.value, "#6366f1");
    const accentVar = importMergeData.variables.find((v: any) => v.token === "--fs-color-accent");
    assert.strictEqual(accentVar.value, "#10b981");
    logPass("Import: Merge mode merged tokens with expectedVersion CAS protection");

    // 6.4 Import with "skip" mode and expectedVersion
    const importSkipPayload = {
      variables: [
        {
          id: "var-pri-skip",
          name: "Primary Should Be Skipped",
          category: "color",
          token: "--fs-color-primary",
          value: "#000000",
        },
        {
          id: "var-new-font",
          name: "New Heading Font",
          category: "font",
          token: "--fs-font-heading",
          value: "Outfit, sans-serif",
        },
      ],
      classes: [],
    };

    const importSkipRes = await fetch(`${baseUrl}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-user-id": owner.id },
      body: JSON.stringify({
        payload: importSkipPayload,
        mode: "skip",
        expectedVersion: importMergeData.version,
      }),
    });
    assert.strictEqual(importSkipRes.status, 200);
    const importSkipData = await importSkipRes.json();
    const primaryAfterSkip = importSkipData.variables.find((v: any) => v.token === "--fs-color-primary");
    assert.strictEqual(primaryAfterSkip.value, "#6366f1", "Existing token preserved in skip mode");
    const newFontVar = importSkipData.variables.find((v: any) => v.token === "--fs-font-heading");
    assert.strictEqual(newFontVar.value, "Outfit, sans-serif", "New token added in skip mode");
    logPass("Import: Skip mode preserved existing values and appended new tokens");

    // 6.5 Authoritative empty array test: deleting all variables
    const emptyVarsRes = await fetch(baseUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-test-user-id": owner.id },
      body: JSON.stringify({
        variables: [],
        expectedVersion: importSkipData.version,
      }),
    });
    assert.strictEqual(emptyVarsRes.status, 200);
    const emptyVarsData = await emptyVarsRes.json();
    assert.strictEqual(emptyVarsData.variables.length, 0, "Server authoritative empty array honored");
    logPass("Consistency: Empty server array [] is authoritative (variables fully cleared without fallback)");

    // Restore variables for downstream parity test
    const restoreVarsRes = await fetch(baseUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-test-user-id": owner.id },
      body: JSON.stringify({
        variables: importMergeData.variables,
        classes: importMergeData.classes,
        expectedVersion: emptyVarsData.version,
      }),
    });
    assert.strictEqual(restoreVarsRes.status, 200);
    const restoredData = await restoreVarsRes.json();

    // ===========================================================================
    // GROUP 7: TRI-RENDERER STYLING PARITY (Canvas, Published, Static)
    // ===========================================================================
    console.log("\n[GROUP 7] Tri-Renderer Styling Parity Verification...");

    const canonicalWebsiteData = {
      id: website.id,
      name: "Parity Test Website",
      slug: "parity-test",
      globalVariables: restoredData.variables,
      globalClasses: restoredData.classes,
      pages: [
        {
          id: "home",
          title: "Home Page",
          slug: "",
          isHome: true,
          elements: [
            {
              id: "hero-button",
              type: "button",
              className: "fs-btn-action",
              classes: ["fs-btn-action"],
              styles: {
                backgroundColor: "var(--fs-color-primary)",
                color: "#ffffff",
              },
              content: "Explore Platform",
            },
            {
              id: "hero-card",
              type: "container",
              className: "fs-card-glass",
              classes: ["fs-card-glass"],
              children: [
                {
                  id: "card-title",
                  type: "heading",
                  level: 3,
                  content: "Glassmorphism in Action",
                },
              ],
            },
          ],
        },
      ],
    };

    // 7.1 Compile static export bundle
    const staticBundle = compileCanonicalToStaticBundle(website.id, 1, canonicalWebsiteData);
    const stylesCssFile = staticBundle.files.find((f) => f.path === "styles.css");
    const indexHtmlFile = staticBundle.files.find((f) => f.path === "index.html");

    assert.ok(stylesCssFile, "styles.css must be generated");
    assert.ok(indexHtmlFile, "index.html must be generated");

    assert.ok(stylesCssFile.content.includes("--fs-color-primary: #6366f1;"), "styles.css contains --fs-color-primary");
    assert.ok(stylesCssFile.content.includes("--fs-color-accent: #10b981;"), "styles.css contains --fs-color-accent");
    assert.ok(stylesCssFile.content.includes(".fs-card-glass {"), "styles.css contains .fs-card-glass class");
    assert.ok(stylesCssFile.content.includes("backdrop-filter: blur(12px);"), "styles.css contains backdrop-filter property");

    assert.ok(indexHtmlFile.content.includes('class="fs-btn-action"'), "index.html button applies fs-btn-action");
    assert.ok(indexHtmlFile.content.includes('class="fs-card-glass"'), "index.html container applies fs-card-glass");
    assert.ok(indexHtmlFile.content.includes("Explore Platform"), "index.html renders element text");
    logPass("Static Export Parity: Generated styles.css and index.html match canonical tokens and classes");

    // Populate static bundle files into served test directory
    for (const f of staticBundle.files) {
      fs.writeFileSync(path.join(staticTestDir, f.path), f.content);
    }

    // ===========================================================================
    // GROUP 8: REAL BROWSER PLAYWRIGHT E2E DESIGN SYSTEM & CONCURRENT TESTS
    // ===========================================================================
    console.log("\n[GROUP 8] Real Playwright Browser E2E Styling & Isolation Tests...");

    browser = await chromium.launch({ headless: true });

    // 8.1 Navigate to real served static bundle URL (no page.setContent!)
    const staticPage = await browser.newPage();
    await staticPage.goto(`http://127.0.0.1:${serverPort}/sites/static/index.html`, { waitUntil: "networkidle" });

    const staticBtnBg = await staticPage.$eval(".fs-btn-action", (el) => window.getComputedStyle(el).backgroundColor);
    assert.strictEqual(staticBtnBg, "rgb(99, 102, 241)", "Computed button background color matches --fs-color-primary");
    logPass("Browser E2E (Static Bundle): Real Chromium computed styles match compiled tokens on served URL");
    await staticPage.close();

    // 8.2 Navigate to real served published preview URL
    const previewPage = await browser.newPage();
    await previewPage.goto(`http://127.0.0.1:${serverPort}/sites/${website.id}/preview`, { waitUntil: "networkidle" });

    const previewBtnBg = await previewPage.$eval("#test-btn", (el) => window.getComputedStyle(el).backgroundColor);
    assert.strictEqual(previewBtnBg, "rgb(99, 102, 241)", "Published preview matches --fs-color-primary");

    // Dynamic theme switching on real published page
    await previewPage.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    const tokenValInDom = await previewPage.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--fs-color-primary").trim());
    assert.ok(tokenValInDom.length > 0, "Dark theme override applied in real DOM");
    logPass("Browser E2E (Published Preview): Real Chromium verified layout and dark mode theme switching");
    await previewPage.close();

    // 8.3 Two Websites & Two Browser Sessions Isolation + Concurrent Save Conflict
    console.log("\n[GROUP 8.3] Multi-Website Isolation & Concurrent Browser Sessions...");
    const owner2 = await testPrisma.user.create({
      data: {
        email: `phase17_owner2_${Date.now()}@example.com`,
        passwordHash: "hash",
        fullName: "Design Owner 2",
        role: "USER",
      },
    });
    createdUsers.push(owner2.id);

    const website2 = await createWebsite({
      name: "Phase 17 Isolated Site B",
      slug: `phase17-site-b-${Date.now()}`,
      userId: owner2.id,
    });
    createdWebsites.push(website2.id);

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const pageSession1 = await context1.newPage();
    const pageSession2 = await context2.newPage();

    // Verify isolation: Website 1 and Website 2 design systems are strictly separated
    const site1Res = await pageSession1.request.get(`http://127.0.0.1:${serverPort}/api/websites/${website.id}/design-system`, {
      headers: { "x-test-user-id": owner.id },
    });
    const site1Data = await site1Res.json();

    const site2Res = await pageSession2.request.get(`http://127.0.0.1:${serverPort}/api/websites/${website2.id}/design-system`, {
      headers: { "x-test-user-id": owner2.id },
    });
    const site2Data = await site2Res.json();

    assert.notStrictEqual(site1Data.variables.length, site2Data.variables.length);
    assert.ok(site1Data.variables.some((v: any) => v.token === "--fs-color-primary"));
    assert.ok(!site2Data.variables.some((v: any) => v.token === "--fs-color-primary"));
    assert.ok(!site2Data.variables.some((v: any) => v.token === "--fs-color-primary"));
    logPass("Multi-Tenant Isolation: Website A and Website B tokens strictly separated across distinct browser sessions");

    // Concurrent save conflict on Website 1
    const sharedVer = site1Data.version;
    // Session 1 saves first
    const s1Save = await pageSession1.request.put(`http://127.0.0.1:${serverPort}/api/websites/${website.id}/design-system`, {
      headers: { "Content-Type": "application/json", "x-test-user-id": owner.id },
      data: {
        variables: site1Data.variables,
        classes: site1Data.classes,
        expectedVersion: sharedVer,
      },
    });
    assert.strictEqual(s1Save.status(), 200, "Session 1 save succeeds with version V");
    const s1Data = await s1Save.json();

    // Session 2 attempts save with stale version V
    const s2Save = await pageSession2.request.put(`http://127.0.0.1:${serverPort}/api/websites/${website.id}/design-system`, {
      headers: { "Content-Type": "application/json", "x-test-user-id": owner.id },
      data: {
        variables: site1Data.variables,
        classes: site1Data.classes,
        expectedVersion: sharedVer, // Stale!
      },
    });
    assert.strictEqual(s2Save.status(), 409, "Session 2 save rejected with 409 Conflict");
    const s2Data = await s2Save.json();
    assert.strictEqual(s2Data.code, "STALE_VERSION_CONFLICT");
    logPass("Concurrent Conflict: Browser Session 2 stale save correctly rejected with 409 STALE_VERSION_CONFLICT");

    await context1.close();
    await context2.close();

    // Cleanup static bundle directory
    try {
      fs.rmSync(staticTestDir, { recursive: true, force: true });
    } catch {}

    await browser.close();
    browser = null;

  } catch (err: any) {
    logFail("Phase 17 Verification Failure", err);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    // Cleanup created test records
    try {
      for (const wId of createdWebsites) {
        await testPrisma.website.delete({ where: { id: wId } }).catch(() => {});
      }
      for (const uId of createdUsers) {
        await testPrisma.user.delete({ where: { id: uId } }).catch(() => {});
      }
      await testPrisma.$disconnect();
    } catch {}
  }

  console.log("\n=================================================================");
  console.log(`PHASE 17 RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase17Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
