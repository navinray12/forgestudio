import {
  resolveDynamicTokens,
  resolveTokensInTree,
  matchesThemeCondition,
  type DynamicContext,
} from "../services/website.service.js";
import { compileCanonicalToStaticBundle } from "../services/destinations/staticCompiler.js";

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

async function runPhase7Tests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO PHASE 7: THEME BUILDER & DYNAMIC CONTENT");
  console.log("=================================================\n");

  try {
    // 1. Dynamic Tag Token Resolution Tests
    console.log("--- 1. Dynamic Token Resolution Tests ---");

    const context: DynamicContext = {
      site: {
        id: "site-123",
        name: "Acme Corp Website",
        slug: "acme-corp",
        siteSettings: {
          siteName: "Acme Global Solutions",
          siteLanguage: "en-US",
        },
      },
      page: {
        id: "page-about",
        name: "About Us",
        title: "About Our Company",
        slug: "about",
        isHome: false,
      },
      entry: {
        id: "cpt-456",
        title: "Senior Product Designer",
        slug: "senior-product-designer",
        data: {
          salary: "$140,000",
          location: "Remote - US",
          department: "Engineering",
        },
      },
      custom: {
        "author.name": "John Doe",
      },
    };

    const text1 = "Welcome to {{site.name}}! Copyright {{current.year}}.";
    const resolved1 = resolveDynamicTokens(text1, context);
    assert(
      resolved1 === `Welcome to Acme Global Solutions! Copyright ${new Date().getFullYear()}.`,
      "Resolves site.name and current.year tokens correctly",
      resolved1
    );

    const text2 = "{{page.title}} | {{site.slug}}";
    const resolved2 = resolveDynamicTokens(text2, context);
    assert(
      resolved2 === "About Our Company | acme-corp",
      "Resolves page.title and site.slug correctly",
      resolved2
    );

    const text3 = "Position: {{cpt.title}} - {{cpt.department}} in {{cpt.location}} ({{entry.salary}})";
    const resolved3 = resolveDynamicTokens(text3, context);
    assert(
      resolved3 === "Position: Senior Product Designer - Engineering in Remote - US ($140,000)",
      "Resolves cpt and entry custom field tokens correctly",
      resolved3
    );

    const text4 = "Article by {{author.name}} in {{site.language}}";
    const resolved4 = resolveDynamicTokens(text4, context);
    assert(
      resolved4 === "Article by John Doe in en-US",
      "Resolves custom dictionary tokens and site.language",
      resolved4
    );

    // 2. Recursive Token Tree Resolution Tests
    console.log("\n--- 2. Recursive Token Tree Resolution Tests ---");

    const elementTree = {
      id: "hero-1",
      type: "heading",
      content: "{{site.name}} - Leading Innovation",
      settings: {
        badge: "Updated {{current.year}}",
        meta: {
          pageName: "{{page.name}}",
        },
      },
      items: [
        { label: "Job: {{cpt.title}}" },
        { label: "Location: {{cpt.location}}" },
      ],
    };

    const resolvedTree = resolveTokensInTree(elementTree, context);
    assert(
      resolvedTree.content === "Acme Global Solutions - Leading Innovation",
      "Resolves string tokens at root level of element tree"
    );
    assert(
      resolvedTree.settings.badge === `Updated ${new Date().getFullYear()}`,
      "Resolves string tokens in nested object settings"
    );
    assert(
      resolvedTree.settings.meta.pageName === "About Us",
      "Resolves string tokens in deeply nested properties"
    );
    assert(
      resolvedTree.items[0].label === "Job: Senior Product Designer",
      "Resolves tokens inside nested arrays of objects"
    );

    // 3. Theme Location Condition Matching Tests
    console.log("\n--- 3. Theme Location Condition Tests ---");

    // include:all
    assert(
      matchesThemeCondition(["include:all"], { pageId: "p1", isHome: false, slug: "about" }),
      "include:all matches non-home pages"
    );
    assert(
      matchesThemeCondition(["include:all"], { pageId: "home", isHome: true, slug: "" }),
      "include:all matches home page"
    );

    // include:singular:home
    assert(
      matchesThemeCondition(["include:singular:home"], { pageId: "home", isHome: true, slug: "" }),
      "include:singular:home matches home page"
    );
    assert(
      !matchesThemeCondition(["include:singular:home"], { pageId: "p1", isHome: false, slug: "contact" }),
      "include:singular:home does not match non-home page"
    );

    // include:page:id
    assert(
      matchesThemeCondition(["include:page:p-contact"], { pageId: "p-contact", isHome: false, slug: "contact" }),
      "include:page:<id> matches targeted page"
    );
    assert(
      !matchesThemeCondition(["include:page:p-contact"], { pageId: "p-pricing", isHome: false, slug: "pricing" }),
      "include:page:<id> rejects non-targeted page"
    );

    // Exclusions override inclusions
    assert(
      !matchesThemeCondition(["include:all", "exclude:page:p-checkout"], { pageId: "p-checkout", isHome: false, slug: "checkout" }),
      "exclude:page:<id> takes priority over include:all"
    );
    assert(
      matchesThemeCondition(["include:all", "exclude:page:p-checkout"], { pageId: "p-home", isHome: true, slug: "" }),
      "exclude:page:p-checkout allows other pages when include:all is present"
    );

    // 4. Static Compiler Theme Conditions & Dynamic Token Resolution Tests
    console.log("\n--- 4. Static Compiler Parity with Dynamic Tokens & Theme Conditions ---");

    const sampleSiteData = {
      name: "Acme Dynamic Site",
      slug: "acme-dynamic",
      siteSettings: {
        siteName: "Acme International",
        siteLanguage: "en",
      },
      homePageId: "page-home",
      siteParts: {
        header: {
          enabled: true,
          conditions: ["include:singular:home"], // Header only on home page
          elements: [
            { id: "hdr-1", type: "heading", content: "Global Header - {{site.name}}" }
          ]
        },
        footer: {
          enabled: true,
          conditions: ["include:all", "exclude:page:page-landing"], // Footer on all except landing
          elements: [
            { id: "ftr-1", type: "text", content: "Footer - All Rights Reserved {{current.year}}" }
          ]
        }
      },
      pages: [
        {
          id: "page-home",
          title: "Home",
          slug: "",
          isHome: true,
          elements: [
            { id: "h-el-1", type: "heading", content: "Welcome to {{site.name}} on {{page.title}}" }
          ]
        },
        {
          id: "page-landing",
          title: "Special Landing",
          slug: "landing",
          isHome: false,
          elements: [
            { id: "l-el-1", type: "text", content: "Landing content on {{page.slug}}" }
          ]
        },
        {
          id: "page-about",
          title: "About Us",
          slug: "about",
          isHome: false,
          elements: [
            { id: "a-el-1", type: "text", content: "About page content" }
          ]
        }
      ]
    };

    const bundle = compileCanonicalToStaticBundle("dynamic-test-site", 1, sampleSiteData);

    const indexHtml = bundle.files.find(f => f.path === "index.html")?.content || "";
    const landingHtml = bundle.files.find(f => f.path === "landing.html")?.content || "";
    const aboutHtml = bundle.files.find(f => f.path === "about.html")?.content || "";

    // Header condition checks
    assert(
      indexHtml.includes("Global Header - Acme International"),
      "Home page includes Header with resolved {{site.name}} token"
    );
    assert(
      !landingHtml.includes("Global Header"),
      "Landing page does NOT include Header due to include:singular:home condition"
    );
    assert(
      !aboutHtml.includes("Global Header"),
      "About page does NOT include Header due to include:singular:home condition"
    );

    // Footer condition checks
    assert(
      indexHtml.includes(`Footer - All Rights Reserved ${new Date().getFullYear()}`),
      "Home page includes Footer with resolved {{current.year}} token"
    );
    assert(
      !landingHtml.includes("Footer - All Rights Reserved"),
      "Landing page excludes Footer due to exclude:page:page-landing rule"
    );
    assert(
      aboutHtml.includes(`Footer - All Rights Reserved ${new Date().getFullYear()}`),
      "About page includes Footer per include:all rule"
    );

    // Dynamic tokens resolved in page content
    assert(
      indexHtml.includes("Welcome to Acme International on Home"),
      "Page element dynamic tokens {{site.name}} and {{page.title}} resolved in static compilation"
    );
    assert(
      landingHtml.includes("Landing content on landing"),
      "Page element dynamic token {{page.slug}} resolved in static compilation"
    );

  } catch (err) {
    console.error("Unexpected error in Phase 7 test suite:", err);
    failed++;
  } finally {
    console.log("\n=================================================");
    console.log(`PHASE 7 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runPhase7Tests();
