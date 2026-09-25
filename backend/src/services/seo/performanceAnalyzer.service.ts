/**
 * F-763: Performance Analyzer Service
 */
import { AnalyzerResult, AnalysisIssue } from "./analysis.types.js";
import { flattenElementTree } from "./seoAnalyzer.service.js";
import { generateAllCodeOutputs } from "../codeGenerator.service.js";

export function auditPagePerformance(page: any, websiteData: any): AnalyzerResult {
  const elements = page.elements || [];
  const flat = flattenElementTree(elements);

  const codeRes = generateAllCodeOutputs(websiteData, { scope: "full" });
  const htmlSize = Buffer.byteLength(codeRes.html, "utf8");
  const cssSize = Buffer.byteLength(codeRes.css, "utf8");
  const jsSize = Buffer.byteLength(codeRes.js, "utf8");

  const images = flat.filter((el) => el.type === "image" || el.tag === "img");
  const fonts = flat.filter((el) => el.type === "font" || (el.styles && el.styles.fontFamily));
  const lazyImages = images.filter((el) => el.attributes?.loading === "lazy" || el.props?.loading === "lazy");

  const domNodeCount = flat.length;
  const inlineStylesCount = flat.filter((el) => el.styles && Object.keys(el.styles).length > 0).length;

  // Web Vitals Estimation based on AST complexity (STATIC_ESTIMATE)
  const lcpStaticEstimateMs = Math.round(400 + (images.length * 150) + (htmlSize / 100));
  const clsStaticEstimateScore = Number((Math.min(0.25, (images.length - lazyImages.length) * 0.03)).toFixed(3));
  const inpStaticEstimateMs = Math.round(50 + (flat.length * 1.5));

  const metrics: Record<string, number | string | boolean> = {
    measurementMode: "STATIC_ESTIMATE",
    htmlSizeBytes: htmlSize,
    cssSizeBytes: cssSize,
    jsSizeBytes: jsSize,
    totalNodeCount: domNodeCount,
    imageCount: images.length,
    lazyImageCount: lazyImages.length,
    fontCount: fonts.length,
    inlineStylesCount,
    lcpStaticEstimateMs,
    clsStaticEstimateScore,
    inpStaticEstimateMs,
  };

  const issues: AnalysisIssue[] = [];
  let penalty = 0;

  // 1. Heavy HTML Document Payload (> 100 KB)
  if (htmlSize > 102400) {
    issues.push({
      ruleId: "PERF-HTML-SIZE",
      severity: "WARNING",
      category: "PERFORMANCE",
      title: "Heavy HTML Document Payload",
      message: `Generated HTML payload is ${(htmlSize / 1024).toFixed(1)} KB, exceeding 100 KB.`,
      recommendation: "Simplify DOM structure or paginate large repeating content lists.",
    });
    penalty += 15;
  }

  // 2. Excessive DOM Node Depth / Count (> 800 nodes)
  if (domNodeCount > 800) {
    issues.push({
      ruleId: "PERF-DOM-NODES",
      severity: "WARNING",
      category: "PERFORMANCE",
      title: "Excessive DOM Node Count",
      message: `Page contains ${domNodeCount} DOM nodes, which may slow browser layout rendering.`,
      recommendation: "Unwrap redundant wrapper containers and flatten component hierarchy.",
    });
    penalty += 15;
  }

  // 3. Unoptimized Image Lazy Loading Coverage
  if (images.length > 3 && lazyImages.length < Math.floor(images.length * 0.5)) {
    issues.push({
      ruleId: "PERF-IMAGE-LAZY",
      severity: "WARNING",
      category: "PERFORMANCE",
      title: "Low Image Lazy-Loading Coverage",
      message: `Only ${lazyImages.length} of ${images.length} images use loading='lazy'.`,
      recommendation: "Enable native lazy loading for below-the-fold image elements.",
    });
    penalty += 10;
  }

  // 4. Overuse of Inline CSS Declarations
  if (inlineStylesCount > 50) {
    issues.push({
      ruleId: "PERF-INLINE-STYLES",
      severity: "INFO",
      category: "PERFORMANCE",
      title: "High Inline Style Density",
      message: `Found ${inlineStylesCount} elements with inline styles instead of reusable CSS classes.`,
      recommendation: "Extract repetitive inline styles into CSS design tokens or global classes.",
    });
    penalty += 5;
  }

  // 5. Estimated LCP Threshold Check
  if (lcpEstMs > 2500) {
    issues.push({
      ruleId: "PERF-LCP-HIGH",
      severity: "WARNING",
      category: "PERFORMANCE",
      title: "High Estimated Largest Contentful Paint (LCP)",
      message: `Estimated LCP is ${lcpEstMs} ms (Good threshold is <= 2500 ms).`,
      recommendation: "Optimize hero media assets and eliminate render-blocking CSS/JS.",
    });
    penalty += 15;
  }

  const score = Math.max(0, 100 - penalty);
  let grade: "A" | "B" | "C" | "D" | "F" = "F";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";

  return {
    analyzer: "PerformanceAnalyzer",
    version: "1.0.0",
    score,
    grade,
    issues,
    metrics,
    generatedAt: new Date().toISOString(),
  };
}

import { measureBrowserPerformance } from "./browserRunner.service.js";

export async function auditPagePerformanceBrowser(page: any, websiteData: any): Promise<AnalyzerResult> {
  const staticResult = auditPagePerformance(page, websiteData);
  const codeRes = generateAllCodeOutputs(websiteData, { scope: "full" });
  const browserMetrics = await measureBrowserPerformance(codeRes.html);

  const metrics: Record<string, number | string | boolean> = {
    ...staticResult.metrics,
    ...browserMetrics,
  };

  return {
    ...staticResult,
    metrics,
    generatedAt: new Date().toISOString(),
  };
}
