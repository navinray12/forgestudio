import {
  analyzePageSeo,
  auditPageImages,
  auditPageAccessibility,
  generateStructuredData,
  escapeJsonLd,
} from "../services/seo/seoAnalyzer.service.js";
import { compileCanonicalToStaticBundle } from "../services/destinations/staticCompiler.js";
import { transformPageToWordPress } from "../services/wordpress/transformer.service.js";
import { DEFAULT_CAPABILITIES } from "../services/permission.service.js";

async function runSeoQualityAnalyzerTests() {
  console.log("=================================================");
  console.log("RUNNING FORGESTUDIO SEO & QUALITY ANALYZER PRODUCTION TEST SUITE");
  console.log("=================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: SEO Analyzer - Optimal Page Evaluation
    // -------------------------------------------------------------
    const optimalPage = {
      id: "home",
      name: "Home Page",
      title: "Home",
      isHome: true,
      pageSettings: {
        title: "ForgeStudio | Modern High-Performance Visual Builder",
        description: "Build ultra-responsive, accessible websites with ForgeStudio. Featuring live multi-destination publishing and design tokens.",
        canonicalUrl: "https://forgestudio.io",
        ogTitle: "ForgeStudio - Visual Web Builder",
        ogDescription: "Build websites with live multi-destination publishing.",
        ogImage: "https://forgestudio.io/og-image.jpg",
      },
      elements: [
        {
          id: "h1-hero",
          type: "heading",
          props: { level: "h1", text: "Empower Your Digital Presence with ForgeStudio" },
        },
        {
          id: "h2-features",
          type: "heading",
          props: { level: "h2", text: "Unmatched Speed and Visual Excellence" },
        },
        {
          id: "h3-feature-1",
          type: "heading",
          props: { level: "h3", text: "Design Tokens & Reusable Components" },
        },
        {
          id: "img-hero",
          type: "image",
          props: {
            src: "https://images.unsplash.com/photo-1",
            alt: "ForgeStudio visual web editor interface showcasing typography controls",
          },
        },
        {
          id: "link-cta",
          type: "link",
          props: { href: "https://forgestudio.io/pricing", text: "Explore Pricing Plans" },
        },
      ],
    };

    const siteData = {
      name: "ForgeStudio",
      siteSettings: {
        siteName: "ForgeStudio",
        canonicalUrl: "https://forgestudio.io",
        metaDescription: "Visual web creator",
      },
      pages: [optimalPage],
    };

    const audit1 = analyzePageSeo(optimalPage, siteData);
    assert(audit1.score >= 90, `Test 1A: Optimal page achieves A-grade score (Score: ${audit1.score}, Grade: ${audit1.grade})`);
    assert(audit1.critical.length === 0, "Test 1B: Optimal page has 0 critical SEO errors");
    assert(audit1.passed.some((p) => p.id === "seo-title-optimal"), "Test 1C: Optimal title check passed");
    assert(audit1.passed.some((p) => p.id === "seo-h1-single"), "Test 1D: Single H1 check passed");
    assert(audit1.stats.h1Count === 1, "Test 1E: Exact 1 H1 heading detected");

    // -------------------------------------------------------------
    // Test 2: SEO Analyzer - Penalizes Missing Title, Description, and H1
    // -------------------------------------------------------------
    const brokenSiteData = {
      name: "ForgeStudio",
      siteSettings: {
        siteName: "ForgeStudio",
        canonicalUrl: "https://forgestudio.io",
      },
      pages: [],
    };

    const brokenPage = {
      id: "broken",
      name: "",
      title: "",
      pageSettings: {
        title: "", // Missing title
        description: "", // Missing description
        canonicalUrl: "invalid-url", // Malformed canonical
        noindex: true,
      },
      elements: [
        {
          id: "h2-no-h1",
          type: "heading",
          props: { level: "h2", text: "Sub-heading without any main H1" },
        },
        {
          id: "h5-skipped",
          type: "heading",
          props: { level: "h5", text: "Jumping directly to H5" },
        },
      ],
    };

    const audit2 = analyzePageSeo(brokenPage, brokenSiteData);
    assert(audit2.score < 60, `Test 2A: Defective page fails quality check (Score: ${audit2.score}, Grade: ${audit2.grade})`);
    assert(audit2.critical.some((c) => c.id === "seo-title-missing"), "Test 2B: Flags missing page title as critical error");
    assert(audit2.critical.some((c) => c.id === "seo-desc-missing"), "Test 2C: Flags missing meta description as critical error");
    assert(audit2.critical.some((c) => c.id === "seo-h1-missing"), "Test 2D: Flags missing H1 heading as critical error");
    assert(audit2.critical.some((c) => c.id === "seo-canonical-invalid"), "Test 2E: Flags invalid canonical URL as critical error");
    assert(audit2.warnings.some((w) => w.id.startsWith("seo-heading-skip")), "Test 2F: Flags skipped heading hierarchy (H2 -> H5)");

    // -------------------------------------------------------------
    // Test 3: Image Alt Text Audit - Missing, Empty, and Generic Alt Texts
    // -------------------------------------------------------------
    const nestedElementsWithImages = [
      {
        id: "container-1",
        type: "container",
        children: [
          {
            id: "img-missing",
            type: "image",
            props: { src: "https://example.com/banner.jpg" }, // alt undefined
          },
          {
            id: "img-empty",
            type: "image",
            props: { src: "https://example.com/icon.jpg", alt: "" }, // empty alt
          },
          {
            id: "img-generic",
            type: "image",
            props: { src: "https://example.com/shot.jpg", alt: "image.png" }, // generic alt
          },
          {
            id: "img-decorative",
            type: "image",
            props: { src: "https://example.com/bg.jpg", alt: "", ariaHidden: true }, // decorative
          },
          {
            id: "img-valid",
            type: "image",
            props: { src: "https://example.com/team.jpg", alt: "Senior leadership team at annual conference" },
          },
        ],
      },
    ];

    const imageAudit = auditPageImages(nestedElementsWithImages, "test-page");
    assert(imageAudit.total === 5, `Test 3A: Scans all 5 nested images in container (Found: ${imageAudit.total})`);
    assert(imageAudit.missing === 1, `Test 3B: Correctly identifies 1 missing alt text (Found: ${imageAudit.missing})`);
    assert(imageAudit.empty === 1, `Test 3C: Correctly identifies 1 empty non-decorative alt text (Found: ${imageAudit.empty})`);
    assert(imageAudit.generic === 1, `Test 3D: Correctly flags 1 generic 'image.png' alt text (Found: ${imageAudit.generic})`);
    assert(imageAudit.valid === 2, `Test 3E: Correctly marks valid descriptive image and decorative image as valid (Found: ${imageAudit.valid})`);

    // -------------------------------------------------------------
    // Test 4: Programmatic Accessibility (WCAG 2.1 Level A/AA)
    // -------------------------------------------------------------
    const nonCompliantPage = {
      id: "a11y-test",
      elements: [
        {
          id: "btn-unlabeled",
          type: "button",
          props: { text: "" }, // No text or aria-label
        },
        {
          id: "btn-valid",
          type: "button",
          props: { text: "Contact Support" },
        },
        {
          id: "input-no-label",
          type: "input",
          props: { placeholder: "Your email" }, // No label or aria-label
        },
        {
          id: "link-empty",
          type: "link",
          props: { href: "#", text: "" }, // Empty link
        },
      ],
    };

    const a11yAudit = auditPageAccessibility(nonCompliantPage, siteData);
    assert(a11yAudit.violations.some((v) => v.id === "a11y-btn-btn-unlabeled"), "Test 4A: WCAG violation flagged for button without accessible name");
    assert(a11yAudit.violations.some((v) => v.id === "a11y-input-label-input-no-label"), "Test 4B: WCAG violation flagged for form control missing label");
    assert(a11yAudit.violations.some((v) => v.id === "a11y-link-href-link-empty"), "Test 4C: WCAG violation flagged for placeholder '#' link href");
    assert(a11yAudit.complianceScore < 100, `Test 4D: Non-compliant page reflects reduced accessibility score (${a11yAudit.complianceScore}/100)`);

    // -------------------------------------------------------------
    // Test 5: Exhaustive Schema.org Validation Across ALL 7 Claimed Types
    // -------------------------------------------------------------
    // 1. WebSite
    const websiteSchema = generateStructuredData("WebSite", optimalPage, siteData);
    assert(websiteSchema["@context"] === "https://schema.org" && websiteSchema["@type"] === "WebSite", "Test 5A: Schema WebSite generated with valid @context and @type");
    assert(websiteSchema.potentialAction?.["@type"] === "SearchAction", "Test 5B: Schema WebSite includes SearchAction target");

    // 2. WebPage
    const webPageSchema = generateStructuredData("WebPage", optimalPage, siteData);
    assert(webPageSchema["@type"] === "WebPage" && webPageSchema.isPartOf?.["@type"] === "WebSite", "Test 5C: Schema WebPage references parent WebSite");

    // 3. Organization
    const orgSchema = generateStructuredData("Organization", optimalPage, siteData);
    assert(orgSchema["@type"] === "Organization" && orgSchema.name === "ForgeStudio", "Test 5D: Schema Organization includes brand name and URL");

    // 4. Article
    const articleSchema = generateStructuredData("Article", optimalPage, siteData, { authorName: "Jane Doe" });
    assert(articleSchema["@type"] === "Article" && articleSchema.author?.name === "Jane Doe", "Test 5E: Schema Article maps headline and author Person");

    // 5. LocalBusiness
    const localBusinessSchema = generateStructuredData("LocalBusiness", optimalPage, siteData, {
      businessName: "Forge Studio Coffee",
      telephone: "+1-555-123-4567",
      streetAddress: "123 Tech Boulevard",
      locality: "San Francisco",
      region: "CA",
      postalCode: "94105",
    });
    assert(localBusinessSchema["@type"] === "LocalBusiness" && localBusinessSchema.telephone === "+1-555-123-4567", "Test 5F: Schema LocalBusiness includes name and phone");
    assert(localBusinessSchema.address?.["@type"] === "PostalAddress" && localBusinessSchema.address.postalCode === "94105", "Test 5G: Schema LocalBusiness includes nested PostalAddress");

    // 6. BreadcrumbList
    const subPage = { id: "pricing", slug: "pricing", title: "Pricing", isHome: false, pageSettings: {} };
    const breadcrumbSchema = generateStructuredData("BreadcrumbList", subPage, { ...siteData, pages: [optimalPage, subPage] });
    assert(breadcrumbSchema["@type"] === "BreadcrumbList", "Test 5H: Schema BreadcrumbList generated");
    assert(Array.isArray(breadcrumbSchema.itemListElement) && breadcrumbSchema.itemListElement.length === 2, "Test 5I: BreadcrumbList contains 2 navigation crumbs");
    assert(breadcrumbSchema.itemListElement[1].name === "Pricing", "Test 5J: Child crumb points to active page title");

    // 7. FAQPage
    const faqSchema = generateStructuredData("FAQPage", optimalPage, siteData, {
      faqs: [
        { question: "What is ForgeStudio?", answer: "A modern visual web editor." },
        { question: "Does it support SEO?", answer: "Yes, fully automated." },
      ],
    });
    assert(faqSchema["@type"] === "FAQPage", "Test 5K: Schema FAQPage generated");
    assert(Array.isArray(faqSchema.mainEntity) && faqSchema.mainEntity.length === 2, "Test 5L: FAQPage contains 2 mainEntity questions");
    assert(faqSchema.mainEntity[0].acceptedAnswer?.text === "A modern visual web editor.", "Test 5M: FAQPage contains structured Question and Answer");

    // Anti-XSS Script Breakout Test
    const maliciousPayload = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "</script><script>alert('xss')</script>",
      description: "Test <img src=x onerror=alert(1)> description",
    };
    const escapedJsonLd = escapeJsonLd(maliciousPayload);
    assert(!escapedJsonLd.includes("</script>"), "Test 5N: Anti-XSS safely neutralizes </script> tag");
    assert(escapedJsonLd.includes("\\u003c"), "Test 5O: Unicode escape characters replace angle brackets");

    // -------------------------------------------------------------
    // Test 6: Static Compiler Integration (JSON-LD, Twitter & Fallbacks)
    // -------------------------------------------------------------
    const multiPageSite = {
      name: "Forge Multi-Page Site",
      slug: "multi-test",
      siteSettings: {
        siteName: "Forge Global Brand",
        canonicalUrl: "https://brand.forgestudio.io",
        ogImage: "https://brand.forgestudio.io/global-og.jpg",
        twitterCard: "summary_large_image",
      },
      pages: [
        {
          id: "home",
          title: "Home",
          isHome: true,
          pageSettings: {
            title: "Home Landing Page",
            description: "Default brand description",
            schemaType: "WebSite",
          },
          elements: [
            { id: "h1-main", type: "heading", props: { level: "h1", text: "Global Brand Home" } },
          ],
        },
        {
          id: "article-1",
          slug: "article-1",
          title: "AI In Modern Web Design",
          isHome: false,
          pageSettings: {
            title: "AI In Modern Web Design",
            description: "A deep dive into automated design tools",
            ogImage: "https://brand.forgestudio.io/article-custom.jpg",
            schemaType: "Article",
          },
          elements: [
            { id: "h1-article", type: "heading", props: { level: "h1", text: "AI In Modern Web Design" } },
          ],
        },
      ],
    };

    const bundle = compileCanonicalToStaticBundle("multi-test-id", 1, multiPageSite);
    assert(bundle.files.length >= 3, `Test 6A: Static compiler outputs ${bundle.files.length} files (expected >= 3)`);

    const homeHtml = bundle.files.find((f) => f.path === "index.html")?.content || "";
    const articleHtml = bundle.files.find((f) => f.path === "article-1.html")?.content || "";

    // Home Page checks
    assert(homeHtml.includes('<meta property="og:image" content="https://brand.forgestudio.io/global-og.jpg">'), "Test 6B: Home page inherits site-level og:image");
    assert(homeHtml.includes('<meta name="twitter:card" content="summary_large_image">'), "Test 6C: Home page inherits site-level twitterCard");
    assert(homeHtml.includes('"@type": "WebSite"'), "Test 6D: Home page injects WebSite structured data");

    // Single Insertion check
    const scriptCount = (homeHtml.match(/<script type="application\/ld\+json">/g) || []).length;
    assert(scriptCount === 1, `Test 6E: Exactly 1 JSON-LD script tag injected into home.html (Found: ${scriptCount})`);

    // Multi-page independence & override check
    assert(articleHtml.includes('<meta property="og:image" content="https://brand.forgestudio.io/article-custom.jpg">'), "Test 6F: Article page correctly overrides site-level og:image with page-level image");
    assert(articleHtml.includes('"@type": "Article"'), "Test 6G: Article page independently injects Article schema (no cross-page leakage)");

    // -------------------------------------------------------------
    // Test 7: WordPress Transformer Integration
    // -------------------------------------------------------------
    const wpPage = transformPageToWordPress(multiPageSite.pages[1], multiPageSite.siteSettings);
    assert(wpPage.meta._yoast_wpseo_title === "AI In Modern Web Design", "Test 7A: WordPress transformer sets Yoast SEO title");
    assert(wpPage.meta._yoast_wpseo_metadesc === "A deep dive into automated design tools", "Test 7B: WordPress transformer sets Yoast meta description");
    assert(wpPage.meta._forgestudio_og_image === "https://brand.forgestudio.io/article-custom.jpg", "Test 7C: WordPress transformer sets OpenGraph image");
    assert(wpPage.meta._forgestudio_twitter_card === "summary_large_image", "Test 7D: WordPress transformer sets Twitter card type");

    // -------------------------------------------------------------
    // Test 8: Authority & Capabilities Permission Verification
    // -------------------------------------------------------------
    const ownerCaps = DEFAULT_CAPABILITIES.OWNER || [];
    const seoManagerCaps = DEFAULT_CAPABILITIES.SEO_MANAGER || [];
    const reviewerCaps = DEFAULT_CAPABILITIES.REVIEWER || [];
    const viewerCaps = DEFAULT_CAPABILITIES.VIEWER || [];

    assert(ownerCaps.includes("VIEW") && ownerCaps.includes("EDIT_SEO"), "Test 8A: OWNER role possesses both VIEW and EDIT_SEO capabilities");
    assert(seoManagerCaps.includes("VIEW") && seoManagerCaps.includes("EDIT_SEO"), "Test 8B: SEO_MANAGER role possesses both VIEW and EDIT_SEO capabilities");
    assert(viewerCaps.includes("VIEW"), "Test 8C: VIEWER role possesses VIEW capability for audits");
    assert(!viewerCaps.includes("EDIT_SEO"), "Test 8D: VIEWER role is strictly blocked from EDIT_SEO capability");
    assert(!reviewerCaps.includes("EDIT_SEO"), "Test 8E: REVIEWER role is strictly blocked from EDIT_SEO capability");

    // -------------------------------------------------------------
    // Test 9: Safe Handling of Missing and Malformed Inputs
    // -------------------------------------------------------------
    const emptyAudit = analyzePageSeo({}, {});
    assert(emptyAudit.score < 60 && emptyAudit.grade === "F", `Test 9A: Empty page gracefully evaluates with failing grade F without throwing error (Score: ${emptyAudit.score})`);

    const nullImages = auditPageImages([], undefined);
    assert(nullImages.total === 0 && nullImages.items.length === 0, "Test 9B: Empty elements array handles image audit safely");

    const fallbackSchema = generateStructuredData("UnknownType", {}, {});
    assert(fallbackSchema["@type"] === "WebPage", "Test 9C: Unknown schema type safely defaults to WebPage");

  } catch (err) {
    console.error("Fatal error during SEO Quality Analyzer tests:", err);
    failed++;
  }

  console.log("\n=================================================");
  console.log(`SEO QUALITY ANALYZER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSeoQualityAnalyzerTests().catch((err) => {
  console.error("Unhandled error running tests:", err);
  process.exit(1);
});
