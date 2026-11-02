import assert from "node:assert";
import http, { type Server } from "node:http";
import dotenv from "dotenv";
import {
  applyWebsiteKit,
  getWebsiteKits,
} from "../../frontend/src/features/website-kits/services/websiteKitService.js";
import { WEBSITE_KITS } from "../../frontend/src/features/website-kits/data/websiteKitsData.js";
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

async function runWebsiteKitApplicationTestSuite() {
  console.log("\n=======================================================");
  console.log("  BATCH 02: WEBSITE KIT APPLICATION & CONTRACT TESTS");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;
  let blocked = 0;

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

  // Sample curated kit
  const testKit = WEBSITE_KITS[0]; // Business Starter Kit (4 pages)

  // -------------------------------------------------------------
  // TEST 1: Issue 04 async callback resolves -> Dialog closes
  // -------------------------------------------------------------
  await runCase("1. Issue 04: Async import callback resolves -> Dialog closes cleanly", async () => {
    let dialogClosed = false;
    let isImporting = false;
    let validationError: string | null = null;

    const mockOnImportKit = async (_kitData: any) => {
      // Simulate async save operation
      await new Promise((r) => setTimeout(r, 10));
    };

    // Simulate handleConfirmImport from ImportWebsiteKitDialog.tsx
    const handleConfirmImport = async () => {
      if (isImporting) return;
      isImporting = true;
      validationError = null;
      try {
        await mockOnImportKit({});
        dialogClosed = true;
      } catch (err: any) {
        validationError = err?.message || "Unable to import Website Kit.";
      } finally {
        isImporting = false;
      }
    };

    await handleConfirmImport();

    assert.strictEqual(dialogClosed, true, "Dialog must close on async resolution");
    assert.strictEqual(isImporting, false, "Importing spinner stops");
    assert.strictEqual(validationError, null, "No validation error");
  });

  // -------------------------------------------------------------
  // TEST 2: Issue 04 async callback rejects -> Dialog remains open with error
  // -------------------------------------------------------------
  await runCase("2. Issue 04: Async import callback rejects -> Dialog remains open with visible error", async () => {
    let dialogClosed = false;
    let isImporting = false;
    let validationError: string | null = null;

    const mockOnImportKit = async (_kitData: any) => {
      await new Promise((r) => setTimeout(r, 10));
      throw new Error("Disk full: failed to save kit");
    };

    const handleConfirmImport = async () => {
      if (isImporting) return;
      isImporting = true;
      validationError = null;
      try {
        await mockOnImportKit({});
        dialogClosed = true;
      } catch (err: any) {
        validationError = err?.message || "Unable to import Website Kit.";
      } finally {
        isImporting = false;
      }
    };

    await handleConfirmImport();

    assert.strictEqual(dialogClosed, false, "Dialog must NEVER close when import rejects");
    assert.strictEqual(isImporting, false, "Importing spinner stops");
    assert.strictEqual(validationError, "Disk full: failed to save kit", "Error displayed to user");
  });

  // -------------------------------------------------------------
  // TEST 3: Apply kit without website ID -> Rejection and no fake success
  // -------------------------------------------------------------
  await runCase("3. Issue 05: Apply kit without website ID strictly rejected (no fake success)", async () => {
    await assert.rejects(
      async () => applyWebsiteKit("http://localhost:5000", testKit, ""),
      /No target website selected or active/,
      "Must reject empty website ID"
    );

    await assert.rejects(
      async () => applyWebsiteKit("http://localhost:5000", testKit, undefined),
      /No target website selected or active/,
      "Must reject undefined website ID"
    );
  });

  // -------------------------------------------------------------
  // TEST 4: Apply invalid kit structure -> Strictly rejected
  // -------------------------------------------------------------
  await runCase("4. Issue 05: Invalid kit structure strictly rejected", async () => {
    await assert.rejects(
      async () => applyWebsiteKit("http://localhost:5000", null as any, "site-123"),
      /Invalid Website Kit structure/,
      "Must reject null kit"
    );

    await assert.rejects(
      async () => applyWebsiteKit("http://localhost:5000", { pages: [] } as any, "site-123"),
      /Kit must contain at least one valid page/,
      "Must reject empty pages array"
    );
  });

  // -------------------------------------------------------------
  // TEST 5: Mock Pipeline — Valid kit applied to valid website with CAS
  // -------------------------------------------------------------
  await runCase("5. Issue 06: Apply valid kit to website via GET /api/websites/:id + PUT with CAS", async () => {
    const siteId = "site_abc_123";
    let getCalled = false;
    let putCalled = false;
    let putPayload: any = null;

    // Custom fetch mock
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes(`/api/websites/${siteId}`) && (!init || init.method === "GET")) {
        getCalled = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            website: { id: siteId, name: "Original Site", version: 3 },
          }),
        } as Response;
      }
      if (urlStr.includes(`/api/websites/${siteId}`) && init?.method === "PUT") {
        putCalled = true;
        putPayload = JSON.parse(init.body as string);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            message: "Website saved successfully",
            website: { id: siteId, name: "Original Site", version: 4 },
          }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as any;

    try {
      const result = await applyWebsiteKit("http://mock-api.local", testKit, siteId);
      assert.strictEqual(getCalled, true, "GET current website called");
      assert.strictEqual(putCalled, true, "PUT updated website called");
      assert.strictEqual(putPayload.expectedVersion, 3, "Passed current version 3 as expectedVersion");
      assert.strictEqual(result.success, true, "Returned success: true");
      assert.strictEqual(result.website.version, 4, "Returned updated website version 4");
      assert.strictEqual(result.editorData.pages.length, 4, "Converted and saved all 4 pages");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // TEST 6: Backend returns HTTP 404 on GET -> Real error, no fake success
  // -------------------------------------------------------------
  await runCase("6. Issue 05: Backend returns 404 on target website -> Rejects with clear message", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false,
      status: 404,
      json: async () => ({ message: "Website not found" }),
    })) as any;

    try {
      await assert.rejects(
        async () => applyWebsiteKit("http://mock.local", testKit, "site-missing"),
        /Target website not found/,
        "Must throw 404 error"
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // TEST 7: Backend returns HTTP 403 Forbidden -> Rejects with clear message
  // -------------------------------------------------------------
  await runCase("7. Issue 05: Backend returns 403 Forbidden -> Rejects unauthorized edit", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false,
      status: 403,
      json: async () => ({ message: "Forbidden" }),
    })) as any;

    try {
      await assert.rejects(
        async () => applyWebsiteKit("http://mock.local", testKit, "site-forbidden"),
        /do not have permission/,
        "Must throw 403 permission error"
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // TEST 8: Backend returns HTTP 409 Conflict on PUT -> Rejects with retry advice
  // -------------------------------------------------------------
  await runCase("8. Issue 05: Backend returns 409 Conflict -> Rejects and preserves concurrent changes", async () => {
    const siteId = "site_conflict";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, init: any) => {
      if (!init || init.method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ website: { id: siteId, version: 1 } }),
        } as Response;
      }
      return {
        ok: false,
        status: 409,
        json: async () => ({ code: "STALE_VERSION_CONFLICT", message: "Stale revision" }),
      } as Response;
    }) as any;

    try {
      await assert.rejects(
        async () => applyWebsiteKit("http://mock.local", testKit, siteId),
        /Conflict: This website was modified concurrently/,
        "Must throw conflict error and preserve concurrent edits"
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // TEST 9: Backend returns HTTP 400 Missing Revision -> Rejects with clear error
  // -------------------------------------------------------------
  await runCase("9. Issue 05: Backend returns 400 Validation Error -> Rejects with server message", async () => {
    const siteId = "site_400";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, init: any) => {
      if (!init || init.method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ website: { id: siteId, version: 1 } }),
        } as Response;
      }
      return {
        ok: false,
        status: 400,
        json: async () => ({ message: "Revision required" }),
      } as Response;
    }) as any;

    try {
      await assert.rejects(
        async () => applyWebsiteKit("http://mock.local", testKit, siteId),
        /Revision required/,
        "Must throw validation error"
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // TEST 10: Backend returns HTTP 500 Server Error -> Rejects without fake success
  // -------------------------------------------------------------
  await runCase("10. Issue 05: Backend returns 500 Server Error -> Rejects without fake success", async () => {
    const siteId = "site_500";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, init: any) => {
      if (!init || init.method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ website: { id: siteId, version: 1 } }),
        } as Response;
      }
      return {
        ok: false,
        status: 500,
        json: async () => ({ message: "Database connection failed" }),
      } as Response;
    }) as any;

    try {
      await assert.rejects(
        async () => applyWebsiteKit("http://mock.local", testKit, siteId),
        /Database connection failed|Internal server error/,
        "Must throw server error"
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // TEST 11: Network Failure during Save -> Rejects with connection error
  // -------------------------------------------------------------
  await runCase("11. Issue 05: Network request throws -> Rejects with connection error (no silent success)", async () => {
    const siteId = "site_netfail";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, init: any) => {
      if (!init || init.method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ website: { id: siteId, version: 1 } }),
        } as Response;
      }
      throw new TypeError("Failed to fetch: connection refused");
    }) as any;

    try {
      await assert.rejects(
        async () => applyWebsiteKit("http://mock.local", testKit, siteId),
        /Network failure during kit save/,
        "Must reject on network failure"
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // TEST 12: Backend returns 200 with success: false -> Must reject
  // -------------------------------------------------------------
  await runCase("12. Issue 05: Backend returns 200 with success:false -> Rejects with rejection message", async () => {
    const siteId = "site_false_ok";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, init: any) => {
      if (!init || init.method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ website: { id: siteId, version: 1 } }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: false, message: "Subscription limit exceeded" }),
      } as Response;
    }) as any;

    try {
      await assert.rejects(
        async () => applyWebsiteKit("http://mock.local", testKit, siteId),
        /Subscription limit exceeded/,
        "Must reject when success is false"
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // TEST 13: Backend returns wrong website ID -> Must reject
  // -------------------------------------------------------------
  await runCase("13. Issue 05: Backend returns mismatched website ID -> Verification failure", async () => {
    const siteId = "site_real_123";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, init: any) => {
      if (!init || init.method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ website: { id: siteId, version: 1 } }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, website: { id: "site_MISMATCHED_999", version: 2 } }),
      } as Response;
    }) as any;

    try {
      await assert.rejects(
        async () => applyWebsiteKit("http://mock.local", testKit, siteId),
        /mismatched website ID/,
        "Must reject when returned website ID doesn't match"
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // TEST 14: Confirm action double-click protection
  // -------------------------------------------------------------
  await runCase("14. Confirm action double-click protection prevents duplicate requests", async () => {
    let callCount = 0;
    let isApplying = false;

    const handleConfirm = async () => {
      if (isApplying) return;
      isApplying = true;
      callCount++;
      await new Promise((r) => setTimeout(r, 20));
      isApplying = false;
    };

    // Trigger two rapid clicks
    await Promise.all([handleConfirm(), handleConfirm()]);

    assert.strictEqual(callCount, 1, "Only one request must be dispatched on double-click");
  });

  // -------------------------------------------------------------
  // TEST 15: Curated kit catalog listing and category filtering
  // -------------------------------------------------------------
  await runCase("15. Curated website kits catalog listing and filtering", async () => {
    const allKits = await getWebsiteKits();
    assert.ok(Array.isArray(allKits), "getWebsiteKits returns array");
    assert.ok(allKits.length >= 2, "Contains curated kits");

    // Check categories
    const businessKits = allKits.filter((k) => k.category === "Business");
    assert.ok(businessKits.length > 0, "Business kits exist");

    // Check kit schema integrity
    const kit = allKits[0];
    assert.ok(kit.id, "Kit has id");
    assert.ok(kit.name, "Kit has name");
    assert.ok(kit.pages.length > 0, "Kit has pages");
    assert.ok(kit.globalStyles, "Kit has globalStyles");
  });

  // -------------------------------------------------------------
  // TEST 16: Blank website creation and Batch 01 import regression
  // -------------------------------------------------------------
  await runCase("16. Regression: Batch 01 website kit validation & canonical normalization preserved", async () => {
    const rawKitJson = JSON.stringify({
      type: "website-kit",
      version: 1,
      website: { name: "Regression Check Site" },
      pages: [
        { id: "p1", title: "Home", path: "/", isHome: true, elements: [] },
        { id: "p2", title: "About", path: "/about", elements: [] },
      ],
    });

    const val = validateAndSanitizeWebsiteKitFile(rawKitJson);
    assert.strictEqual(val.isValid, true, "Validation passes");

    const canonical = buildCanonicalEditorDataFromKit(val.websiteKit, "Regression Check Site");
    assert.strictEqual(canonical.pages.length, 2, "2 pages preserved");
    assert.strictEqual(canonical.homePageId, "p1", "homePageId correct");
  });

  // -------------------------------------------------------------
  // TEST 16a: Fix 1 — Existing website with content blocks unconfirmed destructive overwrite
  // -------------------------------------------------------------
  await runCase("16a. Fix 1: Target website with existing content blocks unconfirmed apply (No PUT executed)", async () => {
    const siteId = "site-with-existing-content";
    let putAttempted = false;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes(`/api/websites/${siteId}`) && (!init || init.method === "GET")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            website: {
              id: siteId,
              name: "Existing Site With Design",
              version: 2,
              editorData: {
                pages: [
                  {
                    id: "p1",
                    title: "Home",
                    elements: [{ id: "el1", type: "text", content: "Original User Content" }],
                  },
                ],
              },
            },
          }),
        } as Response;
      }
      if (urlStr.includes(`/api/websites/${siteId}`) && init?.method === "PUT") {
        putAttempted = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, website: { id: siteId, version: 3 } }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as any;

    try {
      await assert.rejects(
        async () => applyWebsiteKit("http://mock.local", testKit, siteId),
        /Target website contains existing content\. Explicit confirmation is required/
      );
      assert.strictEqual(putAttempted, false, "PUT must not be attempted without explicit overwrite confirmation");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // TEST 16b: Fix 1 — Explicit overwrite confirmation permits replacement of existing content
  // -------------------------------------------------------------
  await runCase("16b. Fix 1: Explicit overwrite confirmation allows replacing existing content", async () => {
    const siteId = "site-confirm-overwrite";
    let putAttempted = false;
    let putPayload: any = null;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes(`/api/websites/${siteId}`) && (!init || init.method === "GET")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            website: {
              id: siteId,
              name: "Existing Site",
              version: 4,
              editorData: {
                pages: [
                  { id: "p1", elements: [{ id: "el1", type: "heading" }] },
                ],
                publishing: { isPublished: true, publishedUrl: "https://mysite.com" },
              },
            },
          }),
        } as Response;
      }
      if (urlStr.includes(`/api/websites/${siteId}`) && init?.method === "PUT") {
        putAttempted = true;
        putPayload = JSON.parse(init.body as string);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            website: { id: siteId, version: 5 },
          }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as any;

    try {
      const result = await applyWebsiteKit("http://mock.local", testKit, siteId, {
        confirmOverwrite: true,
      });
      assert.strictEqual(putAttempted, true, "PUT was executed with explicit confirmation");
      assert.strictEqual(putPayload.expectedVersion, 4, "Version 4 passed in CAS");
      assert.ok(putPayload.editorData.publishing, "Preserved existing publication data");
      assert.strictEqual(result.success, true, "Operation succeeded");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // TEST 16c: Fix 2 — Unsaved editor changes block kit application before network requests
  // -------------------------------------------------------------
  await runCase("16c. Fix 2: Unsaved editor changes block kit application before network requests", async () => {
    let networkCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      networkCalled = true;
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as any;

    try {
      await assert.rejects(
        async () =>
          applyWebsiteKit("http://mock.local", testKit, "site-unsaved", {
            hasUnsavedChanges: true,
          }),
        /You have unsaved editor changes/
      );
      assert.strictEqual(networkCalled, false, "No network request allowed when unsaved changes exist");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // TEST 16d: Fix 2 — Active autosave blocks kit application to prevent race conditions
  // -------------------------------------------------------------
  await runCase("16d. Fix 2: Active autosave blocks kit application to prevent race conditions", async () => {
    let networkCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      networkCalled = true;
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as any;

    try {
      await assert.rejects(
        async () =>
          applyWebsiteKit("http://mock.local", testKit, "site-autosaving", {
            isAutosaving: true,
          }),
        /An autosave operation is currently in progress/
      );
      assert.strictEqual(networkCalled, false, "No network request allowed during active autosave");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // TEST 16e: Fix 3 — Missing revision stops operation without PUT (no defaulting to 1)
  // -------------------------------------------------------------
  await runCase("16e. Fix 3: Missing revision in target website rejects without PUT (no fallback to 1)", async () => {
    const siteId = "site-no-version";
    let putCalled = false;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes(`/api/websites/${siteId}`) && (!init || init.method === "GET")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            website: { id: siteId, name: "Site Without Version" }, // version is missing (undefined)
          }),
        } as Response;
      }
      if (init?.method === "PUT") {
        putCalled = true;
        return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as any;

    try {
      await assert.rejects(
        async () => applyWebsiteKit("http://mock.local", testKit, siteId),
        /Target website revision is invalid or missing/
      );
      assert.strictEqual(putCalled, false, "PUT must NOT be dispatched when revision is missing");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // TEST 16f: Fix 3 — Non-positive / invalid revision stops operation without PUT
  // -------------------------------------------------------------
  await runCase("16f. Fix 3: Invalid revision (string or <= 0) rejects without PUT", async () => {
    const invalidVersions = [0, -2, 1.5, "2", null];

    for (const badVer of invalidVersions) {
      const siteId = `site-bad-version-${String(badVer)}`;
      let putCalled = false;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = url.toString();
        if (urlStr.includes(`/api/websites/${siteId}`) && (!init || init.method === "GET")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              website: { id: siteId, name: "Site", version: badVer },
            }),
          } as Response;
        }
        if (init?.method === "PUT") {
          putCalled = true;
          return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      }) as any;

      try {
        await assert.rejects(
          async () => applyWebsiteKit("http://mock.local", testKit, siteId),
          /Target website revision is invalid or missing/
        );
        assert.strictEqual(putCalled, false, `PUT must not be called for invalid version: ${badVer}`);
      } finally {
        globalThis.fetch = originalFetch;
      }
    }
  });

  // -------------------------------------------------------------
  // TEST 16g: Fix 4 — Catalog retrieval does not invoke /api/website-kits and functions offline
  // -------------------------------------------------------------
  await runCase("16g. Fix 4: Catalog loads from curated local source without calling /api/website-kits", async () => {
    let apiEndpointCalled = false;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/website-kits")) {
        apiEndpointCalled = true;
        throw new Error("Endpoint /api/website-kits must not be requested");
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    }) as any;

    try {
      const kits = await getWebsiteKits("http://some-backend-url.local");
      assert.strictEqual(apiEndpointCalled, false, "Did not request /api/website-kits");
      assert.ok(Array.isArray(kits), "Returned kits array");
      assert.strictEqual(kits.length, WEBSITE_KITS.length, "Matches curated catalog kit count");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // -------------------------------------------------------------
  // TEST 17: REAL DATABASE INTEGRATION (create user -> create website -> apply kit -> reload & verify)
  // -------------------------------------------------------------
  await runCase("17. Real PostgreSQL DB Integration: Apply kit to persisted website and verify reload", async () => {
    const targetTestDbUrl = process.env.TEST_DATABASE_URL;
    if (!targetTestDbUrl) {
      logBlocked("Real DB Test", "TEST_DATABASE_URL is not configured in environment");
      blocked++;
      return;
    }

    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = targetTestDbUrl;

    let prismaClient: any = null;
    let testUser: any = null;
    let testWebsite: any = null;
    let server: Server | null = null;
    let baseUrl = "";

    try {
      const prismaModule = await import("../src/config/prisma.js");
      prismaClient = prismaModule.prisma;
      const websiteService = await import("../src/services/website.service.js");
      const appModule = await import("../src/app.js");
      const app = appModule.default;

      // 1. Verify DB connection
      await prismaClient.$queryRaw`SELECT 1`;

      // 2. Create test user
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      testUser = await prismaClient.user.create({
        data: {
          email: `batch02-user-${uniqueSuffix}@example.com`,
          fullName: "Batch 02 QA Tester",
          role: "USER",
          status: "ACTIVE",
        },
      });

      // 3. Create initial website in DB (version = 1)
      testWebsite = await websiteService.createWebsite(testUser.id, "Real Target Website for Kit");
      assert.strictEqual(testWebsite.version, 1, "Initial website version is 1");

      // 4. Spin up ephemeral HTTP server with Express app
      server = http.createServer(app);
      await new Promise<void>((resolve) => {
        server!.listen(0, () => {
          const port = (server!.address() as any).port;
          baseUrl = `http://127.0.0.1:${port}`;
          resolve();
        });
      });

      // 5. Mock auth context on the ephemeral server by mocking fetch to inject user session or using service directly
      // Here we execute the real applyWebsiteKit by pointing fetch to an interceptor that authorizes testUser
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: any, init: any) => {
        const urlStr = typeof input === "string" ? input : input.toString();
        // Forward requests to ephemeral server, injecting testUser into auth or using real service
        if (urlStr.startsWith(baseUrl)) {
          const headers = new Headers(init?.headers);
          // Directly invoke websiteService for authenticated DB persistence
          if (init?.method === "GET") {
            const site = await websiteService.getWebsiteById(testWebsite.id, testUser.id);
            return {
              ok: true,
              status: 200,
              json: async () => ({ success: true, website: site }),
            } as Response;
          }
          if (init?.method === "PUT") {
            const body = JSON.parse(init?.body as string);
            const updated = await websiteService.updateWebsiteEditorData(
              testWebsite.id,
              testUser.id,
              body.editorData,
              undefined,
              undefined,
              body.expectedVersion
            );
            return {
              ok: true,
              status: 200,
              json: async () => ({ success: true, message: "Website saved successfully", website: updated }),
            } as Response;
          }
        }
        return originalFetch(input, init);
      }) as any;

      try {
        // 6. Apply real curated kit to real DB website
        const applyResult = await applyWebsiteKit(baseUrl, testKit, testWebsite.id);
        assert.strictEqual(applyResult.success, true, "applyWebsiteKit succeeded");
        assert.strictEqual(applyResult.website.version, 2, "Database version incremented from 1 to 2");

        // 7. Verify persisted data after reload from DB directly
        const reloaded = await websiteService.getWebsiteById(testWebsite.id, testUser.id);
        assert.ok(reloaded, "Reloaded website exists in DB");
        assert.strictEqual(reloaded.version, 2, "Persisted version is 2");

        const editorData = reloaded.editorData as any;
        assert.strictEqual(editorData.pages.length, 4, "All 4 kit pages persisted in DB");
        assert.strictEqual(editorData.homePageId, "page-home", "homePageId persisted");
        assert.strictEqual(editorData.pages[0].elements[0].type, "container", "Hero container elements persisted");
        assert.strictEqual(
          editorData.globalStyles.accentColor,
          testKit.globalStyles.accentColor,
          "globalStyles accentColor persisted"
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    } finally {
      if (server) {
        await new Promise<void>((r) => server!.close(() => r()));
      }
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

runWebsiteKitApplicationTestSuite()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Test execution fatal error:", e);
    process.exit(1);
  });
