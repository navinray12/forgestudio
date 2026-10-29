import assert from "node:assert";
import http from "node:http";
import dotenv from "dotenv";

dotenv.config();

import {
  sanitizeDatabaseUrl,
  validateDisposableDatabaseUrl,
  assertSafeDisposableDatabase,
  assertDatabaseIsolation,
  verifyConnectedDatabaseIdentity,
} from "../src/utils/database-safety.js";

import { matchesThemeCondition, resolveTokensInTree } from "../src/services/website.service.js";
import { compileCanonicalToStaticBundle } from "../src/services/destinations/staticCompiler.js";

export async function runPhase7TestSuite() {
  console.log("================================================================");
  console.log("  FORGESTUDIO PHASE 7 — THEME BUILDER & DYNAMIC CMS TEST SUITE   ");
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
  // GATE 1: NEGATIVE DATABASE SAFETY CHECKS
  // ===========================================================================
  console.log("[GATE 1] Running Database Safety Checks...");
  const emptyRes = validateDisposableDatabaseUrl("");
  assert.strictEqual(emptyRes.safe, false, "Empty database URL must be rejected");
  logPass("Negative Safety: Empty DB URL rejected");

  const ordinaryCheck = validateDisposableDatabaseUrl("postgresql://postgres:secret@localhost:5432/elementor_saas");
  assert.strictEqual(ordinaryCheck.safe, false, "Ordinary dev DB must be rejected");
  logPass("Negative Safety: Non-disposable DB rejected");

  // ===========================================================================
  // GATE 2: VALIDATE TARGET DISPOSABLE DATABASE URL
  // ===========================================================================
  const targetTestDbUrl = process.env.TEST_DATABASE_URL;
  if (!targetTestDbUrl) {
    console.error("\n[BLOCKED] Explicit TEST_DATABASE_URL environment variable is required.");
    return { status: "BLOCKED", passedCount, failedCount };
  }

  assertSafeDisposableDatabase(targetTestDbUrl);
  console.log(`  ✓ Dedicated disposable test database target verified: ${sanitizeDatabaseUrl(targetTestDbUrl)}`);

  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = targetTestDbUrl;

  // DYNAMIC IMPORTS AFTER SAFETY VALIDATION
  const { prisma, resolveActiveDatabaseUrl } = await import("../src/config/prisma.js");
  const { default: app } = await import("../src/app.js");
  const cptService = await import("../src/services/cpt.service.js");
  const themeBuilderService = await import("../src/services/themeBuilder.service.js");

  const activePrismaUrl = resolveActiveDatabaseUrl();
  assertDatabaseIsolation(targetTestDbUrl, activePrismaUrl);
  console.log(`  ✓ Active Prisma connection validated against test target`);

  const connectedIdentity = await verifyConnectedDatabaseIdentity(prisma, targetTestDbUrl);
  console.log(`  ✓ Connected Database: ${connectedIdentity.database} on ${connectedIdentity.host}:${connectedIdentity.port}\n`);

  // Start test HTTP server
  const testPort = 5199;
  const server = http.createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.listen(testPort, () => resolve());
    server.on("error", reject);
  });

  const baseUrl = `http://localhost:${testPort}`;

  try {
    // ===========================================================================
    // TEST SECTION 1: SEED USERS AND TENANT WEBSITES
    // ===========================================================================
    console.log("[TEST 1] Setting up Test Tenants and Multi-Role Users...");
    const ts = Date.now();
    const owner = await prisma.user.create({
      data: {
        email: `owner_${ts}@test.com`,
        passwordHash: "dummyhash123",
        fullName: "Test Owner",
      },
    });

    const editorUser = await prisma.user.create({
      data: {
        email: `editor_${ts}@test.com`,
        passwordHash: "dummyhash123",
        fullName: "Test Editor",
      },
    });

    const viewerUser = await prisma.user.create({
      data: {
        email: `viewer_${ts}@test.com`,
        passwordHash: "dummyhash123",
        fullName: "Test Viewer",
      },
    });

    const foreignUser = await prisma.user.create({
      data: {
        email: `foreign_${ts}@test.com`,
        passwordHash: "dummyhash123",
        fullName: "Foreign Tenant User",
      },
    });

    const websiteA = await prisma.website.create({
      data: {
        name: `CMS Test Site A ${ts}`,
        slug: `cms-site-a-${ts}`,
        userId: owner.id,
        status: "PUBLISHED",
        editorData: {
          pages: [
            { id: "home", name: "Home", slug: "/", isHome: true, elements: [] },
            { id: "about", name: "About Us", slug: "/about", isHome: false, elements: [] },
            { id: "blog", name: "Blog Archive", slug: "/blog", isHome: false, elements: [] },
          ],
          siteParts: {
            header: {
              enabled: true,
              conditions: [{ type: "include:all" }],
              elements: [{ id: "h1", type: "heading", content: "Site A Global Header" }],
            },
            footer: {
              enabled: true,
              conditions: [{ type: "include:all" }, { type: "exclude:page:about", isExcluded: true }],
              elements: [{ id: "f1", type: "text", content: "Site A Global Footer" }],
            },
          },
        },
      },
    });

    const websiteB = await prisma.website.create({
      data: {
        name: `Foreign Site B ${ts}`,
        slug: `foreign-site-b-${ts}`,
        userId: foreignUser.id,
        status: "PUBLISHED",
      },
    });

    // Add collaborators to Website A
    await prisma.websiteCollaborator.create({
      data: {
        websiteId: websiteA.id,
        userId: editorUser.id,
        permission: "CONTENT_EDITOR",
      },
    });

    await prisma.websiteCollaborator.create({
      data: {
        websiteId: websiteA.id,
        userId: viewerUser.id,
        permission: "VIEWER",
      },
    });

    logPass("Multi-tenant setup", `Website A (${websiteA.id}) with Owner, Editor, Viewer; Website B with Foreign User`);

    // ===========================================================================
    // TEST SECTION 2: CUSTOM POST TYPE CRUD & SLUG COLLISION
    // ===========================================================================
    console.log("\n[TEST 2] Verifying Custom Post Type Creation and Slug Uniqueness...");
    const cptPortfolio = await cptService.createCustomPostType(websiteA.id, owner.id, {
      name: "Portfolio Projects",
      singular: "Project",
      plural: "Projects",
      slug: "projects",
      description: "Showcase client projects and design case studies",
      hasArchive: true,
    });

    assert.ok(cptPortfolio.id, "CPT ID must exist");
    assert.strictEqual(cptPortfolio.slug, "projects", "CPT slug must match");
    logPass("Create CPT: Portfolio Projects", `CPT created with id=${cptPortfolio.id}`);

    // Verify duplicate slug collision rejection
    let duplicateRejected = false;
    try {
      await cptService.createCustomPostType(websiteA.id, owner.id, {
        name: "Projects Duplicate",
        slug: "projects",
      });
    } catch (err: any) {
      duplicateRejected = true;
      assert.strictEqual(err.statusCode, 409, "Must return 409 Conflict");
    }
    assert.ok(duplicateRejected, "Duplicate slug within the same website must be rejected with 409");
    logPass("Slug Collision Guard", "Duplicate CPT slug rejected with 409 Conflict");

    // ===========================================================================
    // TEST SECTION 3: NON-DESTRUCTIVE CUSTOM FIELD RECONCILIATION
    // ===========================================================================
    console.log("\n[TEST 3] Verifying Non-Destructive Custom Field Updates & Value Preservation...");
    const initialFields = await cptService.saveCustomFields(cptPortfolio.id, owner.id, [
      { name: "Client Name", slug: "client_name", type: "text", order: 1 },
      { name: "Project Year", slug: "project_year", type: "number", order: 2 },
      { name: "Cover Image", slug: "cover_image", type: "image", order: 3 },
    ]);

    assert.strictEqual(initialFields.length, 3, "Must have 3 fields created");
    const clientFieldId = initialFields.find((f: any) => f.slug === "client_name")?.id;
    assert.ok(clientFieldId, "Client Name field must have an ID");
    logPass("Initial Custom Fields Saved", "3 custom fields saved successfully");

    // Create an entry with custom field data
    const entry1 = await cptService.createCustomEntry(cptPortfolio.id, owner.id, {
      title: "Fintech Mobile App Redesign",
      slug: "fintech-app",
      status: "PUBLISHED",
      data: {
        client_name: "Apex Financial",
        project_year: 2026,
        cover_image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800",
      },
    });

    assert.strictEqual(entry1.title, "Fintech Mobile App Redesign");
    assert.strictEqual((entry1.data as any).client_name, "Apex Financial");
    logPass("Custom Entry Created", `Entry created with id=${entry1.id}`);

    // Non-destructive update: add a 4th field "Budget", keep existing fields
    const updatedFields = await cptService.saveCustomFields(cptPortfolio.id, owner.id, [
      { id: clientFieldId, name: "Client Name Updated", slug: "client_name", type: "text", order: 1 },
      { name: "Project Year", slug: "project_year", type: "number", order: 2 },
      { name: "Cover Image", slug: "cover_image", type: "image", order: 3 },
      { name: "Budget", slug: "budget", type: "text", order: 4 },
    ]);

    assert.strictEqual(updatedFields.length, 4, "Must have 4 fields after reconciliation");
    const preservedField = updatedFields.find((f: any) => f.slug === "client_name");
    assert.strictEqual(preservedField?.id, clientFieldId, "Field ID must be preserved during reconciliation");

    // Verify existing entry data was NOT wiped or corrupted
    const refetchedEntry1 = await cptService.getCustomEntry(entry1.id, owner.id);
    assert.strictEqual((refetchedEntry1.data as any).client_name, "Apex Financial", "Existing entry data must be preserved");
    logPass("Non-destructive Field Reconciliation", "Field IDs and existing entry data preserved perfectly");

    // ===========================================================================
    // TEST SECTION 4: CMS ENTRIES CRUD, PAGINATION & STATUS ISOLATION
    // ===========================================================================
    console.log("\n[TEST 4] Verifying CMS Entries CRUD, Pagination, and Anonymous Draft Isolation...");
    // Create a draft entry
    const draftEntry = await cptService.createCustomEntry(cptPortfolio.id, owner.id, {
      title: "Unreleased AI Project",
      slug: "unreleased-ai",
      status: "DRAFT",
      data: {
        client_name: "Secret Stealth Labs",
        project_year: 2026,
      },
    });

    assert.strictEqual(draftEntry.status, "DRAFT");
    logPass("Draft Entry Created", `Draft entry id=${draftEntry.id}`);

    // Owner listing with status=ALL can see both
    const ownerList = await cptService.listCustomEntries(cptPortfolio.id, owner.id, {
      status: "ALL",
    });
    assert.strictEqual(ownerList.total, 2, "Owner should see both published and draft entries");
    logPass("Owner List Entries", "Owner can list all 2 entries (published + draft)");

    // Anonymous public API check: drafts MUST NOT be exposed
    const publicRes = await fetch(`${baseUrl}/api/v1/websites/${websiteA.id}/public/types/projects/entries`);
    assert.strictEqual(publicRes.status, 200, "Public entries query must return 200");
    const publicJson = await publicRes.json();
    const publicList = Array.isArray(publicJson.data) ? publicJson.data : (publicJson.entries || publicJson.data?.entries || []);
    assert.strictEqual(publicList.length, 1, "Public endpoint must ONLY return PUBLISHED entries");
    assert.strictEqual(publicList[0].slug, "fintech-app", "Published entry slug must match");
    assert.ok(!publicList.some((e: any) => e.status === "DRAFT"), "Draft entries must NOT be leaked to public API");
    logPass("Anonymous Draft Isolation", "Public API strictly returns 1 PUBLISHED entry and excludes DRAFT");

    // ===========================================================================
    // TEST SECTION 5: STRICT 7+7 RBAC & MULTI-TENANT ISOLATION
    // ===========================================================================
    console.log("\n[TEST 5] Verifying Strict 7+7 RBAC and Tenant Boundaries...");

    // Editor can create entry in Website A
    const editorEntry = await cptService.createCustomEntry(cptPortfolio.id, editorUser.id, {
      title: "E-commerce Redesign by Editor",
      slug: "ecommerce-redesign",
      status: "PUBLISHED",
      data: { client_name: "Shopify Merchant" },
    });
    assert.ok(editorEntry.id, "Content editor must be able to create entry");
    logPass("RBAC: CONTENT_EDITOR Entry Creation", "Content Editor successfully created CMS entry");

    // Editor CANNOT delete CPT (requires ADMIN or OWNER)
    let editorCptDeleteBlocked = false;
    try {
      await cptService.deleteCustomPostType(cptPortfolio.id, editorUser.id);
    } catch (err: any) {
      editorCptDeleteBlocked = true;
      assert.strictEqual(err.statusCode, 403, "Editor must get 403 for CPT deletion");
    }
    assert.ok(editorCptDeleteBlocked, "Editor cannot delete CPT structure");
    logPass("RBAC: CONTENT_EDITOR Role Boundary", "Content Editor blocked from deleting CPT (403)");

    // Viewer CANNOT create entries (requires CONTENT_EDITOR)
    let viewerCreateBlocked = false;
    try {
      await cptService.createCustomEntry(cptPortfolio.id, viewerUser.id, {
        title: "Unauthorized Entry",
        slug: "unauthorized",
      });
    } catch (err: any) {
      viewerCreateBlocked = true;
      assert.strictEqual(err.statusCode, 403, "Viewer must get 403 for entry creation");
    }
    assert.ok(viewerCreateBlocked, "Viewer cannot create CMS entries");
    logPass("RBAC: VIEWER Role Boundary", "Viewer blocked from creating CMS entry (403)");

    // Foreign user from Website B CANNOT access Website A CPT (tenant violation)
    let foreignTenantBlocked = false;
    try {
      await cptService.listCustomPostTypes(websiteA.id, foreignUser.id);
    } catch (err: any) {
      foreignTenantBlocked = true;
      assert.ok(err.statusCode === 403 || err.statusCode === 404, "Foreign user rejected");
    }
    assert.ok(foreignTenantBlocked, "Foreign user cannot list Website A CPTs");
    logPass("Tenant Boundary Isolation", "Foreign tenant user blocked from Website A data (403/404)");

    // ===========================================================================
    // TEST SECTION 6: THEME LOCATION RULES & SPECIFICITY PRECEDENCE
    // ===========================================================================
    console.log("\n[TEST 6] Verifying Theme Location Rules & Precedence Hierarchy...");
    // Create Header Rules:
    // Rule 1: Entire site default header (template "tmpl-header-default", priority 10)
    const headerRuleDefault = await themeBuilderService.createThemeRule(websiteA.id, owner.id, {
      locationType: "HEADER",
      templateId: "tmpl-header-default",
      conditions: [{ type: "include:all" }],
    });

    // Rule 2: About page specific header (template "tmpl-header-about", priority 90)
    const headerRuleAbout = await themeBuilderService.createThemeRule(websiteA.id, owner.id, {
      locationType: "HEADER",
      templateId: "tmpl-header-about",
      conditions: [{ type: "specific_page", targetId: "about" }],
    });

    // Rule 3: Single CPT entry header (template "tmpl-header-single-project", priority 100)
    const headerRuleSingleProject = await themeBuilderService.createThemeRule(websiteA.id, owner.id, {
      locationType: "HEADER",
      templateId: "tmpl-header-single-project",
      conditions: [{ type: "specific_entry", targetId: entry1.id }],
    });

    logPass("Theme Location Rules Created", "3 header rules registered with distinct conditions");

    // Evaluation 1: On homepage ("home") -> Should resolve to default header
    const evalHome = await themeBuilderService.evaluateThemeRule(websiteA.id, {
      locationType: "HEADER",
      pageId: "home",
      isHome: true,
      slug: "/",
    });
    assert.strictEqual(evalHome.matchedRule?.templateId, "tmpl-header-default", "Home should match default header");
    logPass("Precedence: Homepage", "Resolved to tmpl-header-default");

    // Evaluation 2: On about page ("about") -> Specific page should win over default site
    const evalAbout = await themeBuilderService.evaluateThemeRule(websiteA.id, {
      locationType: "HEADER",
      pageId: "about",
      isHome: false,
      slug: "/about",
    });
    assert.strictEqual(evalAbout.matchedRule?.templateId, "tmpl-header-about", "About page must match specific header");
    logPass("Precedence: Specific Page", "Resolved to tmpl-header-about (overriding entire_site)");

    // Evaluation 3: On single project entry1 -> Single entry should win over everything
    const evalSingle = await themeBuilderService.evaluateThemeRule(websiteA.id, {
      locationType: "HEADER",
      entryId: entry1.id,
      cptSlug: "projects",
    });
    assert.strictEqual(evalSingle.matchedRule?.templateId, "tmpl-header-single-project", "Specific entry must win");
    logPass("Precedence: Specific Entry", "Resolved to tmpl-header-single-project (highest weight 100)");

    // ===========================================================================
    // TEST SECTION 7: DYNAMIC TOKEN RESOLUTION & NESTED CUSTOM FIELDS
    // ===========================================================================
    console.log("\n[TEST 7] Verifying Dynamic Content Token Interpolation...");
    const dynamicNode = {
      type: "card",
      title: "Project: {post:title}",
      description: "Client: {post:data.client_name} - Year: {post:data.project_year}",
      footer: "Site: {site:name} | Status: {post:status}",
    };

    const tokenContext = {
      site: { name: "ForgeStudio Showcase" },
      post: {
        title: entry1.title,
        status: entry1.status,
        data: entry1.data,
      },
    };

    const resolvedNode = resolveTokensInTree(dynamicNode, tokenContext);
    assert.strictEqual(resolvedNode.title, "Project: Fintech Mobile App Redesign");
    assert.strictEqual(resolvedNode.description, "Client: Apex Financial - Year: 2026");
    assert.strictEqual(resolvedNode.footer, "Site: ForgeStudio Showcase | Status: PUBLISHED");
    logPass("Dynamic Token Interpolation", "Nested custom fields and tokens {post:data.client_name} resolved correctly");

    // ===========================================================================
    // TEST SECTION 8: STATIC COMPILER INTEGRATION WITH CPT & THEME CONDITIONS
    // ===========================================================================
    console.log("\n[TEST 8] Verifying Static Compiler with Loop Widgets & Conditional Header/Footer...");
    const canonicalSiteData = {
      name: "Test Agency",
      homePageId: "home",
      pages: [
        {
          id: "home",
          title: "Home",
          slug: "",
          isHome: true,
          elements: [
            {
              id: "loop1",
              type: "loop-grid",
              loopColumns: 3,
              queryLimit: 6,
              cptEntries: [
                {
                  id: "e1",
                  title: "Fintech Mobile App Redesign",
                  slug: "fintech-app",
                  description: "Apex Financial mobile app",
                  featuredImage: "https://example.com/app.jpg",
                  data: { client_name: "Apex Financial" },
                },
              ],
            },
            {
              id: "loop2",
              type: "loop-carousel",
              loopCarouselSlidesPerView: 3,
              cptEntries: [
                {
                  id: "e1",
                  title: "Fintech Mobile App Redesign",
                  slug: "fintech-app",
                  description: "Apex Financial mobile app",
                  featuredImage: "https://example.com/app.jpg",
                },
              ],
            },
          ],
        },
        {
          id: "about",
          title: "About Us",
          slug: "about",
          isHome: false,
          elements: [{ id: "t1", type: "text", content: "About our creative studio." }],
        },
      ],
      siteParts: {
        header: {
          enabled: true,
          conditions: [{ type: "include:all" }],
          elements: [{ id: "h1", type: "heading", content: "Master Static Header" }],
        },
        footer: {
          enabled: true,
          conditions: [{ type: "include:all" }, { type: "exclude:page:about", isExcluded: true }],
          elements: [{ id: "f1", type: "text", content: "Master Static Footer" }],
        },
      },
    };

    const bundle = compileCanonicalToStaticBundle(websiteA.id, 1, canonicalSiteData);
    assert.ok(bundle.files.length >= 4, "Must generate html files, css, runtime.js, site-manifest");

    const homeHtml = bundle.files.find((f: any) => f.path === "index.html")?.content || "";
    const aboutHtml = bundle.files.find((f: any) => f.path === "about.html")?.content || "";

    // Home must have header AND footer
    assert.ok(homeHtml.includes("Master Static Header"), "Home must have conditional header");
    assert.ok(homeHtml.includes("Master Static Footer"), "Home must have conditional footer");
    assert.ok(homeHtml.includes("Fintech Mobile App Redesign"), "Home Loop Grid must render real CPT entry title");
    assert.ok(homeHtml.includes("fs-loop-grid"), "Must render fs-loop-grid container");
    assert.ok(homeHtml.includes("fs-loop-carousel"), "Must render fs-loop-carousel container");
    logPass("Static Compile: Home Page", "Rendered Header, Footer, and Loop Grid with dynamic CPT entries");

    // About must have header BUT NOT footer (due to exclude condition)
    assert.ok(aboutHtml.includes("Master Static Header"), "About must include header");
    assert.ok(!aboutHtml.includes("Master Static Footer"), "About must EXCLUDE footer per theme condition");
    logPass("Static Compile: Condition Exclusion", "About page correctly excluded footer per rule condition");

    console.log("\n================================================================");
    console.log(`   PHASE 7 TEST SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log("================================================================\n");

    return { status: "PASSED", passedCount, failedCount };
  } finally {
    server.close();
  }
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("phase7-theme-cms.test.ts")) {
  runPhase7TestSuite()
    .then((res) => {
      if (res?.failedCount && res.failedCount > 0) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error("FATAL ERROR IN PHASE 7 TEST SUITE:", err);
      process.exit(1);
    });
}
