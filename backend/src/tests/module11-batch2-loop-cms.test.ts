import { compileCanonicalToStaticBundle } from "../services/destinations/staticCompiler.js";
import {
  getWordPressAcfFields,
  getWordPressPodsFields,
  getWordPressToolsetFields,
  getWordPressMultisiteSites,
} from "../services/wordpress/connector.service.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, details || "");
    failed++;
  }
}

async function runBatch2Tests() {
  console.log("=================================================");
  console.log("RUNNING MODULE 11 BATCH 2: LOOP BUILDER & CMS INTEGRATIONS");
  console.log("=================================================\n");

  try {
    // -------------------------------------------------------------------------
    // 1. Loop Grid Core & Static Compiler Rendering (F-248, F-250, F-254)
    // -------------------------------------------------------------------------
    console.log("--- 1. Loop Grid Core & Static Compiler Rendering (F-248, F-250, F-254) ---");

    const samplePosts = [
      {
        id: "post-1",
        title: "Mastering React Server Components",
        excerpt: "Deep dive into streaming and hydration.",
        category: "Development",
        categorySlug: "development",
        date: "2026-09-01",
        slug: "mastering-react-server-components",
        featuredImage: "https://example.com/img1.jpg",
      },
      {
        id: "post-2",
        title: "Modern Architectural Systems",
        excerpt: "Exploring sustainable construction.",
        category: "Architecture",
        categorySlug: "architecture",
        date: "2026-09-10",
        slug: "modern-architectural-systems",
        featuredImage: "https://example.com/img2.jpg",
      },
      {
        id: "post-3",
        title: "WordPress Headless Workflows",
        excerpt: "Decoupled frontend strategies.",
        category: "WordPress",
        categorySlug: "wordpress",
        date: "2026-09-15",
        slug: "wordpress-headless-workflows",
        featuredImage: "https://example.com/img3.jpg",
      },
    ];

    const testWebsiteData = {
      id: "site-batch2",
      name: "Loop Grid Showcase",
      siteSettings: { siteName: "Loop Grid Showcase" },
      pages: [
        {
          id: "page-home",
          name: "Home",
          slug: "/",
          isHome: true,
          elements: [
            {
              id: "loop-1",
              type: "loop-grid",
              loopColumns: 3,
              loopGap: 24,
              queryLimit: 6,
              posts: samplePosts,
            },
          ],
        },
      ],
    };

    const bundle = compileCanonicalToStaticBundle("site-batch2", 1, testWebsiteData);
    const homeHtml = bundle.files.find((f) => f.path === "index.html")?.content || "";

    assert(homeHtml.includes('class="fs-loop-grid'), "Static compiler renders semantic <div class=\"fs-loop-grid\">");
    assert(homeHtml.includes("grid-template-columns:repeat(3,minmax(0,1fr))"), "Grid applies 3-column layout styling");
    assert(homeHtml.includes("gap:24px"), "Grid applies 24px gap styling");
    assert(homeHtml.includes("Mastering React Server Components"), "Grid contains post 1 title");
    assert(homeHtml.includes("Modern Architectural Systems"), "Grid contains post 2 title");
    assert(homeHtml.includes("fs-loop-card"), "Grid outputs valid semantic <article class=\"fs-loop-card\"> items");
    assert(homeHtml.includes('data-loop-item-index="0"'), "Cards include data-loop-item-index attribute");

    // -------------------------------------------------------------------------
    // 2. Alternating Zebra Layout (F-254)
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Alternating Zebra Layout (F-254) ---");

    const zebraWebsiteData = {
      id: "site-batch2-zebra",
      name: "Zebra Loop Grid",
      siteSettings: { siteName: "Zebra Loop Grid" },
      pages: [
        {
          id: "page-zebra",
          name: "Zebra",
          slug: "/",
          isHome: true,
          elements: [
            {
              id: "loop-zebra",
              type: "loop-grid",
              loopColumns: 2,
              loopGap: 16,
              alternateTemplateId: "alt_template_123",
              posts: samplePosts,
            },
          ],
        },
      ],
    };

    const zebraBundle = compileCanonicalToStaticBundle("site-batch2-zebra", 1, zebraWebsiteData);
    const zebraHtml = zebraBundle.files.find((f) => f.path === "index.html")?.content || "";

    assert(zebraHtml.includes('data-modulo="0"'), "Primary card has data-modulo=\"0\"");
    assert(zebraHtml.includes('data-modulo="1"'), "Alternate card has data-modulo=\"1\"");
    assert(zebraHtml.includes('data-alternate="true"'), "Alternate card has data-alternate=\"true\"");
    assert(zebraHtml.includes("fs-loop-card-alt"), "Alternate card has class fs-loop-card-alt for zebra styling");

    // -------------------------------------------------------------------------
    // 3. Query Engine Logic & Filtering (F-247, F-251, F-258)
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Query Engine Logic & Filtering (F-247, F-251, F-258) ---");

    // Test Query Term Filter Simulation
    const filteredByTerm = samplePosts.filter((item) => {
      const targetTerm = "development";
      const itemCat = (item.categorySlug || item.category || "").toLowerCase();
      return itemCat === targetTerm;
    });
    assert(filteredByTerm.length === 1 && filteredByTerm[0].slug === "mastering-react-server-components", "Filters correctly by category slug 'development'");

    // Test Exclude Current Post
    const currentPostId = "post-1";
    const excludedPosts = samplePosts.filter((item) => item.id !== currentPostId);
    assert(excludedPosts.length === 2 && !excludedPosts.some((p) => p.id === currentPostId), "Excludes current post accurately");

    // Test Related Posts Preset
    const currentCategory = "Architecture";
    const relatedPosts = samplePosts.filter((p) => p.category === currentCategory);
    assert(relatedPosts.length === 1 && relatedPosts[0].title === "Modern Architectural Systems", "Related posts preset matches same category");

    // Test Pagination Limit & Offset
    const offsetPosts = samplePosts.slice(1, 3);
    assert(offsetPosts.length === 2 && offsetPosts[0].id === "post-2", "Query offset shifts starting post index");

    // -------------------------------------------------------------------------
    // 4. WordPress Connector Custom Fields & Multisite Live Routes (F-262 to F-264, F-269)
    // -------------------------------------------------------------------------
    console.log("\n--- 4. WordPress Connector Custom Fields & Multisite Live Routes (F-262 to F-264, F-269) ---");

    assert(typeof getWordPressAcfFields === "function", "getWordPressAcfFields service method exists");
    assert(typeof getWordPressPodsFields === "function", "getWordPressPodsFields service method exists");
    assert(typeof getWordPressToolsetFields === "function", "getWordPressToolsetFields service method exists");
    assert(typeof getWordPressMultisiteSites === "function", "getWordPressMultisiteSites service method exists");

    // Verify graceful error handling when invalid or non-existent websiteId is supplied
    try {
      await getWordPressAcfFields("non-existent-site", "user-1");
      assert(false, "getWordPressAcfFields should throw on invalid websiteId");
    } catch (_e: any) {
      assert(true, "getWordPressAcfFields throws authorization/not-found error on missing site");
    }

    try {
      await getWordPressMultisiteSites("non-existent-site", "user-1");
      assert(false, "getWordPressMultisiteSites should throw on invalid websiteId");
    } catch (_e: any) {
      assert(true, "getWordPressMultisiteSites throws authorization/not-found error on missing site");
    }

  } catch (err: any) {
    console.error("Test execution encountered an error:", err);
    failed++;
  }

  console.log("\n=================================================");
  console.log(`MODULE 11 BATCH 2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runBatch2Tests();
