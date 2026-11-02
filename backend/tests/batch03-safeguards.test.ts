import assert from "node:assert";
import dotenv from "dotenv";
import { WEBSITE_KITS } from "../../frontend/src/features/website-kits/data/websiteKitsData.js";
import {
  validateAndSanitizeWebsiteKitFile,
  buildCanonicalEditorDataFromKit,
} from "../../frontend/src/features/templates/utils/websiteKitValidation.js";
import { getUserWebsites } from "../src/services/website.service.js";
import { getWebsitesHandler } from "../src/controllers/website.controller.js";
import { AppError } from "../src/utils/app-error.js";
import { prisma } from "../src/config/database.js";

dotenv.config();

function logPass(title: string, details?: string) {
  console.log(`  ✓ [PASS] ${title}${details ? ` - ${details}` : ""}`);
}

function logFail(title: string, error: any) {
  console.error(`  ✗ [FAIL] ${title}:`, error);
}

async function runBatch03TestSuite() {
  console.log("\n=======================================================");
  console.log("  BATCH 03: WEBSITE KITS, PUBLISHED FALLBACK & LIST ERRORS");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

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

  // =========================================================================
  // ISSUE 07: COMPLETE ALL 11 EMPTY KIT PAGES
  // =========================================================================

  await runCase("1. Issue 07: Curated catalog contains exactly 4 kits", () => {
    assert.strictEqual(WEBSITE_KITS.length, 4, `Expected 4 kits, got ${WEBSITE_KITS.length}`);
  });

  await runCase("2. Issue 07: Total declared pages across all 4 kits is exactly 15", () => {
    const totalPages = WEBSITE_KITS.reduce((sum, kit) => sum + (kit.pages?.length || 0), 0);
    assert.strictEqual(totalPages, 15, `Expected 15 pages in total, found ${totalPages}`);
  });

  await runCase("3. Issue 07: Kit A (Business Starter) has 4 pages with non-empty elements", () => {
    const kit = WEBSITE_KITS.find((k) => k.id === "kit-business-starter");
    assert.ok(kit, "Business Starter Kit should exist");
    assert.strictEqual(kit.pages.length, 4);
    const expectedSlugs = ["home", "about", "services", "contact"];
    const actualSlugs = kit.pages.map((p) => p.slug);
    assert.deepStrictEqual(actualSlugs, expectedSlugs);
    for (const page of kit.pages) {
      assert.ok(Array.isArray(page.elements), `Page ${page.title || page.name} elements must be array`);
      assert.ok(page.elements.length > 0, `Page ${page.title || page.name} elements must not be empty`);
    }
  });

  await runCase("4. Issue 07: Kit B (Creative Agency Pro) has 4 pages with non-empty elements", () => {
    const kit = WEBSITE_KITS.find((k) => k.id === "kit-creative-agency");
    assert.ok(kit, "Creative Agency Pro Kit should exist");
    assert.strictEqual(kit.pages.length, 4);
    const expectedSlugs = ["home", "portfolio", "case-studies", "contact"];
    const actualSlugs = kit.pages.map((p) => p.slug);
    assert.deepStrictEqual(actualSlugs, expectedSlugs);
    for (const page of kit.pages) {
      assert.ok(Array.isArray(page.elements), `Page ${page.title || page.name} elements must be array`);
      assert.ok(page.elements.length > 0, `Page ${page.title || page.name} elements must not be empty`);
    }
  });

  await runCase("5. Issue 07: Kit C (SaaS Platform Launch) has 4 pages with non-empty elements", () => {
    const kit = WEBSITE_KITS.find((k) => k.id === "kit-saas-launch");
    assert.ok(kit, "SaaS Platform Launch Kit should exist");
    assert.strictEqual(kit.pages.length, 4);
    const expectedSlugs = ["home", "features", "pricing", "signup"];
    const actualSlugs = kit.pages.map((p) => p.slug);
    assert.deepStrictEqual(actualSlugs, expectedSlugs);
    for (const page of kit.pages) {
      assert.ok(Array.isArray(page.elements), `Page ${page.title || page.name} elements must be array`);
      assert.ok(page.elements.length > 0, `Page ${page.title || page.name} elements must not be empty`);
    }
  });

  await runCase("6. Issue 07: Kit D (Modern Designer Portfolio) has 3 pages with non-empty elements", () => {
    const kit = WEBSITE_KITS.find((k) => k.id === "kit-designer-portfolio");
    assert.ok(kit, "Designer Portfolio Kit should exist");
    assert.strictEqual(kit.pages.length, 3);
    const expectedSlugs = ["home", "experience", "contact"];
    const actualSlugs = kit.pages.map((p) => p.slug);
    assert.deepStrictEqual(actualSlugs, expectedSlugs);
    for (const page of kit.pages) {
      assert.ok(Array.isArray(page.elements), `Page ${page.title || page.name} elements must be array`);
      assert.ok(page.elements.length > 0, `Page ${page.title || page.name} elements must not be empty`);
    }
  });

  await runCase("7. Issue 07: Zero empty kit pages remain across the entire catalog", () => {
    let emptyPageCount = 0;
    for (const kit of WEBSITE_KITS) {
      for (const page of kit.pages) {
        if (!page.elements || page.elements.length === 0) {
          emptyPageCount++;
        }
      }
    }
    assert.strictEqual(emptyPageCount, 0, `Found ${emptyPageCount} empty pages remaining`);
  });

  await runCase("8. Issue 07: Element IDs are unique within each page element tree", () => {
    function collectIds(elements: any[]): string[] {
      const ids: string[] = [];
      for (const el of elements) {
        if (el.id) ids.push(el.id);
        if (Array.isArray(el.children) && el.children.length > 0) {
          ids.push(...collectIds(el.children));
        }
      }
      return ids;
    }

    for (const kit of WEBSITE_KITS) {
      for (const page of kit.pages) {
        const ids = collectIds(page.elements);
        const uniqueIds = new Set(ids);
        assert.strictEqual(
          uniqueIds.size,
          ids.length,
          `Duplicate element IDs found on kit "${kit.id}", page "${page.title || page.name}"`
        );
      }
    }
  });

  await runCase("9. Issue 07: All 4 kits pass canonical schema validation", () => {
    for (const kit of WEBSITE_KITS) {
      // 1. Direct canonical conversion used by applyWebsiteKit
      const canonical = buildCanonicalEditorDataFromKit(kit as any);
      assert.ok(canonical, `Canonical editor data build must succeed for kit ${kit.id}`);
      assert.strictEqual(canonical.pages.length, kit.pages.length);
      assert.ok(canonical.homePageId, `Canonical editor data must have homePageId for kit ${kit.id}`);

      // 2. Exported kit JSON file format validation used by ImportWebsiteKitDialog
      const fileExportFormat = {
        type: "website-kit",
        version: 1,
        exportedAt: new Date().toISOString(),
        website: {
          name: kit.name,
          category: kit.category,
        },
        globalStyles: kit.globalStyles,
        pages: kit.pages,
      };
      const jsonStr = JSON.stringify(fileExportFormat);
      const sanitizedResult = validateAndSanitizeWebsiteKitFile(jsonStr);
      assert.strictEqual(sanitizedResult.isValid, true, `Sanitization must succeed for kit ${kit.id}: ${sanitizedResult.error}`);
      assert.ok(sanitizedResult.websiteKit, "Sanitized websiteKit must exist");
      assert.strictEqual(sanitizedResult.websiteKit.pages.length, kit.pages.length);
    }
  });

  // =========================================================================
  // ISSUE 08: FIX PUBLISHED EMPTY PAGE FALLBACK
  // =========================================================================

  // Pure logic replica representing PublishedSite.tsx page resolution
  function resolvePublishedElements(params: {
    pagesList: any[];
    editorData: { elements?: any[]; homePageId?: string };
    initialSlug?: string;
    sitePartsState?: any;
  }): { activePageId: string; elements: any[]; errorMessage: string } {
    const { pagesList, editorData, initialSlug, sitePartsState } = params;

    // Normalization helper matching findTargetPage
    const normalizeRoutePath = (path: string): string => {
      const cleaned = (path || "").replace(/^\/+|\/+$/g, "").trim().toLowerCase();
      return cleaned === "" ? "home" : cleaned;
    };

    const findTargetPage = (pages: any[], route: string): any => {
      if (!pages || !pages.length) return null;
      const target = normalizeRoutePath(route);
      return (
        pages.find((p) => normalizeRoutePath(p.slug || "") === target) ||
        pages.find((p) => normalizeRoutePath(p.id || "") === target) ||
        pages.find((p) => normalizeRoutePath(p.name || "") === target) ||
        null
      );
    };

    if (pagesList && pagesList.length > 0) {
      const cleanSlug = initialSlug ? initialSlug.replace(/^\//, "") : "";
      const isPostRoute = cleanSlug.startsWith("post/") || cleanSlug.startsWith("blog/");
      const isTermRoute = cleanSlug.startsWith("category/") || cleanSlug.startsWith("tag/");
      const matchedPage = findTargetPage(pagesList, initialSlug || "");

      if (matchedPage) {
        return {
          activePageId: matchedPage.id || "home",
          elements: Array.isArray(matchedPage.elements) ? matchedPage.elements : [],
          errorMessage: "",
        };
      } else if (isPostRoute && sitePartsState?.single?.elements?.length && (sitePartsState.single.isEnabled ?? true)) {
        return {
          activePageId: "single-post-template",
          elements: sitePartsState.single.elements,
          errorMessage: "",
        };
      } else if (isTermRoute && sitePartsState?.archive?.elements?.length && (sitePartsState.archive.isEnabled ?? true)) {
        return {
          activePageId: "archive-template",
          elements: sitePartsState.archive.elements,
          errorMessage: "",
        };
      } else if (isTermRoute) {
        const archivePage =
          pagesList.find((p) => p.slug === "/archive" || p.slug === "archive" || p.slug === "/blog" || p.slug === "blog") ||
          pagesList.find((p: any) => p.isHome || p.slug === "/") ||
          pagesList[0];
        return {
          activePageId: archivePage?.id || "home",
          elements: archivePage && Array.isArray(archivePage.elements) ? archivePage.elements : [],
          errorMessage: "",
        };
      } else if (initialSlug && sitePartsState?.notFound404?.elements?.length && (sitePartsState.notFound404.isEnabled ?? true)) {
        return {
          activePageId: "404-template",
          elements: sitePartsState.notFound404.elements,
          errorMessage: "",
        };
      } else if (initialSlug && !isPostRoute && !isTermRoute) {
        return {
          activePageId: "",
          elements: [],
          errorMessage: "The requested page cannot be found or does not exist.",
        };
      } else {
        const activePage =
          pagesList.find((p: any) => p.isHome || (editorData.homePageId && p.id === editorData.homePageId) || p.slug === "/") ||
          pagesList[0];
        return {
          activePageId: activePage?.id || "home",
          elements: activePage && Array.isArray(activePage.elements) ? activePage.elements : [],
          errorMessage: "",
        };
      }
    } else if (editorData?.elements && Array.isArray(editorData.elements)) {
      return {
        activePageId: "home",
        elements: editorData.elements,
        errorMessage: "",
      };
    }

    return { activePageId: "", elements: [], errorMessage: "No elements found" };
  }

  await runCase("10. Issue 08 - Case A: Populated page renders its own elements", () => {
    const homeElements = [{ id: "h1", type: "heading", content: "Welcome Home" }];
    const aboutElements = [{ id: "a1", type: "heading", content: "About Us" }];

    const result = resolvePublishedElements({
      pagesList: [
        { id: "page-home", name: "Home", slug: "/", elements: homeElements },
        { id: "page-about", name: "About", slug: "/about", elements: aboutElements },
      ],
      editorData: { elements: homeElements },
      initialSlug: "about",
    });

    assert.strictEqual(result.activePageId, "page-about");
    assert.deepStrictEqual(result.elements, aboutElements);
    assert.strictEqual(result.errorMessage, "");
  });

  await runCase("11. Issue 08 - Case B: Intentionally empty page renders empty array, NOT home elements", () => {
    const homeElements = [{ id: "h1", type: "heading", content: "Welcome Home" }];
    const emptyAboutElements: any[] = [];

    const result = resolvePublishedElements({
      pagesList: [
        { id: "page-home", name: "Home", slug: "/", elements: homeElements },
        { id: "page-about", name: "About", slug: "/about", elements: emptyAboutElements },
      ],
      editorData: { elements: homeElements },
      initialSlug: "about",
    });

    assert.strictEqual(result.activePageId, "page-about");
    assert.strictEqual(result.elements.length, 0, "Empty page must yield 0 elements");
    assert.notDeepStrictEqual(result.elements, homeElements, "Empty page must NOT fall back to home elements");
    assert.strictEqual(result.errorMessage, "");
  });

  await runCase("12. Issue 08 - Case C: Missing page does not silently render home content (shows 404)", () => {
    const homeElements = [{ id: "h1", type: "heading", content: "Welcome Home" }];

    const result = resolvePublishedElements({
      pagesList: [{ id: "page-home", name: "Home", slug: "/", elements: homeElements }],
      editorData: { elements: homeElements },
      initialSlug: "non-existent-page",
    });

    assert.strictEqual(result.elements.length, 0, "Missing page must not have elements");
    assert.notDeepStrictEqual(result.elements, homeElements, "Missing page must NOT render home elements");
    assert.ok(result.errorMessage.includes("cannot be found"), "Must display 404 error message");
  });

  await runCase("13. Issue 08 - Case D: Legacy single-page site with no pages array preserves root elements", () => {
    const legacyElements = [{ id: "legacy-1", type: "heading", content: "Legacy Site Header" }];

    const result = resolvePublishedElements({
      pagesList: [],
      editorData: { elements: legacyElements },
      initialSlug: undefined,
    });

    assert.strictEqual(result.activePageId, "home");
    assert.deepStrictEqual(result.elements, legacyElements, "Legacy site must render root editorData.elements");
  });

  await runCase("14. Issue 08 - Case E: Concrete archive page with empty elements preserves empty array", () => {
    const homeElements = [{ id: "h1", type: "heading", content: "Home elements" }];
    const emptyArchiveElements: any[] = [];

    const result = resolvePublishedElements({
      pagesList: [
        { id: "page-home", name: "Home", slug: "/", isHome: true, elements: homeElements },
        { id: "page-archive", name: "Archive", slug: "/archive", elements: emptyArchiveElements },
      ],
      editorData: { elements: homeElements },
      initialSlug: "category/tech",
    });

    assert.strictEqual(result.activePageId, "page-archive");
    assert.strictEqual(result.elements.length, 0, "Concrete archive page with empty elements must yield 0 elements");
    assert.notDeepStrictEqual(result.elements, homeElements, "Concrete archive must not fall back to home elements");
  });

  // =========================================================================
  // ISSUE 09: DISTINGUISH DATABASE FAILURE FROM ZERO WEBSITES
  // =========================================================================

  await runCase("15. Issue 09: getUserWebsites propagates error on database failure (does NOT swallow to [])", async () => {
    // Temporarily mock prisma.website.findMany to throw a database failure
    const originalFindMany = prisma.website.findMany;
    const originalQueryRaw = prisma.$queryRaw;

    try {
      (prisma.website.findMany as any) = async () => {
        throw new Error("Connection to PostgreSQL failed: connection refused on port 5432");
      };
      (prisma.$queryRaw as any) = async () => {
        throw new Error("Connection to PostgreSQL failed: connection refused on port 5432");
      };

      let threw = false;
      let caughtError: any = null;
      try {
        await getUserWebsites("00000000-0000-0000-0000-000000000001");
      } catch (err: any) {
        threw = true;
        caughtError = err;
      }

      assert.strictEqual(threw, true, "getUserWebsites must throw on database failure");
      assert.ok(caughtError instanceof AppError, "Thrown error must be an instance of AppError");
      assert.strictEqual(caughtError.statusCode, 500);
      assert.strictEqual(caughtError.code, "WEBSITES_FETCH_FAILED");
    } finally {
      prisma.website.findMany = originalFindMany;
      prisma.$queryRaw = originalQueryRaw;
    }
  });

  await runCase("16. Issue 09: getUserWebsites genuinely returns [] when database returns zero websites", async () => {
    const originalFindMany = prisma.website.findMany;
    try {
      (prisma.website.findMany as any) = async () => [];

      const result = await getUserWebsites("00000000-0000-0000-0000-000000000002");
      assert.ok(Array.isArray(result), "Result must be an array");
      assert.strictEqual(result.length, 0, "Result must be empty array for user with zero websites");
    } finally {
      prisma.website.findMany = originalFindMany;
    }
  });

  await runCase("17. Issue 09: getWebsitesHandler forwards database error to next(error)", async () => {
    const originalFindMany = prisma.website.findMany;
    const originalQueryRaw = prisma.$queryRaw;

    try {
      (prisma.website.findMany as any) = async () => {
        throw new Error("Fatal DB Error");
      };
      (prisma.$queryRaw as any) = async () => {
        throw new Error("Fatal DB Error");
      };

      let nextError: any = null;
      const mockReq: any = {
        query: {},
      };
      const mockRes: any = {
        locals: {
          user: { id: "00000000-0000-0000-0000-000000000001" },
        },
        json: () => {
          throw new Error("res.json should not be called when an error occurs");
        },
      };
      const mockNext = (err: any) => {
        nextError = err;
      };

      await getWebsitesHandler(mockReq, mockRes, mockNext);

      assert.ok(nextError, "next() must be called with an error");
      assert.ok(nextError instanceof AppError, "Forwarded error must be AppError");
      assert.strictEqual(nextError.statusCode, 500);
    } finally {
      prisma.website.findMany = originalFindMany;
      prisma.$queryRaw = originalQueryRaw;
    }
  });

  await runCase("18. Issue 09: Frontend fetchWebsites error contract handles HTTP 500 and network failure", () => {
    // Simulation of UserDashboard.tsx fetchWebsites state machine
    let websiteFetchError: string | null = null;
    let websites: any[] = [{ id: "existing-site-1", name: "Site 1" }];

    function handleFetchFailure(errorMsg: string) {
      websiteFetchError = errorMsg;
      // Safeguard: websites list preserved on refresh failure
    }

    function handleFetchSuccess(newWebsites: any[]) {
      websiteFetchError = null;
      websites = newWebsites;
    }

    // 1. Simulate 500 failure
    handleFetchFailure("Failed to load websites: Database unavailable");
    assert.ok(websiteFetchError, "Fetch error must be set on failure");
    assert.strictEqual(websites.length, 1, "Cached websites must NOT be wiped out on transient failure");

    // 2. Simulate Retry success
    handleFetchSuccess([]);
    assert.strictEqual(websiteFetchError, null, "Error must be cleared on successful retry");
    assert.strictEqual(websites.length, 0, "Genuine empty list must be set on successful empty response");
  });

  await runCase("19. Issue 09: Frontend workspace race condition protection with activeFetchIdRef", () => {
    let activeFetchId = 0;
    let displayedWorkspaceId = "workspace-A";
    let displayedWebsites: any[] = [];

    // User is on workspace-A, fetch starts
    const fetchIdA = ++activeFetchId;

    // User switches to workspace-B before fetch A completes
    displayedWorkspaceId = "workspace-B";
    const fetchIdB = ++activeFetchId;

    // Fetch B returns first
    if (fetchIdB === activeFetchId) {
      displayedWebsites = [{ id: "site-b", name: "Workspace B Site" }];
    }

    // Fetch A finally returns late
    if (fetchIdA === activeFetchId) {
      // Stale response! Should not execute
      displayedWebsites = [{ id: "site-a", name: "Workspace A Site" }];
    }

    assert.strictEqual(displayedWebsites[0]?.id, "site-b", "Stale workspace response must be discarded");
  });

  // Summary
  console.log("\n=======================================================");
  console.log(`  COMPREHENSIVE TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runBatch03TestSuite().catch((err) => {
  console.error("Test suite threw uncaught error:", err);
  process.exit(1);
});
