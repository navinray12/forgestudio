/**
 * ForgeStudio Unified Quality, SEO & Technical Analysis Suite Orchestrator
 * F-756 -> F-767 Integration Layer
 */
import { AnalyzerResult, AnalysisIssue } from "./analysis.types.js";
import { analyzePageSeo } from "./seoAnalyzer.service.js";
import { auditAccessibilityDetailed } from "./accessibilityAnalyzer.service.js";
import { auditPagePerformance } from "./performanceAnalyzer.service.js";
import { auditCodeQuality } from "./codeQualityAnalyzer.service.js";
import { runVisualRegressionTest } from "./visualRegression.service.js";
import { runGoldenCodeTest } from "./goldenCode.service.js";
import { auditPerformanceBudget } from "./performanceBudget.service.js";

export interface UnifiedQualityReport {
  overallScore: number;
  overallGrade: "A" | "B" | "C" | "D" | "F";
  summary: {
    criticalCount: number;
    warningCount: number;
    infoCount: number;
  };
  analyzers: {
    seo: AnalyzerResult;
    accessibility: AnalyzerResult;
    performance: AnalyzerResult;
    codeQuality: AnalyzerResult;
    visualRegression: AnalyzerResult;
    goldenCode: AnalyzerResult;
    performanceBudget: AnalyzerResult;
  };
  allIssues: AnalysisIssue[];
  generatedAt: string;
}

export function runFullQualityAudit(page: any, websiteData: any): UnifiedQualityReport {
  const seoRes = analyzePageSeo(page, websiteData);
  const a11yRes = auditAccessibilityDetailed(page, websiteData);
  const perfRes = auditPagePerformance(page, websiteData);
  const qualityRes = auditCodeQuality(page, websiteData);
  const visualRes = runVisualRegressionTest(page, websiteData);
  const goldenRes = runGoldenCodeTest(page, websiteData);
  const budgetRes = auditPerformanceBudget(page, websiteData);

  // Map SEO result into normalized AnalyzerResult format
  const mappedSeoRes: AnalyzerResult = {
    analyzer: "SeoAnalyzer",
    version: "1.0.0",
    score: seoRes.score,
    grade: seoRes.grade,
    issues: [
      ...seoRes.critical.map((c) => ({
        ruleId: c.id,
        severity: "CRITICAL" as const,
        category: "SEO" as const,
        title: c.title,
        message: c.description,
        recommendation: c.recommendation,
        elementId: c.elementId,
      })),
      ...seoRes.warnings.map((w) => ({
        ruleId: w.id,
        severity: "WARNING" as const,
        category: "SEO" as const,
        title: w.title,
        message: w.description,
        recommendation: w.recommendation,
        elementId: w.elementId,
      })),
    ],
    metrics: seoRes.stats,
    generatedAt: new Date().toISOString(),
  };

  const weightedScores = [
    mappedSeoRes.score * 0.2,
    a11yRes.score * 0.2,
    perfRes.score * 0.15,
    qualityRes.score * 0.15,
    visualRes.score * 0.1,
    goldenRes.score * 0.1,
    budgetRes.score * 0.1,
  ];

  const overallScore = Math.round(weightedScores.reduce((a, b) => a + b, 0));
  let overallGrade: "A" | "B" | "C" | "D" | "F" = "F";
  if (overallScore >= 90) overallGrade = "A";
  else if (overallScore >= 80) overallGrade = "B";
  else if (overallScore >= 70) overallGrade = "C";
  else if (overallScore >= 60) overallGrade = "D";

  const allIssues: AnalysisIssue[] = [
    ...mappedSeoRes.issues,
    ...a11yRes.issues,
    ...perfRes.issues,
    ...qualityRes.issues,
    ...visualRes.issues,
    ...goldenRes.issues,
    ...budgetRes.issues,
  ];

  const criticalCount = allIssues.filter((i) => i.severity === "CRITICAL" || i.severity === "ERROR").length;
  const warningCount = allIssues.filter((i) => i.severity === "WARNING").length;
  const infoCount = allIssues.filter((i) => i.severity === "INFO").length;

  return {
    overallScore,
    overallGrade,
    summary: {
      criticalCount,
      warningCount,
      infoCount,
    },
    analyzers: {
      seo: mappedSeoRes,
      accessibility: a11yRes,
      performance: perfRes,
      codeQuality: qualityRes,
      visualRegression: visualRes,
      goldenCode: goldenRes,
      performanceBudget: budgetRes,
    },
    allIssues,
    generatedAt: new Date().toISOString(),
  };
}
