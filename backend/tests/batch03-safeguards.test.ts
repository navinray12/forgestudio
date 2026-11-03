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
import {
  WorkspaceWebsiteCache,
  getWorkspaceScopeKey,
} from "../../frontend/src/pages/dashboard/utils/workspaceWebsiteCache.js";

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

  // =========================================================================
  // ISSUE 07: CONTENT INTEGRITY & NON-MISLEADING ACTIONS
  // =========================================================================

  await runCase("18. Issue 07: Contact and signup submission buttons do not perform fake submissions or misleading navigation", () => {
    function findElementById(elements: any[], id: string): any {
      for (const el of elements) {
        if (el.id === id) return el;
        if (Array.isArray(el.children)) {
          const found = findElementById(el.children, id);
          if (found) return found;
        }
      }
      return null;
    }

    // 1. Kit 1 (Business Starter) Contact Form Button
    const kitA = WEBSITE_KITS.find((k) => k.id === "kit-business-starter");
    assert.ok(kitA, "Kit A must exist");
    const kitAContact = kitA.pages.find((p) => p.slug === "contact");
    assert.ok(kitAContact, "Kit A contact page must exist");
    const bizBtn = findElementById(kitAContact.elements, "biz-form-btn");
    assert.ok(bizBtn, "biz-form-btn must exist");
    assert.ok(!bizBtn.content.includes("Submit Message"), "biz-form-btn must not promise misleading message submission");
    assert.ok(bizBtn.content.toLowerCase().includes("demo") || bizBtn.content.toLowerCase().includes("editor"), "biz-form-btn must indicate demo / editor configuration");

    // 2. Kit 2 (Creative Agency) Project Brief Form Button
    const kitB = WEBSITE_KITS.find((k) => k.id === "kit-creative-agency");
    assert.ok(kitB, "Kit B must exist");
    const kitBContact = kitB.pages.find((p) => p.slug === "contact");
    assert.ok(kitBContact, "Kit B contact page must exist");
    const agencyBtn = findElementById(kitBContact.elements, "agency-f-btn");
    assert.ok(agencyBtn, "agency-f-btn must exist");
    assert.ok(!agencyBtn.content.includes("Submit Project Brief"), "agency-f-btn must not promise misleading brief submission");
    assert.ok(agencyBtn.content.toLowerCase().includes("demo") || agencyBtn.content.toLowerCase().includes("editor"), "agency-f-btn must indicate demo / editor configuration");

    // 3. Kit 3 (SaaS Launch) Signup Button
    const kitC = WEBSITE_KITS.find((k) => k.id === "kit-saas-launch");
    assert.ok(kitC, "Kit C must exist");
    const kitCSignup = kitC.pages.find((p) => p.slug === "signup");
    assert.ok(kitCSignup, "Kit C signup page must exist");
    const saasBtn = findElementById(kitCSignup.elements, "saas-f-submit-btn");
    assert.ok(saasBtn, "saas-f-submit-btn must exist");
    assert.ok(!saasBtn.content.includes("Create Free Account"), "saas-f-submit-btn must not promise fake account creation");
    assert.notStrictEqual(saasBtn.href, "/home", "saas-f-submit-btn must NOT misleadingly navigate to /home");
    assert.notStrictEqual(saasBtn.pageId, "page-saas-home", "saas-f-submit-btn must NOT redirect to page-saas-home");

    // 4. Kit 4 (Designer Portfolio) Direct Message Button
    const kitD = WEBSITE_KITS.find((k) => k.id === "kit-designer-portfolio");
    assert.ok(kitD, "Kit D must exist");
    const kitDContact = kitD.pages.find((p) => p.slug === "contact");
    assert.ok(kitDContact, "Kit D contact page must exist");
    const folioBtn = findElementById(kitDContact.elements, "folio-mb-btn");
    assert.ok(folioBtn, "folio-mb-btn must exist");
    assert.ok(!folioBtn.content.includes("Send Direct Message"), "folio-mb-btn must not promise misleading direct messaging");
    assert.ok(folioBtn.content.toLowerCase().includes("demo") || folioBtn.content.toLowerCase().includes("editor"), "folio-mb-btn must indicate demo / editor configuration");
  });

  await runCase("19. Issue 07: Unverified metrics, guarantees, claims and demonstration sections are explicitly labeled", () => {
    function findElementById(elements: any[], id: string): any {
      for (const el of elements) {
        if (el.id === id) return el;
        if (Array.isArray(el.children)) {
          const found = findElementById(el.children, id);
          if (found) return found;
        }
      }
      return null;
    }

    // Verify demonstration labels on contact and signup sections
    const kitA = WEBSITE_KITS.find((k) => k.id === "kit-business-starter")!;
    const bizContact = kitA.pages.find((p) => p.slug === "contact")!;
    const bizH = findElementById(bizContact.elements, "biz-form-h");
    assert.ok(bizH.content.includes("Demonstration"), "Business starter contact form header must label demonstration");

    const kitB = WEBSITE_KITS.find((k) => k.id === "kit-creative-agency")!;
    const agencyContact = kitB.pages.find((p) => p.slug === "contact")!;
    const agencyH = findElementById(agencyContact.elements, "agency-form-h");
    assert.ok(agencyH.content.includes("Demonstration"), "Agency brief form header must label demonstration");
    const agencyHours = findElementById(agencyContact.elements, "agency-hours");
    assert.ok(agencyHours.content.includes("Illustrative"), "Agency response guarantee must be labeled illustrative");

    const agencyCases = kitB.pages.find((p) => p.slug === "case-studies")!;
    const cs1Tag = findElementById(agencyCases.elements, "agency-cs-1-tag");
    assert.ok(cs1Tag.content.includes("ILLUSTRATIVE"), "Case study 1 tag must be labeled illustrative");

    const kitC = WEBSITE_KITS.find((k) => k.id === "kit-saas-launch")!;
    const saasSignup = kitC.pages.find((p) => p.slug === "signup")!;
    const saasGuarantee = findElementById(saasSignup.elements, "saas-f-guarantee");
    assert.ok(saasGuarantee.content.includes("Illustrative"), "SaaS security/cancellation guarantee must be labeled illustrative");

    const saasPricing = kitC.pages.find((p) => p.slug === "pricing")!;
    const saasPeDesc = findElementById(saasPricing.elements, "saas-pe-desc");
    assert.ok(saasPeDesc.content.includes("Illustrative"), "SaaS uptime SLA claim must be labeled illustrative");

    const kitD = WEBSITE_KITS.find((k) => k.id === "kit-designer-portfolio")!;
    const folioContact = kitD.pages.find((p) => p.slug === "contact")!;
    const folioAvail = findElementById(folioContact.elements, "folio-ci-avail");
    assert.ok(folioAvail.content.includes("Illustrative"), "Portfolio availability claim must be labeled illustrative");
  });

  // =========================================================================
  // ISSUE 09: WORKSPACE-SCOPED DASHBOARD CACHE & ERROR ISOLATION (PRODUCTION HELPER)
  // =========================================================================

  await runCase("20. Issue 09: Workspace cache isolates Workspace A websites when Workspace B fetch fails", () => {
    const cache = new WorkspaceWebsiteCache();
    const scopeA = getWorkspaceScopeKey("workspace-A");
    const scopeB = getWorkspaceScopeKey("workspace-B");

    // 1. Workspace A loads 2 websites successfully
    const wsAWebsites = [
      { id: "site-a1", name: "Workspace A - Store" },
      { id: "site-a2", name: "Workspace A - Blog" },
    ];
    const resA = cache.resolveFetchResult(scopeA, true, wsAWebsites);
    assert.strictEqual(resA.websites.length, 2);
    assert.strictEqual(resA.error, null);

    // 2. User switches to Workspace B. Initial state must be empty array, NOT Workspace A
    const initialB = cache.resolveForScope(scopeB);
    assert.strictEqual(initialB.websites.length, 0, "Workspace B must NOT inherit Workspace A's cards");
    assert.strictEqual(initialB.hasCachedData, false);

    // 3. Workspace B fetch fails (e.g. 403 Forbidden or 500)
    const resB = cache.resolveFetchResult(scopeB, false, undefined, "You do not have permission to access websites in this workspace.");
    assert.strictEqual(resB.websites.length, 0, "Failed Workspace B fetch must NOT render Workspace A's cards as B's websites");
    assert.strictEqual(resB.error, "You do not have permission to access websites in this workspace.");
    assert.strictEqual(resB.isPreservingScopeCache, false, "Must not claim cache preservation when scope has no cached data");

    // 4. Verify Workspace A remains cached and unaffected
    const cacheA = cache.get(scopeA);
    assert.strictEqual(cacheA?.length, 2, "Workspace A cache must remain intact");
  });

  await runCase("21. Issue 09: Workspace cache preserves cached cards ONLY for the same workspace scope", () => {
    const cache = new WorkspaceWebsiteCache();
    const scopeB = getWorkspaceScopeKey("workspace-B");

    // 1. Workspace B previously had 1 website loaded
    const wsBWebsites = [{ id: "site-b1", name: "Workspace B Portal" }];
    cache.resolveFetchResult(scopeB, true, wsBWebsites);

    // 2. User navigates away and returns to Workspace B
    const initialB = cache.resolveForScope(scopeB);
    assert.strictEqual(initialB.websites.length, 1);
    assert.strictEqual(initialB.hasCachedData, true);

    // 3. Workspace B refresh fails (network error)
    const refreshFail = cache.resolveFetchResult(scopeB, false, undefined, "Unable to reach the server.");
    assert.strictEqual(refreshFail.websites.length, 1, "Must preserve Workspace B's own cached cards on transient failure");
    assert.strictEqual(refreshFail.websites[0].id, "site-b1");
    assert.strictEqual(refreshFail.error, "Unable to reach the server.");
    assert.strictEqual(refreshFail.isPreservingScopeCache, true, "Must flag that cache for THIS scope is preserved");

    // 4. Retry succeeds with updated list
    const retrySuccess = cache.resolveFetchResult(scopeB, true, []);
    assert.strictEqual(retrySuccess.websites.length, 0, "Successful retry with genuine empty list updates state");
    assert.strictEqual(retrySuccess.error, null);
    assert.strictEqual(retrySuccess.isPreservingScopeCache, false);
  });

  await runCase("22. Issue 09: Stale requests cannot replace current workspace data", () => {
    const scopeA = getWorkspaceScopeKey("workspace-A");
    const scopeB = getWorkspaceScopeKey("workspace-B");

    let activeFetchId = 0;
    let activeScope = scopeA;

    // Fetch 1 starts for Workspace A
    const fetchId1 = ++activeFetchId;
    const fetchScope1 = scopeA;

    // User immediately switches to Workspace B: Fetch 2 starts
    const fetchId2 = ++activeFetchId;
    const fetchScope2 = scopeB;
    activeScope = scopeB;

    // Request 1 returns late after active scope has moved to Workspace B
    const isStale1 = !WorkspaceWebsiteCache.isRequestFresh(fetchId1, activeFetchId, fetchScope1, activeScope);
    assert.strictEqual(isStale1, true, "Late response from Workspace A must be recognized as stale and ignored");

    // Request 2 returns for Workspace B
    const isFresh2 = WorkspaceWebsiteCache.isRequestFresh(fetchId2, activeFetchId, fetchScope2, activeScope);
    assert.strictEqual(isFresh2, true, "Matching response for current Workspace B must be accepted");
  });

  await runCase("23. Issue 09: Website deletion scopes strictly to the active workspace cache", () => {
    const cache = new WorkspaceWebsiteCache();
    const scopeA = getWorkspaceScopeKey("workspace-A");
    const scopeB = getWorkspaceScopeKey("workspace-B");

    cache.set(scopeA, [{ id: "site-1", name: "A-1" }, { id: "site-2", name: "A-2" }]);
    cache.set(scopeB, [{ id: "site-3", name: "B-1" }]);

    // Delete site-1 in scope A
    cache.remove(scopeA, "site-1");
    assert.strictEqual(cache.get(scopeA)?.length, 1);
    assert.strictEqual(cache.get(scopeA)?.[0].id, "site-2");
    assert.strictEqual(cache.get(scopeB)?.length, 1, "Scope B must remain untouched when deleting in Scope A");
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
