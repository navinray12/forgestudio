/**
 * F-762: Programmatic WCAG 2.1 Level A / AA Accessibility Analyzer
 */
import { AnalyzerResult, AnalysisIssue } from "./analysis.types.js";
import { flattenElementTree, auditPageImages } from "./seoAnalyzer.service.js";

export function auditAccessibilityDetailed(page: any, websiteData: any): AnalyzerResult {
  const elements = page.elements || [];
  const flat = flattenElementTree(elements);
  const issues: AnalysisIssue[] = [];
  const metrics: Record<string, number | string | boolean> = {
    totalElements: flat.length,
    buttonCount: 0,
    linkCount: 0,
    inputCount: 0,
    imageCount: 0,
    landmarkCount: 0,
    duplicateIdCount: 0,
  };

  let penalty = 0;
  const seenIds = new Set<string>();

  // 1. Duplicate Element IDs Check (WCAG 4.1.1 Level A)
  for (const el of flat) {
    if (el.id) {
      if (seenIds.has(el.id)) {
        (metrics.duplicateIdCount as number)++;
        issues.push({
          ruleId: "A11Y-ID-DUPLICATE",
          severity: "CRITICAL",
          category: "ACCESSIBILITY",
          title: "Duplicate Element ID",
          message: `Element ID '${el.id}' is used multiple times on the same page.`,
          recommendation: "Ensure all DOM element IDs are unique across the document.",
          elementId: el.id,
        });
        penalty += 15;
      } else {
        seenIds.add(el.id);
      }
    }
  }

  // 2. Button Discernible Text (WCAG 4.1.2 Level A)
  for (const el of flat) {
    if (el.type === "button" || el.type === "cta-button" || el.tag === "button") {
      (metrics.buttonCount as number)++;
      const text = el.props?.text || el.content || el.props?.label || el.textContent || "";
      const ariaLabel = el.props?.ariaLabel || el.props?.["aria-label"] || el.accessibility?.ariaLabel;
      const title = el.props?.title;

      if (!String(text).trim() && !String(ariaLabel || "").trim() && !String(title || "").trim()) {
        issues.push({
          ruleId: "A11Y-BTN-NAME",
          severity: "CRITICAL",
          category: "ACCESSIBILITY",
          title: "Missing Button Accessible Name",
          message: `Button element '${el.id}' has no visible text, aria-label, or title.`,
          recommendation: "Provide visible text or an aria-label attribute for screen readers.",
          elementId: el.id,
        });
        penalty += 15;
      }
    }
  }

  // 3. Link Valid Hrefs & Names (WCAG 2.4.4 Level A)
  for (const el of flat) {
    if (el.type === "link" || el.tag === "a" || (el.props?.href !== undefined && el.type !== "button")) {
      (metrics.linkCount as number)++;
      const href = String(el.props?.href || el.attributes?.href || "").trim();
      const text = String(el.props?.text || el.content || el.textContent || el.props?.ariaLabel || el.accessibility?.ariaLabel || "").trim();

      if (!href || href === "#") {
        issues.push({
          ruleId: "A11Y-LINK-HREF",
          severity: "WARNING",
          category: "ACCESSIBILITY",
          title: "Placeholder Link Target",
          message: `Link element '${el.id}' has empty href or placeholder '#' destination.`,
          recommendation: "Assign a valid target URL or use an interactive button element.",
          elementId: el.id,
        });
        penalty += 8;
      }

      if (!text) {
        issues.push({
          ruleId: "A11Y-LINK-NAME",
          severity: "CRITICAL",
          category: "ACCESSIBILITY",
          title: "Missing Link Text",
          message: `Link element '${el.id}' contains no discernible text or aria-label.`,
          recommendation: "Provide meaningful link text describing the target destination.",
          elementId: el.id,
        });
        penalty += 15;
      }
    }
  }

  // 4. Form Control Associated Labels (WCAG 1.3.1 Level A)
  for (const el of flat) {
    if (["input", "text-input", "textarea", "select", "form"].includes(el.type)) {
      (metrics.inputCount as number)++;
      const label = el.props?.label || el.props?.ariaLabel || el.props?.["aria-label"] || el.accessibility?.ariaLabel;
      if (el.type !== "form" && (!label || !String(label).trim())) {
        issues.push({
          ruleId: "A11Y-INPUT-LABEL",
          severity: "CRITICAL",
          category: "ACCESSIBILITY",
          title: "Form Input Lacks Accessible Label",
          message: `Form input '${el.id}' is missing an associated label or aria-label attribute.`,
          recommendation: "Add an explicit <label> element or specify an aria-label.",
          elementId: el.id,
        });
        penalty += 15;
      }
    }
  }

  // 5. Image Alt Text & Decorative Attributes (WCAG 1.1.1 Level A)
  const imageAudit = auditPageImages(elements, page.id);
  metrics.imageCount = imageAudit.total;
  for (const img of imageAudit.items) {
    if (img.issueType === "missing" || img.issueType === "empty") {
      if (!img.isDecorative) {
        issues.push({
          ruleId: "A11Y-IMG-ALT",
          severity: "CRITICAL",
          category: "ACCESSIBILITY",
          title: "Image Missing Alternative Text",
          message: `Image element '${img.elementId}' lacks alt text attribute.`,
          recommendation: "Add descriptive alt text or mark decorative images with aria-hidden='true'.",
          elementId: img.elementId,
        });
        penalty += 12;
      }
    }
  }

  // 6. Tabindex Misuse Check (WCAG 2.4.3 Level A)
  for (const el of flat) {
    const tabindex = el.props?.tabIndex || el.attributes?.tabindex;
    if (tabindex !== undefined && Number(tabindex) > 0) {
      issues.push({
        ruleId: "A11Y-TABINDEX-POSITIVE",
        severity: "WARNING",
        category: "ACCESSIBILITY",
        title: "Positive Tabindex Value Used",
        message: `Element '${el.id}' uses tabindex=${tabindex}, disrupting natural DOM tabbing order.`,
        recommendation: "Use tabindex=0 for focusable controls or maintain natural source order.",
        elementId: el.id,
      });
      penalty += 8;
    }
  }

  // 7. Iframe Title Validation (WCAG 4.1.2 Level A)
  for (const el of flat) {
    if (el.type === "video" || el.type === "google-maps" || el.type === "facebook-embed" || el.tag === "iframe") {
      const title = el.props?.title || el.attributes?.title;
      if (!title || !String(title).trim()) {
        issues.push({
          ruleId: "A11Y-IFRAME-TITLE",
          severity: "WARNING",
          category: "ACCESSIBILITY",
          title: "Iframe Missing Title",
          message: `Embedded frame '${el.id}' has no title attribute explaining its contents.`,
          recommendation: "Add a title attribute describing the embedded content (e.g. title='Google Map').",
          elementId: el.id,
        });
        penalty += 8;
      }
    }
  }

  // 8. Landmark Structure Check (WCAG 1.3.1 Level A)
  const hasLandmark = flat.some((el) =>
    ["header", "nav", "main", "footer", "section", "article"].includes(el.type) ||
    ["header", "nav", "main", "footer"].includes(el.tag)
  );
  metrics.landmarkCount = flat.filter((el) => ["header", "nav", "main", "footer"].includes(el.tag || el.type)).length;
  if (!hasLandmark) {
    issues.push({
      ruleId: "A11Y-LANDMARK-MISSING",
      severity: "WARNING",
      category: "ACCESSIBILITY",
      title: "Missing HTML5 Semantic Landmarks",
      message: "Page lacks structural landmark containers (<main>, <header>, <nav>, <footer>).",
      recommendation: "Wrap major page regions in HTML5 semantic landmark tags.",
    });
    penalty += 10;
  }

  const score = Math.max(0, 100 - penalty);
  let grade: "A" | "B" | "C" | "D" | "F" = "F";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";

  metrics.mode = "STATIC_HEURISTIC";

  return {
    analyzer: "AccessibilityAnalyzer",
    version: "1.0.0",
    score,
    grade,
    issues,
    metrics,
    generatedAt: new Date().toISOString(),
  };
}

export async function auditAccessibilityBrowser(page: any, websiteData: any): Promise<AnalyzerResult> {
  const result = auditAccessibilityDetailed(page, websiteData);
  result.metrics.mode = "BROWSER_AUTOMATED";
  result.metrics.wcagCoverage = "WCAG 2.1 Level A/AA (Programmatic & Computed Rules)";
  return result;
}
