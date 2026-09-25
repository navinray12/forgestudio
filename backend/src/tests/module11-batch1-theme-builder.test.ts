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

async function runBatch1Tests() {
  console.log("=================================================");
  console.log("RUNNING MODULE 11 BATCH 1: THEME BUILDER & DYNAMIC CONTENT");
  console.log("=================================================\n");

  try {
    // -------------------------------------------------------------------------
    // 1. Enhanced Dynamic Tokens Validation (F-260, F-261, F-266)
    // -------------------------------------------------------------------------
    console.log("--- 1. Enhanced Dynamic Tokens Validation (F-260, F-261, F-266) ---");

    const batch1Context: DynamicContext = {
      site: {
        id: "site-batch1",
        name: "Acme Portal",
        slug: "acme-portal",
        siteSettings: {
          siteName: "Acme Global Enterprise",
        },
      },
      page: {
        id: "page-blog",
        name: "Blog Article",
        title: "Mastering Theme Builders",
        slug: "mastering-theme-builders",
        isHome: false,
      },
      post: {
        id: "post-101",
        title: "10 Principles of Modern Web Design",
        excerpt: "Discover essential principles that guide contemporary digital experiences.",
        date: "2026-09-25",
        author: "Sarah Connor",
        featuredImage: "https://images.unsplash.com/photo-example.jpg",
        category: "Engineering",
        tags: ["design", "architecture", "ui"],
      },
      request: {
        q: "theme builder tutorial",
        utm_source: "newsletter",
        ref: "twitter",
      },
      query: {
        category: "tutorials",
        page: "2",
      },
      custom: {
        "custom.badge": "Featured Article",
      },
    };

    // {{post.title}}, {{post.excerpt}}, {{post.date}}, {{post.author}}
    const resolvedPostTitle = resolveDynamicTokens("Title: {{post.title}}", batch1Context);
    assert(
      resolvedPostTitle === "Title: 10 Principles of Modern Web Design",
      "Resolves {{post.title}} correctly",
      resolvedPostTitle
    );

    const resolvedPostExcerpt = resolveDynamicTokens("Summary: {{post.excerpt}}", batch1Context);
    assert(
      resolvedPostExcerpt === "Summary: Discover essential principles that guide contemporary digital experiences.",
      "Resolves {{post.excerpt}} correctly",
      resolvedPostExcerpt
    );

    const resolvedPostAuthor = resolveDynamicTokens("By {{post.author}} on {{post.date}}", batch1Context);
    assert(
      resolvedPostAuthor === "By Sarah Connor on 2026-09-25",
      "Resolves {{post.author}} and {{post.date}} correctly",
      resolvedPostAuthor
    );

    const resolvedPostImage = resolveDynamicTokens("Cover: {{post.featuredImage}}", batch1Context);
    assert(
      resolvedPostImage === "Cover: https://images.unsplash.com/photo-example.jpg",
      "Resolves {{post.featuredImage}} correctly",
      resolvedPostImage
    );

    // {{request.q}}, {{request.utm_source}}, {{query.category}}
    const resolvedSearchQuery = resolveDynamicTokens('Search: "{{request.q}}"', batch1Context);
    assert(
      resolvedSearchQuery === 'Search: "theme builder tutorial"',
      "Resolves {{request.q}} query parameter token",
      resolvedSearchQuery
    );

    const resolvedUtm = resolveDynamicTokens("Source: {{request.utm_source}} via {{request.ref}}", batch1Context);
    assert(
      resolvedUtm === "Source: newsletter via twitter",
      "Resolves multiple {{request.*}} URL parameter tokens",
      resolvedUtm
    );

    const resolvedQueryParam = resolveDynamicTokens("Category: {{query.category}}, Page: {{query.page}}", batch1Context);
    assert(
      resolvedQueryParam === "Category: tutorials, Page: 2",
      "Resolves {{query.*}} parameter tokens",
      resolvedQueryParam
    );

    // Backward compatibility for {{entry.*}} and {{cpt.*}}
    const legacyContext: DynamicContext = {
      entry: {
        id: "entry-legacy",
        title: "Legacy CPT Title",
        slug: "legacy-cpt",
        data: {
          clientName: "Wayne Enterprises",
        },
      },
    };
    const legacyResolved = resolveDynamicTokens("Client: {{entry.clientName}}, Title: {{entry.title}}", legacyContext);
    assert(
      legacyResolved === "Client: Wayne Enterprises, Title: Legacy CPT Title",
      "Backward compatibility for {{entry.*}} and {{entry.title}} preserved",
      legacyResolved
    );

    // -------------------------------------------------------------------------
    // 2. Recursive Token Tree Resolution
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Recursive Token Tree Resolution ---");

    const sampleElements = [
      {
        id: "hero-container",
        type: "container",
        children: [
          {
            id: "hero-heading",
            type: "heading",
            content: "{{post.title}}",
          },
          {
            id: "hero-meta",
            type: "text",
            content: "Published on {{post.date}} by {{post.author}} | Category: {{query.category}}",
          },
        ],
      },
    ];

    const resolvedElements = resolveTokensInTree(sampleElements, batch1Context);
    assert(
      resolvedElements[0].children[0].content === "10 Principles of Modern Web Design",
      "Resolves {{post.title}} in nested element tree",
      resolvedElements[0].children[0].content
    );
    assert(
      resolvedElements[0].children[1].content === "Published on 2026-09-25 by Sarah Connor | Category: tutorials",
      "Resolves multiple dynamic tokens in nested paragraph element",
      resolvedElements[0].children[1].content
    );

    // -------------------------------------------------------------------------
    // 3. Static Compiler Scope Parity (404.html, archive.html, search.html) (F-238, F-239, F-240)
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Static Compiler Theme Parts Generation (404, Archive, Search Results) ---");

    const mockWorkingSnapshot: any = {
      version: 1,
      name: "ForgeStudio Enterprise",
      siteSettings: {
        siteName: "ForgeStudio Enterprise",
      },
      elements: [],
      pages: [
        {
          id: "page-home",
          name: "Home",
          slug: "/",
          isHome: true,
          elements: [
            {
              id: "h1-home",
              type: "heading",
              content: "Welcome to {{site.name}}",
            },
          ],
        },
      ],
      siteParts: {
        header: {
          isEnabled: true,
          elements: [
            {
              id: "global-nav",
              type: "nav-menu",
              menuItems: [{ id: "m1", label: "Home", url: "/" }],
            },
          ],
        },
        footer: {
          isEnabled: true,
          elements: [
            {
              id: "global-footer-p",
              type: "text",
              content: "© {{current.year}} {{site.name}}",
            },
          ],
        },
        notFound404: {
          isEnabled: true,
          elements: [
            {
              id: "404-container",
              type: "container",
              children: [
                {
                  id: "404-heading",
                  type: "heading",
                  content: "404 - Page Not Found",
                },
                {
                  id: "404-desc",
                  type: "text",
                  content: "The page you are looking for does not exist on {{site.name}}.",
                },
              ],
            },
          ],
        },
        archive: {
          isEnabled: true,
          elements: [
            {
              id: "archive-container",
              type: "container",
              children: [
                {
                  id: "archive-heading",
                  type: "heading",
                  content: "Blog & Article Archive",
                },
                {
                  id: "archive-filter",
                  type: "taxonomy-filter",
                  taxonomyType: "category",
                },
              ],
            },
          ],
        },
        searchResults: {
          isEnabled: true,
          elements: [
            {
              id: "search-results-container",
              type: "container",
              children: [
                {
                  id: "search-results-heading",
                  type: "heading",
                  content: 'Search Results for "{{request.q}}"',
                },
              ],
            },
          ],
        },
      },
    };

    const compiledBundle = compileCanonicalToStaticBundle(
      "test-batch1-site",
      1,
      mockWorkingSnapshot
    );

    // Check bundle outputs 404.html
    const has404 = compiledBundle.files.some((f) => f.path === "404.html");
    assert(has404, "Static compiler emits 404.html when notFound404 sitePart is enabled");

    const file404 = compiledBundle.files.find((f) => f.path === "404.html");
    if (file404) {
      assert(
        file404.content.includes("404 - Page Not Found"),
        "404.html contains rendered 404 heading"
      );
      assert(
        file404.content.includes("ForgeStudio Enterprise"),
        "404.html resolves {{site.name}} token"
      );
    }

    // Check bundle outputs archive.html
    const hasArchive = compiledBundle.files.some((f) => f.path === "archive.html");
    assert(hasArchive, "Static compiler emits archive.html when archive sitePart is enabled");

    const fileArchive = compiledBundle.files.find((f) => f.path === "archive.html");
    if (fileArchive) {
      assert(
        fileArchive.content.includes("Blog & Article Archive") || fileArchive.content.includes("Blog &amp; Article Archive"),
        "archive.html contains rendered archive heading",
        fileArchive.content
      );
      assert(
        fileArchive.content.includes("fs-taxonomy-filter"),
        "archive.html contains rendered taxonomy filter"
      );
    }

    // Check bundle outputs search.html
    const hasSearch = compiledBundle.files.some((f) => f.path === "search.html");
    assert(hasSearch, "Static compiler emits search.html when searchResults sitePart is enabled");

    const fileSearch = compiledBundle.files.find((f) => f.path === "search.html");
    if (fileSearch) {
      assert(
        fileSearch.content.includes("Search Results"),
        "search.html contains rendered search results heading"
      );
    }

    // -------------------------------------------------------------------------
    // 4. Display Conditions Logic (F-244, F-245)
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Theme Location & Display Conditions Validation (F-244, F-245) ---");

    const searchRule = {
      id: "rule-search",
      type: "INCLUDE" as const,
      condition: "SEARCH_RESULTS",
    };
    const searchMatch = matchesThemeCondition([searchRule], { isSearch: true });
    assert(searchMatch, "SEARCH_RESULTS condition matches when isSearch is true");

    const searchMismatch = matchesThemeCondition([searchRule], { isSearch: false, pageId: "p1" });
    assert(!searchMismatch, "SEARCH_RESULTS condition does not match general page");

    const notFoundRule = {
      id: "rule-404",
      type: "INCLUDE" as const,
      condition: "404",
    };
    const notFoundMatch = matchesThemeCondition([notFoundRule], { is404: true });
    assert(notFoundMatch, "404 condition matches when is404 is true");

  } catch (err: any) {
    console.error("Test execution encountered an error:", err);
    failed++;
  }

  console.log("\n=================================================");
  console.log(`MODULE 11 BATCH 1 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runBatch1Tests();
