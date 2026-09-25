/**
 * F-764: Generated Code Quality Analyzer Service
 */
import { AnalyzerResult, AnalysisIssue } from "./analysis.types.js";
import { generateAllCodeOutputs } from "../codeGenerator.service.js";
import { flattenElementTree } from "./seoAnalyzer.service.js";

export function auditCodeQuality(page: any, websiteData: any): AnalyzerResult {
  const elements = page.elements || [];
  const flat = flattenElementTree(elements);
  const codeRes = generateAllCodeOutputs(websiteData, { scope: "full" });

  const issues: AnalysisIssue[] = [];
  let penalty = 0;

  const seenIds = new Map<string, number>();
  for (const el of flat) {
    if (el.id) {
      seenIds.set(el.id, (seenIds.get(el.id) || 0) + 1);
    }
  }
  let dupIdCount = 0;
  for (const [id, count] of seenIds.entries()) {
    if (count > 1) {
      dupIdCount++;
      issues.push({
        ruleId: "QUAL-DUP-ID",
        severity: "CRITICAL",
        category: "CODE_QUALITY",
        title: "Duplicate DOM ID Attribute",
        message: `ID '${id}' is defined ${count} times in the generated markup.`,
        recommendation: "Ensure generated component IDs use unique suffixes.",
        elementId: id,
      });
      penalty += 15;
    }
  }

  // 2. Unsafe JS Patterns Check (eval, new Function, document.write)
  const jsCode = codeRes.js || "";
  if (/eval\s*\(/i.test(jsCode)) {
    issues.push({
      ruleId: "QUAL-JS-EVAL",
      severity: "CRITICAL",
      category: "CODE_QUALITY",
      title: "Unsafe eval() Execution Detected",
      message: "Generated JavaScript output contains eval() call.",
      recommendation: "Replace dynamic code evaluation with safe static data mappings.",
    });
    penalty += 25;
  }
  if (/new\s+Function\s*\(/i.test(jsCode)) {
    issues.push({
      ruleId: "QUAL-JS-NEW-FUNC",
      severity: "CRITICAL",
      category: "CODE_QUALITY",
      title: "Unsafe Function Constructor Execution",
      message: "Generated JavaScript uses new Function() dynamic execution.",
      recommendation: "Refactor dynamic logic into pure static functions.",
    });
    penalty += 25;
  }

  // 3. Next.js Server/Client Boundary Integrity Check
  const nextJsPage = codeRes.nextJsCode?.pageTsx || "";
  const hasInteractions = flat.some((el) => !!el.interaction || !!el.events);
  if (hasInteractions && !nextJsPage.includes("'use client'")) {
    issues.push({
      ruleId: "QUAL-NEXTJS-CLIENT-BOUNDARY",
      severity: "ERROR",
      category: "CODE_QUALITY",
      title: "Missing Next.js 'use client' Directive",
      message: "Page contains interactive component state/events but lacks 'use client' directive.",
      recommendation: "Add 'use client'; directive at the top of Next.js App Router interactive component files.",
    });
    penalty += 20;
  }

  // 4. Duplicate CSS Declarations Check
  const cssCode = codeRes.css || "";
  const cssRules = cssCode.match(/\{[^}]+\}/g) || [];
  let dupDeclCount = 0;
  for (const rule of cssRules) {
    const decls = rule.slice(1, -1).split(";").map((d) => d.trim()).filter(Boolean);
    const seenProps = new Set<string>();
    for (const d of decls) {
      const prop = d.split(":")[0]?.trim().toLowerCase();
      if (prop) {
        if (seenProps.has(prop)) {
          dupDeclCount++;
          break;
        }
        seenProps.add(prop);
      }
    }
  }
  if (dupDeclCount > 0) {
    issues.push({
      ruleId: "QUAL-CSS-DUP-PROP",
      severity: "WARNING",
      category: "CODE_QUALITY",
      title: "Duplicate CSS Declarations in Single Selector",
      message: `Found ${dupDeclCount} CSS rules with duplicate property declarations.`,
      recommendation: "Deduplicate CSS rules in generator optimization pass.",
    });
    penalty += 10;
  }

  // 5. Malformed HTML Tag Matching Check
  const htmlCode = codeRes.html || "";
  const openTags = (htmlCode.match(/<[a-z1-6]+[^>]*>/gi) || []).length;
  const closeTags = (htmlCode.match(/<\/[a-z1-6]+>/gi) || []).length;
  const selfClosing = (htmlCode.match(/<[a-z1-6]+[^>]*\/>/gi) || []).length;
  if (Math.abs(openTags - (closeTags + selfClosing)) > 10) {
    issues.push({
      ruleId: "QUAL-HTML-MALFORMED",
      severity: "WARNING",
      category: "CODE_QUALITY",
      title: "Potential HTML Unclosed Tag Imbalance",
      message: `HTML tag parser detected ${openTags} opening vs ${closeTags} closing tags.`,
      recommendation: "Ensure all container elements generate matching closing tags.",
    });
    penalty += 10;
  }

  const metrics: Record<string, number | string | boolean> = {
    totalElementsScanned: flat.length,
    duplicateIdCount: dupIdCount,
    cssRuleCount: cssRules.length,
    duplicateCssDeclCount: dupDeclCount,
    nextJsClientBoundaryValid: hasInteractions ? nextJsPage.includes("'use client'") : true,
    jsSafetyPassed: !/eval|new Function/i.test(jsCode),
  };

  const score = Math.max(0, 100 - penalty);
  let grade: "A" | "B" | "C" | "D" | "F" = "F";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";

  return {
    analyzer: "CodeQualityAnalyzer",
    version: "1.0.0",
    score,
    grade,
    issues,
    metrics,
    generatedAt: new Date().toISOString(),
  };
}
