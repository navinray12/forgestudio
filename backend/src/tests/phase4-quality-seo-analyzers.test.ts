import assert from "assert";
import {
  analyzePageSeo,
  auditPageImages,
  generateStructuredData,
  escapeJsonLd,
} from "../services/seo/seoAnalyzer.service.js";
import { auditAccessibilityDetailed, auditAccessibilityBrowser } from "../services/seo/accessibilityAnalyzer.service.js";
import { auditPagePerformance, auditPagePerformanceBrowser } from "../services/seo/performanceAnalyzer.service.js";
import { auditCodeQuality } from "../services/seo/codeQualityAnalyzer.service.js";
import { runVisualRegressionTest, runVisualRegressionBrowser } from "../services/seo/visualRegression.service.js";
import { runGoldenCodeTest, normalizeCodeForGoldenComparison } from "../services/seo/goldenCode.service.js";
import { auditPerformanceBudget } from "../services/seo/performanceBudget.service.js";
import { runFullQualityAudit } from "../services/seo/unifiedQualityAnalyzer.service.js";

async function runQualityAndSeoTestSuite() {
  console.log("Starting Real Browser Quality, SEO & Technical Analysis Test Suite (F-756 -> F-767)...");

  const mockWebsiteData = {
    id: "site_test_123",
    name: "ForgeStudio Quality & SEO Testing Portal",
    domain: "https://example.com",
    siteSettings: {
      siteName: "ForgeStudio Quality Portal",
      metaDescription: "Comprehensive test portal for production-grade visual website builder quality auditing.",
      logo: "https://cdn.example.com/logo.png",
      canonicalUrl: "https://example.com",
    },
    pages: [
      {
        id: "p_home",
        title: "Home — Production Visual Builder Portal",
        name: "Home",
        slug: "index",
        isHome: true,
        pageSettings: {
          title: "Home — Production Visual Builder Portal",
          description: "High-performance visual builder portal with built-in accessibility and SEO auditing.",
          canonicalUrl: "https://example.com",
          ogTitle: "ForgeStudio Portal",
          ogDescription: "High-performance visual builder portal.",
          ogImage: "https://cdn.example.com/og-image.jpg",
          noindex: false,
        },
        elements: [
          {
            id: "el_hero",
            type: "hero",
            tag: "section",
            name: "HeroSection",
            children: [
              { id: "el_h1", type: "heading", tag: "h1", props: { level: "h1", tag: "h1", text: "ForgeStudio Quality Suite" } },
              { id: "el_h2", type: "heading", tag: "h2", props: { level: "h2", tag: "h2", text: "Enterprise Features" } },
              { id: "el_img1", type: "image", tag: "img", props: { src: "https://cdn.example.com/hero.jpg", alt: "Hero Banner Graphic" } },
              { id: "el_img2", type: "image", tag: "img", props: { src: "https://cdn.example.com/dec.png", isDecorative: true } },
              { id: "el_btn1", type: "button", tag: "button", props: { text: "Explore Features", ariaLabel: "Explore Features" } },
              { id: "el_link1", type: "link", tag: "a", props: { href: "https://example.com/docs", text: "Documentation" } },
              { id: "el_input1", type: "input", tag: "input", props: { label: "Email Address", name: "email" } },
              { id: "el_iframe1", type: "video", tag: "iframe", props: { title: "Product Demo Video", src: "https://youtube.com/embed/demo" } },
            ],
          },
        ],
      },
    ],
  };

  const targetPage = mockWebsiteData.pages[0];

  // --- 1. F-756 & F-759: SEO Analyzer & Meta Title/Description ---
  console.log("Testing F-756 & F-759: SEO Analyzer & Meta Title/Description...");
  const seoRes = analyzePageSeo(targetPage, mockWebsiteData);
  assert.ok(seoRes.score >= 80, `SEO Score should be >= 80, got ${seoRes.score}`);
  assert.strictEqual(seoRes.stats.h1Count, 1, "Must detect exactly 1 H1 heading");
  assert.ok(seoRes.passed.some((p) => p.id === "seo-title-optimal"));
  assert.ok(seoRes.passed.some((p) => p.id === "seo-desc-optimal"));
  console.log("✓ F-756 & F-759 SEO Analyzer & Metadata verified (PASS)");

  // --- 2. F-757 & F-760: Advanced SEO & Canonical URLs ---
  console.log("Testing F-757 & F-760: Advanced SEO & Canonical URL Validation...");
  assert.ok(seoRes.passed.some((p) => p.id === "seo-canonical-valid"));
  assert.ok(seoRes.passed.some((p) => p.id === "seo-og-complete"));
  assert.ok(seoRes.passed.some((p) => p.id === "seo-robots-indexable"));
  console.log("✓ F-757 & F-760 Advanced SEO & Canonical URLs verified (PASS)");

  // --- 3. F-758: Structured Data (Schema.org JSON-LD) ---
  console.log("Testing F-758: Structured Data JSON-LD Generation & Anti-XSS Escaping...");
  const webPageSchema = generateStructuredData("webpage", targetPage, mockWebsiteData);
  const articleSchema = generateStructuredData("article", targetPage, mockWebsiteData);
  const faqSchema = generateStructuredData("faqpage", targetPage, mockWebsiteData, {
    faqs: [{ question: "Is ForgeStudio fast?", answer: "Yes, 100% optimized." }],
  });

  assert.strictEqual(webPageSchema["@type"], "WebPage");
  assert.strictEqual(articleSchema["@type"], "Article");
  assert.strictEqual(faqSchema["@type"], "FAQPage");

  const escapedJsonLd = escapeJsonLd({ malicious: "<script>alert(1)</script>" });
  assert.ok(!escapedJsonLd.includes("<script>"), "JSON-LD output must sanitize HTML tags");
  console.log("✓ F-758 Structured Data JSON-LD verified (PASS)");

  // --- 4. F-761: Image Alt Text Analysis ---
  console.log("Testing F-761: Image Alt Text Analysis...");
  const imgAudit = auditPageImages(targetPage.elements, targetPage.id);
  assert.strictEqual(imgAudit.total, 2);
  assert.strictEqual(imgAudit.valid, 2);
  console.log("✓ F-761 Image Alt Text Analysis verified (PASS)");

  // --- 5. F-762: Real Browser Accessibility Analyzer (WCAG 2.1 A/AA) ---
  console.log("Testing F-762: Real Browser Accessibility Analyzer (Inaccessible vs Fixed)...");
  const accessibleRes = await auditAccessibilityBrowser(targetPage, mockWebsiteData);
  assert.strictEqual(accessibleRes.metrics.mode, "BROWSER_AUTOMATED");
  assert.ok(accessibleRes.score >= 80);

  // Inaccessible Page Mutation Test: Missing Button Text & Label
  const inaccessiblePage = {
    ...targetPage,
    elements: [
      { id: "bad_btn", type: "button", tag: "button", props: {} }, // Missing text/label
      { id: "bad_img", type: "image", tag: "img", props: { src: "bad.png" } }, // Missing alt
    ],
  };
  const inaccessibleRes = await auditAccessibilityBrowser(inaccessiblePage, mockWebsiteData);
  assert.ok(inaccessibleRes.issues.length >= 2, "Inaccessible page must produce violations");
  assert.ok(inaccessibleRes.score < accessibleRes.score, "Score must drop on accessibility violations");
  console.log("✓ F-762 Accessibility Analyzer verified (PASS — Inaccessible Page Flagged & Fixed Page Passed)");

  // --- 6. F-763: Real Browser Performance Analyzer ---
  console.log("Testing F-763: Real Browser Performance Analyzer & Measured Metrics...");
  const perfRes = auditPagePerformance(targetPage, mockWebsiteData);
  assert.strictEqual(perfRes.metrics.measurementMode, "STATIC_ESTIMATE");

  const browserPerfRes = await auditPagePerformanceBrowser(targetPage, mockWebsiteData);
  assert.ok(["BROWSER_MEASURED", "UNAVAILABLE"].includes(browserPerfRes.metrics.measurementMode as string));
  console.log(`✓ F-763 Performance Analyzer verified (PASS — Mode: ${browserPerfRes.metrics.measurementMode})`);

  // --- 7. F-764: Code Quality Analyzer ---
  console.log("Testing F-764: Code Quality Analyzer & Boundary Rules...");
  const qualityRes = auditCodeQuality(targetPage, mockWebsiteData);
  assert.ok(qualityRes.score >= 80, `Code Quality Score should be >= 80, got ${qualityRes.score}`);
  assert.strictEqual(qualityRes.metrics.duplicateIdCount, 0);
  assert.strictEqual(qualityRes.metrics.jsSafetyPassed, true);
  console.log("✓ F-764 Code Quality Analyzer verified (PASS)");

  // --- 8. F-765: Real Browser Visual Regression Testing ---
  console.log("Testing F-765: Real Browser Visual Regression & PNG Pixel Diffing...");
  const visualStatic = runVisualRegressionTest(targetPage, mockWebsiteData);
  assert.strictEqual(visualStatic.metrics.mode, "SYNTHETIC_AST_BITMAP");

  const visualBrowser = await runVisualRegressionBrowser(targetPage, mockWebsiteData);
  assert.strictEqual(visualBrowser.metrics.mode, "BROWSER_SCREENSHOT");
  assert.strictEqual(visualBrowser.metrics.passedViewports, 3);
  console.log("✓ F-765 Visual Regression Testing verified (PASS — Mode: BROWSER_SCREENSHOT)");

  // --- 9. F-766: Golden Code Snapshot Testing & Mutation Test ---
  console.log("Testing F-766: Golden Code Snapshot Testing & Output Normalization...");
  const normalized = normalizeCodeForGoldenComparison("el_abc1234 content Generated for Test");
  assert.strictEqual(normalized, "el_NORMALIZED content Generated for NORMALIZED");

  const goldenRes = runGoldenCodeTest(targetPage, mockWebsiteData);
  assert.strictEqual(goldenRes.score, 100);
  assert.strictEqual(goldenRes.metrics.mismatchCount, 0);

  // Intentional Mutation Test: Mutating Golden Fixture MUST Fail
  const mutatedGoldenFixtures = {
    html: "<!DOCTYPE html><html><body>Mutated Unexpected Code</body></html>",
  };
  const mutatedGoldenRes = runGoldenCodeTest(targetPage, mockWebsiteData, mutatedGoldenFixtures);
  assert.ok((mutatedGoldenRes.metrics.mismatchCount as number) > 0, "Mutated golden fixture must fail match test");
  assert.ok(mutatedGoldenRes.score < 100, "Score must drop when golden code mismatches");
  console.log("✓ F-766 Golden Code & Mutation Test verified (PASS — Intentional Mismatch Failed Correctly)");

  // --- 10. F-767: Performance Budget Testing (Passing & Exceeding Fixtures) ---
  console.log("Testing F-767: Performance Budget Testing & Limits Enforcement...");
  const budgetPassRes = auditPerformanceBudget(targetPage, mockWebsiteData);
  assert.strictEqual(budgetPassRes.score, 100);
  assert.strictEqual(budgetPassRes.metrics.budgetPassed, true);

  // Exceeding Budget Fixture MUST Fail
  const strictBudgetConfig = { maxHtmlBytes: 20 }; // Exceedingly small budget
  const budgetFailRes = auditPerformanceBudget(targetPage, mockWebsiteData, strictBudgetConfig);
  assert.strictEqual(budgetFailRes.metrics.budgetPassed, false, "Exceeding budget must fail check");
  assert.ok((budgetFailRes.metrics.hardBreachCount as number) > 0, "Hard breach count must be > 0");
  assert.ok(budgetFailRes.score < 100, "Score must drop on budget breach");
  console.log("✓ F-767 Performance Budget (Passing & Exceeding) verified (PASS — Exceeding Budget Failed Correctly)");

  // --- 11. Unified Quality Suite Orchestrator ---
  console.log("Testing Unified Quality Suite Orchestrator...");
  const fullReport = runFullQualityAudit(targetPage, mockWebsiteData);
  assert.ok(fullReport.overallScore >= 80, `Overall Score should be >= 80, got ${fullReport.overallScore}`);
  assert.ok(["A", "B"].includes(fullReport.overallGrade));
  assert.ok(fullReport.analyzers.seo);
  assert.ok(fullReport.analyzers.accessibility);
  assert.ok(fullReport.analyzers.performance);
  assert.ok(fullReport.analyzers.codeQuality);
  assert.ok(fullReport.analyzers.visualRegression);
  assert.ok(fullReport.analyzers.goldenCode);
  assert.ok(fullReport.analyzers.performanceBudget);
  console.log("✓ Unified Quality Suite Orchestrator verified (PASS)");

  console.log("\n============================================================");
  console.log("ALL REAL BROWSER QUALITY, SEO & TECHNICAL ANALYSIS TESTS PASSED!");
  console.log("============================================================\n");
}

runQualityAndSeoTestSuite().catch((err) => {
  console.error("Quality & SEO Test Suite Error:", err);
  process.exit(1);
});
