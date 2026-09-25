/**
 * F-767: Performance Budget Testing Service
 */
import { AnalyzerResult, AnalysisIssue, PerformanceBudgetConfig } from "./analysis.types.js";
import { generateAllCodeOutputs } from "../codeGenerator.service.js";
import { flattenElementTree } from "./seoAnalyzer.service.js";

export const DEFAULT_BUDGET: PerformanceBudgetConfig = {
  maxHtmlBytes: 100 * 1024,   // 100 KB
  maxCssBytes: 150 * 1024,    // 150 KB
  maxJsBytes: 300 * 1024,     // 300 KB
  maxImageBytes: 1024 * 1024, // 1 MB
  maxFontCount: 4,            // 4 Custom Fonts
  maxDomNodes: 1500,          // 1500 DOM Nodes
  maxRequests: 50,            // 50 Network Requests
};

export function auditPerformanceBudget(
  page: any,
  websiteData: any,
  userConfig?: PerformanceBudgetConfig
): AnalyzerResult {
  const config = { ...DEFAULT_BUDGET, ...userConfig };
  const codeRes = generateAllCodeOutputs(websiteData, { scope: "full" });
  const flat = flattenElementTree(page.elements || []);

  const htmlBytes = Buffer.byteLength(codeRes.html, "utf8");
  const cssBytes = Buffer.byteLength(codeRes.css, "utf8");
  const jsBytes = Buffer.byteLength(codeRes.js, "utf8");
  const domNodes = flat.length;
  const fontCount = flat.filter((el) => el.type === "font" || (el.styles && el.styles.fontFamily)).length;
  const imageCount = flat.filter((el) => el.type === "image" || el.tag === "img").length;
  const imageEstBytes = imageCount * 80 * 1024; // 80KB avg per image

  const issues: AnalysisIssue[] = [];
  let penalty = 0;
  let hardBreaches = 0;

  // 1. HTML Budget Check
  if (config.maxHtmlBytes && htmlBytes > config.maxHtmlBytes) {
    hardBreaches++;
    issues.push({
      ruleId: "BUDGET-HTML-BREACH",
      severity: "ERROR",
      category: "PERFORMANCE_BUDGET",
      title: "HTML Size Exceeds Performance Budget",
      message: `HTML size is ${(htmlBytes / 1024).toFixed(1)} KB (Budget: ${(config.maxHtmlBytes / 1024).toFixed(1)} KB).`,
      recommendation: "Reduce inline HTML content depth or optimize repeated list markup.",
    });
    penalty += 25;
  }

  // 2. CSS Budget Check
  if (config.maxCssBytes && cssBytes > config.maxCssBytes) {
    hardBreaches++;
    issues.push({
      ruleId: "BUDGET-CSS-BREACH",
      severity: "ERROR",
      category: "PERFORMANCE_BUDGET",
      title: "CSS Size Exceeds Performance Budget",
      message: `CSS size is ${(cssBytes / 1024).toFixed(1)} KB (Budget: ${(config.maxCssBytes / 1024).toFixed(1)} KB).`,
      recommendation: "Purge unused CSS classes or optimize inline style definitions.",
    });
    penalty += 25;
  }

  // 3. JS Budget Check
  if (config.maxJsBytes && jsBytes > config.maxJsBytes) {
    hardBreaches++;
    issues.push({
      ruleId: "BUDGET-JS-BREACH",
      severity: "ERROR",
      category: "PERFORMANCE_BUDGET",
      title: "JS Size Exceeds Performance Budget",
      message: `JS size is ${(jsBytes / 1024).toFixed(1)} KB (Budget: ${(config.maxJsBytes / 1024).toFixed(1)} KB).`,
      recommendation: "Split interactive components into client bundles or defer non-critical scripts.",
    });
    penalty += 25;
  }

  // 4. DOM Nodes Budget Check
  if (config.maxDomNodes && domNodes > config.maxDomNodes) {
    hardBreaches++;
    issues.push({
      ruleId: "BUDGET-DOM-BREACH",
      severity: "ERROR",
      category: "PERFORMANCE_BUDGET",
      title: "DOM Node Count Exceeds Performance Budget",
      message: `Page contains ${domNodes} DOM nodes (Budget: ${config.maxDomNodes} nodes).`,
      recommendation: "Unwrap redundant div wrappers to decrease DOM node count.",
    });
    penalty += 20;
  }

  // 5. Font Count Budget Check
  if (config.maxFontCount && fontCount > config.maxFontCount) {
    issues.push({
      ruleId: "BUDGET-FONT-BREACH",
      severity: "WARNING",
      category: "PERFORMANCE_BUDGET",
      title: "Font Family Count Exceeds Recommended Limit",
      message: `Page uses ${fontCount} distinct font families (Budget: ${config.maxFontCount}).`,
      recommendation: "Consolidate typography to 2-3 web fonts for better rendering performance.",
    });
    penalty += 10;
  }

  const score = Math.max(0, 100 - penalty);
  let grade: "A" | "B" | "C" | "D" | "F" = "F";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";

  return {
    analyzer: "PerformanceBudgetAnalyzer",
    version: "1.0.0",
    score,
    grade,
    issues,
    metrics: {
      htmlBytes,
      cssBytes,
      jsBytes,
      domNodes,
      fontCount,
      imageEstBytes,
      hardBreachCount: hardBreaches,
      budgetPassed: hardBreaches === 0,
    },
    generatedAt: new Date().toISOString(),
  };
}
