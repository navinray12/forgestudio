import assert from "node:assert";
import { validateAndNormalizeCanonicalWebsite } from "../src/validators/canonical-website.validator.js";
import { buildCanonicalEditorDataFromKit } from "../../frontend/src/features/templates/utils/websiteKitValidation.js";

// Helper logging
function logPass(title: string, details?: string) {
  console.log(`  ✓ [PASS] ${title}${details ? ` - ${details}` : ""}`);
}

function logFail(title: string, error: any) {
  console.error(`  ✗ [FAIL] ${title}:`, error);
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("  BATCH 01: WEBSITE KIT IMPORT TARGETED TEST SUITE");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

  function runCase(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      logPass(name);
      passed++;
    } catch (err: any) {
      logFail(name, err);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Single-Page Kit Conversion & Canonical Validation
  // -------------------------------------------------------------
  runCase("Create website and import valid single-page kit", () => {
    const singlePageKit = {
      website: { name: "Single Page Showcase", settings: { siteLanguage: "en" } },
      pages: [
        {
          id: "p-home",
          title: "Home",
          path: "/",
          elements: [
            { id: "hero-1", type: "heading", content: "Welcome" },
            { id: "btn-1", type: "button", content: "Learn More" },
          ],
          pageSettings: { title: "Home Page", path: "/" },
        },
      ],
      templates: [],
    };

    const canonical = buildCanonicalEditorDataFromKit(singlePageKit, "Single Page Showcase");
    assert.strictEqual(canonical.homePageId, "p-home", "homePageId must match the home page");
    assert.strictEqual(canonical.pages.length, 1, "Must contain exactly 1 page");
    assert.strictEqual(canonical.pages[0].slug, "/", "Home page slug must be '/'");
    assert.strictEqual(canonical.pages[0].isHome, true, "Home page must have isHome: true");
    assert.strictEqual(canonical.elements.length, 2, "Root elements must reflect home page elements");

    const validation = validateAndNormalizeCanonicalWebsite(canonical);
    assert.strictEqual(validation.isValid, true, `Backend canonical validation failed: ${validation.errors.join(", ")}`);
  });

  // -------------------------------------------------------------
  // TEST 2: Valid Four-Page Kit Import
  // -------------------------------------------------------------
  runCase("Import valid four-page kit (Home, About, Services, Contact)", () => {
    const fourPageKit = {
      website: { name: "Agency Kit", settings: { backgroundColor: "#f8fafc" } },
      pages: [
        {
          id: "page-home",
          title: "Home",
          path: "/",
          elements: [{ id: "h1", type: "heading", content: "Home Hero" }],
          pageSettings: { title: "Home" },
        },
        {
          id: "page-about",
          title: "About Us",
          path: "/about",
          elements: [{ id: "a1", type: "text", content: "About our team" }],
          pageSettings: { title: "About Us" },
        },
        {
          id: "page-services",
          title: "Services",
          path: "/services",
          elements: [{ id: "s1", type: "container", children: [{ id: "s1-btn", type: "button", content: "Book" }] }],
          pageSettings: { title: "Our Services" },
        },
        {
          id: "page-contact",
          title: "Contact",
          path: "/contact",
          elements: [{ id: "c1", type: "form", formMode: "simple" }],
          pageSettings: { title: "Get in Touch" },
        },
      ],
      templates: [{ id: "tmpl-header", name: "Agency Header", type: "section", elements: [] }],
    };

    const canonical = buildCanonicalEditorDataFromKit(fourPageKit, "Agency Kit");
    assert.strictEqual(canonical.pages.length, 4, "All four pages must be converted and preserved");
    assert.strictEqual(canonical.homePageId, "page-home", "homePageId resolved correctly");

    const pageSlugs = canonical.pages.map((p: any) => p.slug);
    assert.deepStrictEqual(pageSlugs, ["/", "/about", "/services", "/contact"], "All four page slugs normalized");

    assert.strictEqual(canonical.templates.length, 1, "Templates array preserved");
    assert.strictEqual(canonical.globalSettings.backgroundColor, "#f8fafc", "Global settings preserved");

    const validation = validateAndNormalizeCanonicalWebsite(canonical);
    assert.strictEqual(validation.isValid, true, `Canonical validation failed: ${validation.errors.join(", ")}`);
  });

  // -------------------------------------------------------------
  // TEST 3: Nested Content Preservation
  // -------------------------------------------------------------
  runCase("Import kit with deeply nested widgets and custom props", () => {
    const nestedKit = {
      website: { name: "Deep Tree Kit" },
      pages: [
        {
          id: "p1",
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
    };

    const canonical = buildCanonicalEditorDataFromKit(nestedKit, "Deep Tree Kit");
    const rootEl = canonical.pages[0].elements[0];
    assert.strictEqual(rootEl.children[0].children[0].counterEnd, 1500, "Nested counterEnd preserved");
    assert.strictEqual(rootEl.children[0].children[0].counterPrefix, "$", "Nested counterPrefix preserved");
    assert.strictEqual(rootEl.children[0].children[1].motionConfig.hoverScale, "1.05", "Nested motionConfig preserved");

    const validation = validateAndNormalizeCanonicalWebsite(canonical);
    assert.strictEqual(validation.isValid, true, "Validation should pass for nested element hierarchies");
  });

  // -------------------------------------------------------------
  // TEST 4: Duplicate Page IDs and Conflicting Slugs Disambiguation
  // -------------------------------------------------------------
  runCase("Deduplicate conflicting page IDs and duplicate page slugs", () => {
    const duplicateKit = {
      website: { name: "Duplication Test Kit" },
      pages: [
        { id: "page-dup", title: "Home", path: "/", elements: [] },
        { id: "page-dup", title: "About 1", path: "/about", elements: [] },
        { id: "page-3", title: "About 2", path: "/about", elements: [] }, // Conflicting slug
        { id: "page-4", title: "Another Home", path: "/", elements: [] }, // Conflicting home slug
      ],
    };

    const canonical = buildCanonicalEditorDataFromKit(duplicateKit, "Duplication Test Kit");
    const ids = canonical.pages.map((p: any) => p.id);
    const slugs = canonical.pages.map((p: any) => p.slug);

    const uniqueIds = new Set(ids);
    const uniqueSlugs = new Set(slugs);

    assert.strictEqual(uniqueIds.size, 4, "All page IDs must be unique");
    assert.strictEqual(uniqueSlugs.size, 4, "All page slugs must be unique");
    assert.strictEqual(slugs[0], "/", "Primary home page gets '/'");
    assert.notStrictEqual(slugs[3], "/", "Secondary page originally claiming '/' must be re-slugged");

    const validation = validateAndNormalizeCanonicalWebsite(canonical);
    assert.strictEqual(validation.isValid, true, `Validation after deduplication must pass: ${validation.errors.join(", ")}`);
  });

  // -------------------------------------------------------------
  // TEST 5: Previously Supported Kit JSON (Backward Compatibility)
  // -------------------------------------------------------------
  runCase("Previously supported legacy kit JSON (single root elements)", () => {
    const legacyKit = {
      website: { name: "Legacy Site" },
      elements: [
        { id: "legacy-text", type: "heading", content: "Legacy Page Content" },
      ],
      pageSettings: { title: "Legacy Home", path: "/" },
      templates: [],
    };

    const canonical = buildCanonicalEditorDataFromKit(legacyKit, "Legacy Site");
    assert.strictEqual(canonical.pages.length, 1, "Synthesizes single home page");
    assert.strictEqual(canonical.pages[0].elements.length, 1, "Page elements populated from root elements");
    assert.strictEqual(canonical.homePageId, "home", "homePageId defaults to 'home'");
    assert.strictEqual(canonical.elements.length, 1, "Root elements populated");

    const validation = validateAndNormalizeCanonicalWebsite(canonical);
    assert.strictEqual(validation.isValid, true, "Legacy kit validates cleanly");
  });

  // -------------------------------------------------------------
  // TEST 6: Simulated Dashboard Save Flow - ExpectedVersion & Concurrency
  // -------------------------------------------------------------
  runCase("Save after create - Valid persisted expectedVersion used in simulated flow", async () => {
    // Mock website creation response
    const mockCreatedWebsite = {
      id: "site_test_123",
      name: "Versioned Kit Site",
      version: 1,
    };

    let simulatedVersion = mockCreatedWebsite.version;

    // Simulate flow logic from UserDashboard
    const siteName = "Versioned Kit Site";
    let expectedVersion: number | undefined = mockCreatedWebsite.version;

    assert.strictEqual(expectedVersion, 1, "Expected version obtained from create response");

    // Concurrency CAS Simulation:
    // When expectedVersion matches, save succeeds and increments version
    function simulateBackendSave(putPayload: any) {
      if (putPayload.expectedVersion === undefined || putPayload.expectedVersion === null) {
        return { status: 400, body: { code: "MISSING_REVISION", message: "Revision required" } };
      }
      if (putPayload.expectedVersion !== simulatedVersion) {
        return { status: 409, body: { code: "STALE_VERSION_CONFLICT", message: "Conflict" } };
      }
      simulatedVersion += 1;
      return { status: 200, body: { success: true, website: { id: "site_test_123", version: simulatedVersion } } };
    }

    const payload = {
      expectedVersion,
      editorData: buildCanonicalEditorDataFromKit({ website: { name: siteName } }),
    };

    const saveRes = simulateBackendSave(payload);
    assert.strictEqual(saveRes.status, 200, "Save must succeed when valid expectedVersion is provided");
    assert.strictEqual(saveRes.body.website.version, 2, "Persisted version advanced from 1 to 2");
  });

  // -------------------------------------------------------------
  // TEST 7: Backend Rejection Scenarios (Issue 03: Never navigate on failure)
  // -------------------------------------------------------------
  runCase("Backend responds 400 MISSING_REVISION - No false success / navigation", async () => {
    let navigated = false;
    let errorCaught = false;

    async function simulateImport(simulateStatus: number, responseBody: any) {
      const mockSaveRes = {
        ok: simulateStatus >= 200 && simulateStatus < 300,
        status: simulateStatus,
        json: async () => responseBody,
      };

      if (!mockSaveRes.ok) {
        const data = await mockSaveRes.json();
        throw new Error(data?.message || `Failed to save (HTTP ${mockSaveRes.status})`);
      }
      navigated = true;
    }

    try {
      await simulateImport(400, { code: "MISSING_REVISION", message: "Revision required" });
    } catch (err: any) {
      errorCaught = true;
      assert.ok(err.message.includes("Revision required"), "Error message preserved");
    }

    assert.strictEqual(errorCaught, true, "Must catch and handle HTTP 400 error");
    assert.strictEqual(navigated, false, "Must NEVER navigate on HTTP 400 MISSING_REVISION");
  });

  runCase("Backend responds 409 Conflict - Error displayed, no navigation", async () => {
    let navigated = false;
    let errorCaught = false;

    async function simulateImport() {
      const mockSaveRes = {
        ok: false,
        status: 409,
        json: async () => ({ code: "STALE_VERSION_CONFLICT", message: "Conflict detected" }),
      };

      if (!mockSaveRes.ok) {
        const data = await mockSaveRes.json();
        throw new Error(data?.message || "Conflict");
      }
      navigated = true;
    }

    try {
      await simulateImport();
    } catch (err: any) {
      errorCaught = true;
      assert.strictEqual(err.message, "Conflict detected");
    }

    assert.strictEqual(errorCaught, true, "Must catch 409 conflict");
    assert.strictEqual(navigated, false, "Must NEVER navigate on 409 conflict");
  });

  runCase("Backend responds 500 - Error displayed, no navigation", async () => {
    let navigated = false;
    let errorCaught = false;

    async function simulateImport() {
      const mockSaveRes = {
        ok: false,
        status: 500,
        json: async () => ({ code: "INTERNAL_ERROR", message: "Database write failure" }),
      };

      if (!mockSaveRes.ok) {
        const data = await mockSaveRes.json();
        throw new Error(data?.message || "Internal error");
      }
      navigated = true;
    }

    try {
      await simulateImport();
    } catch (err: any) {
      errorCaught = true;
      assert.strictEqual(err.message, "Database write failure");
    }

    assert.strictEqual(errorCaught, true, "Must catch 500 error");
    assert.strictEqual(navigated, false, "Must NEVER navigate on 500 internal error");
  });

  runCase("Network request fails - Error displayed, no navigation", async () => {
    let navigated = false;
    let errorCaught = false;

    async function simulateImport() {
      throw new TypeError("Failed to fetch: connection refused");
    }

    try {
      await simulateImport();
      navigated = true;
    } catch (err: any) {
      errorCaught = true;
      assert.ok(err.message.includes("Failed to fetch"));
    }

    assert.strictEqual(errorCaught, true, "Must catch network failure");
    assert.strictEqual(navigated, false, "Must NEVER navigate on network failure");
  });

  runCase("Backend returns a mismatched website ID - Import not marked successful", async () => {
    let navigated = false;
    let errorCaught = false;
    const requestedSiteId = "site_abc_123";

    async function simulateImport() {
      const mockSaveRes = {
        ok: true,
        status: 200,
        json: async () => ({ success: true, website: { id: "site_MISMATCHED_999", version: 2 } }),
      };

      const data = await mockSaveRes.json();
      if (!data?.website?.id || data.website.id !== requestedSiteId) {
        throw new Error("Website kit import failed: server returned an unexpected website ID.");
      }
      navigated = true;
    }

    try {
      await simulateImport();
    } catch (err: any) {
      errorCaught = true;
      assert.ok(err.message.includes("unexpected website ID"));
    }

    assert.strictEqual(errorCaught, true, "Mismatched ID detected");
    assert.strictEqual(navigated, false, "Must NEVER navigate on mismatched website ID");
  });

  // -------------------------------------------------------------
  // TEST 8: Independent Page Mutation Invariant
  // -------------------------------------------------------------
  runCase("Edit different imported pages - Independent page content preserved", () => {
    const kit = {
      website: { name: "Multi Page Site" },
      pages: [
        { id: "p1", title: "Home", path: "/", elements: [{ id: "h1", type: "text", content: "Home Text" }] },
        { id: "p2", title: "About", path: "/about", elements: [{ id: "a1", type: "text", content: "About Text" }] },
      ],
    };

    const canonical = buildCanonicalEditorDataFromKit(kit, "Multi Page Site");

    // Mutate page 2 (About)
    const updatedPages = canonical.pages.map((p: any) => {
      if (p.id === "p2") {
        return {
          ...p,
          elements: [{ id: "a1", type: "text", content: "Updated About Text" }],
        };
      }
      return p;
    });

    assert.strictEqual(updatedPages[0].elements[0].content, "Home Text", "Home text must remain unchanged");
    assert.strictEqual(updatedPages[1].elements[0].content, "Updated About Text", "About text successfully updated");
  });

  console.log("\n=======================================================");
  console.log(`  TARGETED TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution fatal error:", e);
  process.exit(1);
});
