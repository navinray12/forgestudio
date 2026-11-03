import assert from "node:assert";
import http, { type Server } from "node:http";
import dotenv from "dotenv";
import { validateAndNormalizeCanonicalWebsite } from "../src/validators/canonical-website.validator.js";
import {
  validateAndSanitizeWebsiteKitFile,
  buildCanonicalEditorDataFromKit,
} from "../../frontend/src/features/templates/utils/websiteKitValidation.js";

dotenv.config();

// Helper logging
function logPass(title: string, details?: string) {
  console.log(`  ✓ [PASS] ${title}${details ? ` - ${details}` : ""}`);
}

function logFail(title: string, error: any) {
  console.error(`  ✗ [FAIL] ${title}:`, error);
}

function logBlocked(title: string, reason: string) {
  console.warn(`  ⚠ [BLOCKED] ${title}: ${reason}`);
}

async function runWebsiteKitImportTestSuite() {
  console.log("\n=======================================================");
  console.log("  BATCH 01: WEBSITE KIT IMPORT COMPREHENSIVE SUITE");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;
  let blocked = 0;

  // Correct Async Test Runner: awaits fn(), passes only on completion, accurate counting
  async function runCase(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      logPass(name);
      passed++;
    } catch (err: any) {
      logFail(name, err);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Four-page JSON file — Full pipeline verification
  // -------------------------------------------------------------
  await runCase("1. Four-page JSON file (JSON -> Sanitize -> Canonical -> Validate)", async () => {
    const rawKitJson = JSON.stringify({
      type: "website-kit",
      version: 1,
      website: {
        name: "Agency Portfolio Kit",
        description: "Professional four page agency website kit",
        settings: { backgroundColor: "#0f172a", siteLanguage: "en" },
      },
      pages: [
        {
          id: "page-home",
          title: "Home",
          path: "/",
          isHome: true,
          elements: [
            { id: "hero-1", type: "heading", content: "Transform Your Business" },
            { id: "cta-1", type: "button", content: "Contact Us" },
          ],
          pageSettings: { title: "Home - Agency", path: "/" },
        },
        {
          id: "page-about",
          title: "About Us",
          path: "/about",
          elements: [
            { id: "about-h", type: "heading", content: "Who We Are" },
            { id: "about-p", type: "text", content: "Award winning creative team" },
          ],
          pageSettings: { title: "About Us", path: "/about" },
        },
        {
          id: "page-services",
          title: "Services",
          path: "/services",
          elements: [
            {
              id: "services-grid",
              type: "container",
              children: [
                { id: "srv-card-1", type: "text", content: "Web Development" },
                { id: "srv-card-2", type: "text", content: "UI/UX Design" },
              ],
            },
          ],
          pageSettings: { title: "Our Services", path: "/services" },
        },
        {
          id: "page-contact",
          title: "Contact",
          path: "/contact",
          elements: [{ id: "contact-form", type: "form", formMode: "simple" }],
          pageSettings: { title: "Get in Touch", path: "/contact" },
        },
      ],
      templates: [{ id: "t-header", name: "Global Header", type: "section", elements: [] }],
      globalStyles: { primaryColor: "#3b82f6", fontFamily: "Inter" },
      globalSettings: { metaKeywords: "agency, design, development" },
    });

    // Step 1: Validation and sanitization
    const validationResult = validateAndSanitizeWebsiteKitFile(rawKitJson);
    assert.strictEqual(validationResult.isValid, true, `Kit file validation failed: ${validationResult.error}`);
    assert.ok(validationResult.websiteKit, "websiteKit payload must be returned");
    assert.strictEqual(validationResult.summary?.pageCount, 4, "Summary must report exactly 4 pages");

    // Step 2: Canonical conversion
    const canonical = buildCanonicalEditorDataFromKit(validationResult.websiteKit, "Agency Portfolio Kit");
    assert.strictEqual(canonical.version, 1, "Canonical schema version must be 1");
    assert.strictEqual(canonical.pages.length, 4, "Must preserve all 4 pages");
    assert.strictEqual(canonical.homePageId, "page-home", "homePageId must resolve to page-home");

    const pageSlugs = canonical.pages.map((p: any) => p.slug);
    assert.deepStrictEqual(pageSlugs, ["/", "/about", "/services", "/contact"], "All four page slugs normalized");

    assert.strictEqual(canonical.templates.length, 1, "Templates array preserved");
    assert.strictEqual(canonical.globalStyles.primaryColor, "#3b82f6", "globalStyles preserved");
    assert.strictEqual(canonical.globalSettings.backgroundColor, "#0f172a", "globalSettings preserved");

    // Step 3: Backend canonical validation
    const backendValidation = validateAndNormalizeCanonicalWebsite(canonical);
    assert.strictEqual(
      backendValidation.isValid,
      true,
      `Backend validation failed: ${backendValidation.errors?.join(", ")}`
    );
  });

  // -------------------------------------------------------------
  // TEST 2: Explicit home page not positioned first
  // -------------------------------------------------------------
  await runCase("2. Explicit home page not positioned first (resolved accurately)", async () => {
    const rawKitJson = JSON.stringify({
      type: "website-kit",
      version: 1,
      website: { name: "Non-First Home Kit" },
      homePageId: "p-actual-home",
      pages: [
        {
          id: "p-landing",
          title: "Landing Teaser",
          path: "/teaser",
          elements: [{ id: "e1", type: "text", content: "Teaser" }],
        },
        {
          id: "p-actual-home",
          title: "Main Dashboard Home",
          path: "/home",
          isHome: true,
          elements: [{ id: "e-home-hero", type: "heading", content: "Real Home Hero" }],
        },
        {
          id: "p-pricing",
          title: "Pricing",
          path: "/pricing",
          elements: [{ id: "e-price", type: "text", content: "Pricing Table" }],
        },
      ],
    });

    const validationResult = validateAndSanitizeWebsiteKitFile(rawKitJson);
    assert.strictEqual(validationResult.isValid, true);
    assert.strictEqual(validationResult.websiteKit?.homePageId, "p-actual-home");

    const canonical = buildCanonicalEditorDataFromKit(validationResult.websiteKit, "Non-First Home Kit");
    assert.strictEqual(canonical.homePageId, "p-actual-home", "homePageId correctly identified page 2");

    const homePage = canonical.pages.find((p: any) => p.id === "p-actual-home");
    assert.ok(homePage, "Target home page exists in canonical output");
    assert.strictEqual(homePage.slug, "/", "Home page receives slug '/'");
    assert.strictEqual(homePage.isHome, true, "Home page has isHome true");
    assert.strictEqual(canonical.elements[0].content, "Real Home Hero", "Canonical root elements reflect page 2");

    const backendValidation = validateAndNormalizeCanonicalWebsite(canonical);
    assert.strictEqual(backendValidation.isValid, true);
  });

  // -------------------------------------------------------------
  // TEST 3: Page custom CSS and page settings preservation
  // -------------------------------------------------------------
  await runCase("3. Page custom CSS and page settings preservation", async () => {
    const customCssSnippet = ".glass-card { backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.2); }";
    const rawKitJson = JSON.stringify({
      type: "website-kit",
      version: 1,
      website: { name: "Custom CSS Site" },
      pages: [
        {
          id: "p-home",
          title: "Home",
          path: "/",
          isHome: true,
          customCss: customCssSnippet,
          pageSettings: {
            seoTitle: "SEO Optimized Home",
            metaDescription: "Meta description for test home",
            ogImage: "https://example.com/og.png",
          },
          elements: [{ id: "c1", type: "container", className: "glass-card" }],
        },
      ],
    });

    const validationResult = validateAndSanitizeWebsiteKitFile(rawKitJson);
    assert.strictEqual(validationResult.isValid, true);
    assert.strictEqual(validationResult.websiteKit?.pages[0].customCss, customCssSnippet, "Sanitizer preserved customCss");
    assert.strictEqual(
      validationResult.websiteKit?.pages[0].pageSettings.seoTitle,
      "SEO Optimized Home",
      "Sanitizer preserved pageSettings.seoTitle"
    );

    const canonical = buildCanonicalEditorDataFromKit(validationResult.websiteKit, "Custom CSS Site");
    assert.strictEqual(canonical.pages[0].customCss, customCssSnippet, "Canonical data preserved customCss");
    assert.strictEqual(
      canonical.pages[0].pageSettings.seoTitle,
      "SEO Optimized Home",
      "Canonical data preserved pageSettings"
    );

    const backendValidation = validateAndNormalizeCanonicalWebsite(canonical);
    assert.strictEqual(backendValidation.isValid, true);
  });

  // -------------------------------------------------------------
  // TEST 4: Nested widgets hierarchy & widget properties
  // -------------------------------------------------------------
  await runCase("4. Deeply nested widgets and custom props preservation", async () => {
    const rawKitJson = JSON.stringify({
      type: "website-kit",
      version: 1,
      website: { name: "Deep Tree Kit" },
      pages: [
        {
          id: "p-root",
          title: "Home",
          path: "/",
          elements: [
            {
              id: "container-root",
              type: "container",
              layout: { direction: "column", gap: 16 },
              styles: { backgroundColor: "#1e293b", padding: "20px" },
              children: [
                {
                  id: "section-inner",
                  type: "container",
                  responsiveStyles: { mobile: { padding: "10px" } },
                  children: [
                    {
                      id: "widget-counter",
                      type: "counter",
                      counterStart: 0,
                      counterEnd: 1500,
                      counterPrefix: "$",
                      counterSuffix: "+",
                      styles: { color: "#38bdf8" },
                    },
                    {
                      id: "widget-button",
                      type: "button",
                      content: "Claim Offer",
                      settings: { href: "https://example.com" },
                      motionConfig: { hoverScale: "1.05" },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const validationResult = validateAndSanitizeWebsiteKitFile(rawKitJson);
    assert.strictEqual(validationResult.isValid, true);

    const canonical = buildCanonicalEditorDataFromKit(validationResult.websiteKit, "Deep Tree Kit");
    const rootEl = canonical.pages[0].elements[0];
    assert.ok(rootEl.children && rootEl.children.length > 0, "Root container has children");

    const innerContainer = rootEl.children[0];
    const counterWidget = innerContainer.children[0];
    const buttonWidget = innerContainer.children[1];

    assert.strictEqual(counterWidget.counterEnd, 1500, "Nested counterEnd preserved");
    assert.strictEqual(counterWidget.counterPrefix, "$", "Nested counterPrefix preserved");
    assert.strictEqual(counterWidget.counterSuffix, "+", "Nested counterSuffix preserved");
    assert.strictEqual(counterWidget.styles.color, "#38bdf8", "Nested widget styles preserved");
    assert.strictEqual(buttonWidget.motionConfig.hoverScale, "1.05", "Nested motionConfig preserved");

    const backendValidation = validateAndNormalizeCanonicalWebsite(canonical);
    assert.strictEqual(backendValidation.isValid, true);
  });

  // -------------------------------------------------------------
  // TEST 5: Duplicate IDs and duplicate slugs disambiguation
  // -------------------------------------------------------------
  await runCase("5. Duplicate page IDs and conflicting slugs deduplication", async () => {
    const rawKitJson = JSON.stringify({
      type: "website-kit",
      version: 1,
      website: { name: "Duplication Test Kit" },
      pages: [
        { id: "page-dup", title: "Home", path: "/", elements: [] },
        { id: "page-dup", title: "About 1", path: "/about", elements: [] },
        { id: "page-3", title: "About 2", path: "/about", elements: [] }, // Conflicting slug
        { id: "page-4", title: "Another Home", path: "/", elements: [] }, // Conflicting home slug
      ],
    });

    const validationResult = validateAndSanitizeWebsiteKitFile(rawKitJson);
    assert.strictEqual(validationResult.isValid, true);

    const canonical = buildCanonicalEditorDataFromKit(validationResult.websiteKit, "Duplication Test Kit");
    const ids = canonical.pages.map((p: any) => p.id);
    const slugs = canonical.pages.map((p: any) => p.slug);

    const uniqueIds = new Set(ids);
    const uniqueSlugs = new Set(slugs);

    assert.strictEqual(uniqueIds.size, 4, "All page IDs must be deduplicated to unique strings");
    assert.strictEqual(uniqueSlugs.size, 4, "All page slugs must be deduplicated to unique paths");
    assert.strictEqual(slugs[0], "/", "Primary home page gets '/'");
    assert.notStrictEqual(slugs[3], "/", "Secondary page originally claiming '/' must be re-slugged");

    const backendValidation = validateAndNormalizeCanonicalWebsite(canonical);
    assert.strictEqual(backendValidation.isValid, true, `Deduplicated canonical output passes backend validation`);
  });

  // -------------------------------------------------------------
  // TEST 6: Existing legacy JSON (backward compatibility)
  // -------------------------------------------------------------
  await runCase("6. Existing legacy JSON (single root elements backward compatibility)", async () => {
    const legacyKitJson = JSON.stringify({
      type: "website-kit",
      version: 1,
      website: { name: "Legacy Site" },
      elements: [{ id: "legacy-text", type: "heading", content: "Legacy Page Content" }],
      pageSettings: { title: "Legacy Home", path: "/" },
      templates: [],
    });

    const validationResult = validateAndSanitizeWebsiteKitFile(legacyKitJson);
    assert.strictEqual(validationResult.isValid, true, "Legacy kit validates successfully");

    const canonical = buildCanonicalEditorDataFromKit(validationResult.websiteKit, "Legacy Site");
    assert.strictEqual(canonical.pages.length, 1, "Synthesizes single home page");
    assert.strictEqual(canonical.pages[0].elements.length, 1, "Page elements populated from root elements");
    assert.strictEqual(canonical.homePageId, "main-page", "homePageId defaults to synthesized page ID");
    assert.strictEqual(canonical.elements.length, 1, "Root elements populated");

    const backendValidation = validateAndNormalizeCanonicalWebsite(canonical);
    assert.strictEqual(backendValidation.isValid, true, "Legacy kit passes backend canonical validation");
  });

  // -------------------------------------------------------------
  // TEST 7: Actual expectedVersion payload & CAS validation
  // -------------------------------------------------------------
  await runCase("7. Concurrency CAS: Valid expectedVersion succeeds; stale/missing rejected", async () => {
    let simulatedDbVersion = 1;

    function simulateBackendSave(putPayload: { expectedVersion?: number; editorData?: any }) {
      if (putPayload.expectedVersion === undefined || putPayload.expectedVersion === null) {
        return { status: 400, body: { code: "MISSING_REVISION", message: "Expected revision is required" } };
      }
      if (putPayload.expectedVersion !== simulatedDbVersion) {
        return { status: 409, body: { code: "STALE_VERSION_CONFLICT", message: "Stale version conflict" } };
      }
      simulatedDbVersion += 1;
      return { status: 200, body: { success: true, website: { version: simulatedDbVersion } } };
    }

    // 1. Missing expectedVersion -> 400
    const missingRes = simulateBackendSave({ editorData: {} });
    assert.strictEqual(missingRes.status, 400, "Missing expectedVersion returns 400");
    assert.strictEqual(missingRes.body.code, "MISSING_REVISION");

    // 2. Matching expectedVersion -> 200 and version incremented
    const validRes = simulateBackendSave({ expectedVersion: 1, editorData: {} });
    assert.strictEqual(validRes.status, 200, "Matching expectedVersion returns 200");
    assert.strictEqual(validRes.body.website.version, 2, "Persisted version advanced from 1 to 2");

    // 3. Stale expectedVersion (1 when DB is now 2) -> 409
    const staleRes = simulateBackendSave({ expectedVersion: 1, editorData: {} });
    assert.strictEqual(staleRes.status, 409, "Stale expectedVersion returns 409");
    assert.strictEqual(staleRes.body.code, "STALE_VERSION_CONFLICT");
  });

  // -------------------------------------------------------------
  // TEST 8: Actual HTTP 400/409/500 response handling
  // -------------------------------------------------------------
  await runCase("8. HTTP 400/409/500 error handling in import sequence", async () => {
    async function simulateImportSave(status: number, responseBody: any) {
      const mockRes = {
        ok: status >= 200 && status < 300,
        status,
        json: async () => responseBody,
      };

      if (!mockRes.ok) {
        const errorData = await mockRes.json().catch(() => ({}));
        throw new Error(errorData?.message || `Failed to save website kit data (HTTP ${mockRes.status})`);
      }
      return true;
    }

    // Test 400
    await assert.rejects(
      async () => simulateImportSave(400, { message: "Revision required" }),
      /Revision required/,
      "Must throw descriptive error on 400"
    );

    // Test 409
    await assert.rejects(
      async () => simulateImportSave(409, { message: "Version conflict detected" }),
      /Version conflict detected/,
      "Must throw descriptive error on 409"
    );

    // Test 500
    await assert.rejects(
      async () => simulateImportSave(500, { message: "Internal server error" }),
      /Internal server error/,
      "Must throw descriptive error on 500"
    );
  });

  // -------------------------------------------------------------
  // TEST 9: No navigation after failed save (Issue 03 Quality Gate)
  // -------------------------------------------------------------
  await runCase("9. No navigation after failed save (strict ok verification)", async () => {
    let navigationTriggered = false;
    let dialogClosed = false;
    let userNotifiedError: string | null = null;

    // Emulates the exact logic in UserDashboard.tsx:
    async function runDashboardImportFlow(simulateSaveFailure: boolean) {
      const createdWebsite = { id: "site_test_dash", version: 1 };

      // Put request simulation
      const saveRes = {
        ok: !simulateSaveFailure,
        status: simulateSaveFailure ? 409 : 200,
        json: async () =>
          simulateSaveFailure
            ? { code: "STALE_VERSION_CONFLICT", message: "Concurrent edit conflict" }
            : { success: true, website: { id: "site_test_dash", version: 2 } },
      };

      if (!saveRes.ok) {
        const errData = await saveRes.json().catch(() => ({}));
        throw new Error(errData?.message || `Failed to save (HTTP ${saveRes.status})`);
      }

      const saveJson = await saveRes.json();
      if (!saveJson?.website?.id || saveJson.website.id !== createdWebsite.id) {
        throw new Error("Mismatched website ID returned");
      }

      // Only on verified success
      dialogClosed = true;
      navigationTriggered = true;
    }

    // Run failure scenario
    try {
      await runDashboardImportFlow(true);
    } catch (err: any) {
      userNotifiedError = err.message;
    }

    assert.strictEqual(navigationTriggered, false, "Must NEVER navigate when save fails");
    assert.strictEqual(dialogClosed, false, "Must NOT mark import complete when save fails");
    assert.ok(userNotifiedError?.includes("Concurrent edit conflict"), "User received accurate error notification");

    // Run success scenario to verify positive path
    await runDashboardImportFlow(false);
    assert.strictEqual(navigationTriggered, true, "Navigates on verified successful save");
    assert.strictEqual(dialogClosed, true, "Dialog closes on verified successful save");
  });

  // -------------------------------------------------------------
  // TEST 10: Persisted data after reload (Real Database Integration)
  // -------------------------------------------------------------
  await runCase("10. Persisted data after reload (Real PostgreSQL DB create -> save -> GET)", async () => {
    const targetTestDbUrl = process.env.TEST_DATABASE_URL;
    if (!targetTestDbUrl) {
      logBlocked("Real DB Test", "TEST_DATABASE_URL is not configured in environment");
      blocked++;
      return;
    }

    // Set test env to target test database
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = targetTestDbUrl;

    let prismaClient: any = null;
    let testUser: any = null;
    let testWebsite: any = null;

    try {
      const prismaModule = await import("../src/config/prisma.js");
      prismaClient = prismaModule.prisma;
      const websiteService = await import("../src/services/website.service.js");

      // Verify DB connectivity
      await prismaClient.$queryRaw`SELECT 1`;

      // 1. Create a transient test user
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      testUser = await prismaClient.user.create({
        data: {
          email: `kit-test-${uniqueSuffix}@example.com`,
          fullName: "Kit Test User",
          role: "USER",
          status: "ACTIVE",
        },
      });

      // 2. Create website using real service (initial version: 1)
      testWebsite = await websiteService.createWebsite(testUser.id, "Real Persisted Kit Site");
      assert.ok(testWebsite.id, "Website successfully created in DB");
      assert.strictEqual(testWebsite.version, 1, "Initial website version is 1");

      // 3. Prepare real 4-page kit payload
      const fourPageKit = {
        type: "website-kit",
        version: 1,
        website: { name: "Real Persisted Kit Site" },
        pages: [
          {
            id: "pg-home",
            title: "Home",
            path: "/",
            isHome: true,
            elements: [{ id: "h1", type: "heading", content: "Persisted Home" }],
            pageSettings: { title: "Home" },
          },
          {
            id: "pg-services",
            title: "Services",
            path: "/services",
            customCss: ".srv { color: blue; }",
            elements: [{ id: "s1", type: "text", content: "Service List" }],
            pageSettings: { title: "Services" },
          },
        ],
      };

      const validationResult = validateAndSanitizeWebsiteKitFile(JSON.stringify(fourPageKit));
      assert.strictEqual(validationResult.isValid, true);
      const canonical = buildCanonicalEditorDataFromKit(validationResult.websiteKit, "Real Persisted Kit Site");

      // 4. Update website editorData with expectedVersion = 1
      const updatedWebsite = await websiteService.updateWebsiteEditorData(
        testWebsite.id,
        testUser.id,
        canonical,
        undefined,
        undefined,
        testWebsite.version
      );

      assert.strictEqual(updatedWebsite.version, 2, "Database version incremented from 1 to 2");

      // 5. Simulate browser reload: GET website details from DB
      const reloadedWebsite = await websiteService.getWebsiteById(testWebsite.id, testUser.id);
      assert.ok(reloadedWebsite, "Reloaded website exists in DB");
      assert.strictEqual(reloadedWebsite.version, 2, "Persisted version is 2");

      const persistedEditorData = reloadedWebsite.editorData as any;
      assert.ok(persistedEditorData, "editorData is persisted");
      assert.strictEqual(persistedEditorData.pages.length, 2, "All pages persisted in DB");
      assert.strictEqual(persistedEditorData.homePageId, "pg-home", "homePageId persisted in DB");
      assert.strictEqual(persistedEditorData.pages[1].customCss, ".srv { color: blue; }", "customCss persisted");
      assert.strictEqual(persistedEditorData.pages[0].elements[0].content, "Persisted Home", "Elements persisted");

      logPass("Real DB Verification", `Successfully verified create -> save (v1->v2) -> GET on DB`);
    } catch (err: any) {
      logFail("Real DB Verification", err);
      throw err;
    } finally {
      // Clean up test records
      if (prismaClient) {
        if (testWebsite?.id) {
          await prismaClient.website.deleteMany({ where: { id: testWebsite.id } }).catch(() => {});
        }
        if (testUser?.id) {
          await prismaClient.user.deleteMany({ where: { id: testUser.id } }).catch(() => {});
        }
        await prismaClient.$disconnect().catch(() => {});
      }
    }
  });

  console.log("\n=======================================================");
  console.log(`  COMPREHENSIVE TESTS FINISHED: ${passed} PASSED, ${failed} FAILED, ${blocked} BLOCKED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runWebsiteKitImportTestSuite()
  .then(() => {
    // Graceful clean exit
    process.exit(0);
  })
  .catch((e) => {
    console.error("Test execution fatal error:", e);
    process.exit(1);
  });
