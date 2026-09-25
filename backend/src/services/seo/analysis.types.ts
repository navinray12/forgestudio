/**
 * ForgeStudio Quality, SEO & Technical Analysis Unified Types
 * Standardized schema for F-756 -> F-767 Analyzers
 */

export type AnalysisSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export interface AnalysisIssue {
  ruleId: string;
  severity: AnalysisSeverity;
  category: "SEO" | "ACCESSIBILITY" | "PERFORMANCE" | "CODE_QUALITY" | "VISUAL_REGRESSION" | "GOLDEN_CODE" | "PERFORMANCE_BUDGET";
  title: string;
  message: string;
  recommendation: string;
  location?: string;
  elementId?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyzerResult {
  analyzer: string;
  version: string;
  score: number; // 0 - 100
  grade: "A" | "B" | "C" | "D" | "F";
  issues: AnalysisIssue[];
  metrics: Record<string, number | string | boolean>;
  generatedAt: string;
}

export interface MultiPageAuditSummary {
  totalPages: number;
  averageScore: number;
  overallGrade: "A" | "B" | "C" | "D" | "F";
  pageAudits: Record<string, AnalyzerResult>;
}

export interface PerformanceBudgetConfig {
  maxHtmlBytes?: number;
  maxCssBytes?: number;
  maxJsBytes?: number;
  maxImageBytes?: number;
  maxFontCount?: number;
  maxDomNodes?: number;
  maxRequests?: number;
}
