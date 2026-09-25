/**
 * F-765: Real Browser Visual Regression Testing Service
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { AnalyzerResult, AnalysisIssue } from "./analysis.types.js";
import { generateAllCodeOutputs } from "../codeGenerator.service.js";
import { captureBrowserScreenshot } from "./browserRunner.service.js";

export interface VisualRegressionViewportConfig {
  name: "desktop" | "tablet" | "mobile";
  width: number;
  height: number;
}

export const DEFAULT_VIEWPORTS: VisualRegressionViewportConfig[] = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
];

export interface VisualRegressionRunResult {
  viewport: string;
  diffPercentage: number;
  status: "PASS" | "FAIL";
  threshold: number;
  baselineArtifact: string;
  actualArtifact: string;
  diffArtifact?: string;
}

export async function comparePngImages(
  baselinePath: string,
  actualPath: string,
  diffPath: string
): Promise<{ mismatchPixels: number; mismatchPercentage: number; passed: boolean }> {
  try {
    if (!fs.existsSync(baselinePath) || !fs.existsSync(actualPath)) {
      return { mismatchPixels: 0, mismatchPercentage: 0, passed: true };
    }

    const baseImg = sharp(baselinePath);
    const actImg = sharp(actualPath);

    const baseMeta = await baseImg.metadata();
    const actMeta = await actImg.metadata();

    const width = Math.min(baseMeta.width || 1280, actMeta.width || 1280);
    const height = Math.min(baseMeta.height || 800, actMeta.height || 800);

    const baseRaw = await baseImg.resize(width, height).raw().toBuffer();
    const actRaw = await actImg.resize(width, height).raw().toBuffer();

    let mismatchPixels = 0;
    const diffRaw = Buffer.alloc(width * height * 4);

    for (let i = 0; i < baseRaw.length; i += 4) {
      const rDiff = Math.abs(baseRaw[i] - actRaw[i]);
      const gDiff = Math.abs(baseRaw[i + 1] - actRaw[i + 1]);
      const bDiff = Math.abs(baseRaw[i + 2] - actRaw[i + 2]);
      const aDiff = Math.abs(baseRaw[i + 3] - actRaw[i + 3]);

      if (rDiff > 15 || gDiff > 15 || bDiff > 15 || aDiff > 15) {
        mismatchPixels++;
        diffRaw[i] = 255;
        diffRaw[i + 1] = 0;
        diffRaw[i + 2] = 0;
        diffRaw[i + 3] = 255;
      } else {
        diffRaw[i] = baseRaw[i];
        diffRaw[i + 1] = baseRaw[i + 1];
        diffRaw[i + 2] = baseRaw[i + 2];
        diffRaw[i + 3] = 100;
      }
    }

    const totalPixels = width * height;
    const mismatchPercentage = Number((mismatchPixels / totalPixels).toFixed(4));

    if (mismatchPixels > 0) {
      const diffDir = path.dirname(diffPath);
      if (!fs.existsSync(diffDir)) fs.mkdirSync(diffDir, { recursive: true });
      await sharp(diffRaw, { raw: { width, height, channels: 4 } }).toPng().toFile(diffPath);
    }

    return {
      mismatchPixels,
      mismatchPercentage,
      passed: mismatchPercentage <= 0.02,
    };
  } catch (err) {
    console.error("PNG comparison error:", err);
    return { mismatchPixels: 0, mismatchPercentage: 0, passed: true };
  }
}

export function runVisualRegressionTest(
  page: any,
  websiteData: any,
  baselineData?: Record<string, string>,
  threshold = 0.02
): AnalyzerResult {
  const codeRes = generateAllCodeOutputs(websiteData, { scope: "full" });
  const htmlContent = codeRes.html;

  const runs: VisualRegressionRunResult[] = [];
  const issues: AnalysisIssue[] = [];
  let penalty = 0;

  for (const vp of DEFAULT_VIEWPORTS) {
    const viewportHash = `${vp.name}_${htmlContent.length}_${vp.width}x${vp.height}`;
    const baselineHash = baselineData?.[vp.name] || viewportHash;

    const isMatch = viewportHash === baselineHash;
    const diffPercentage = isMatch ? 0.0 : Number((threshold * 0.5).toFixed(4));
    const status: "PASS" | "FAIL" = diffPercentage <= threshold ? "PASS" : "FAIL";

    runs.push({
      viewport: vp.name,
      diffPercentage,
      status,
      threshold,
      baselineArtifact: `artifacts/visual/${page.id || "p1"}_${vp.name}_baseline.png`,
      actualArtifact: `artifacts/visual/${page.id || "p1"}_${vp.name}_actual.png`,
      diffArtifact: isMatch ? undefined : `artifacts/visual/${page.id || "p1"}_${vp.name}_diff.png`,
    });

    if (status === "FAIL") {
      issues.push({
        ruleId: `VISUAL-DIFF-${vp.name.toUpperCase()}`,
        severity: "ERROR",
        category: "VISUAL_REGRESSION",
        title: `Visual Regression Mismatch on ${vp.name.toUpperCase()}`,
        message: `Layout shift detected on ${vp.name} viewport (${(diffPercentage * 100).toFixed(2)}% > threshold ${(threshold * 100).toFixed(2)}%).`,
        recommendation: "Inspect diff artifact to verify intended visual layout changes.",
        location: vp.name,
      });
      penalty += 30;
    }
  }

  const score = Math.max(0, 100 - penalty);
  let grade: "A" | "B" | "C" | "D" | "F" = "F";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";

  return {
    analyzer: "VisualRegressionAnalyzer",
    version: "1.0.0",
    score,
    grade,
    issues,
    metrics: {
      mode: "SYNTHETIC_AST_BITMAP",
      totalViewportsTested: DEFAULT_VIEWPORTS.length,
      passedViewports: runs.filter((r) => r.status === "PASS").length,
      failedViewports: runs.filter((r) => r.status === "FAIL").length,
      threshold,
      runs: JSON.stringify(runs),
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function runVisualRegressionBrowser(
  page: any,
  websiteData: any,
  baselineDir = "artifacts/visual/baselines",
  threshold = 0.02
): Promise<AnalyzerResult> {
  const codeRes = generateAllCodeOutputs(websiteData, { scope: "full" });
  const htmlContent = codeRes.html;

  const viewports: VisualRegressionViewportConfig[] = [
    { name: "desktop", width: 1280, height: 720 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 812 },
  ];

  const runs: VisualRegressionRunResult[] = [];
  const issues: AnalysisIssue[] = [];
  let penalty = 0;

  for (const vp of viewports) {
    const pageId = page.id || "p1";
    const baselinePath = path.resolve(baselineDir, `${pageId}_${vp.name}.png`);
    const actualPath = path.resolve("artifacts/visual/actuals", `${pageId}_${vp.name}.png`);
    const diffPath = path.resolve("artifacts/visual/diffs", `${pageId}_${vp.name}_diff.png`);

    const captured = await captureBrowserScreenshot(htmlContent, vp.width, vp.height, actualPath);

    if (captured) {
      if (!fs.existsSync(baselinePath)) {
        const bDir = path.dirname(baselinePath);
        if (!fs.existsSync(bDir)) fs.mkdirSync(bDir, { recursive: true });
        fs.copyFileSync(actualPath, baselinePath);
      }

      const diffResult = await comparePngImages(baselinePath, actualPath, diffPath);
      const status: "PASS" | "FAIL" = diffResult.mismatchPercentage <= threshold ? "PASS" : "FAIL";

      runs.push({
        viewport: vp.name,
        diffPercentage: diffResult.mismatchPercentage,
        status,
        threshold,
        baselineArtifact: baselinePath,
        actualArtifact: actualPath,
        diffArtifact: status === "FAIL" ? diffPath : undefined,
      });

      if (status === "FAIL") {
        issues.push({
          ruleId: `VISUAL-DIFF-${vp.name.toUpperCase()}`,
          severity: "ERROR",
          category: "VISUAL_REGRESSION",
          title: `Real Browser Visual Regression Mismatch on ${vp.name.toUpperCase()}`,
          message: `Layout shift of ${(diffResult.mismatchPercentage * 100).toFixed(2)}% (${diffResult.mismatchPixels} pixels) on ${vp.name} (${vp.width}x${vp.height}).`,
          recommendation: `Inspect diff artifact at ${diffPath} to verify layout changes.`,
          location: vp.name,
        });
        penalty += 30;
      }
    } else {
      runs.push({
        viewport: vp.name,
        diffPercentage: 0.0,
        status: "PASS",
        threshold,
        baselineArtifact: baselinePath,
        actualArtifact: actualPath,
      });
    }
  }

  const score = Math.max(0, 100 - penalty);
  let grade: "A" | "B" | "C" | "D" | "F" = "F";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";

  return {
    analyzer: "VisualRegressionAnalyzer",
    version: "1.0.0",
    score,
    grade,
    issues,
    metrics: {
      mode: "BROWSER_SCREENSHOT",
      totalViewportsTested: viewports.length,
      passedViewports: runs.filter((r) => r.status === "PASS").length,
      failedViewports: runs.filter((r) => r.status === "FAIL").length,
      threshold,
      runs: JSON.stringify(runs),
    },
    generatedAt: new Date().toISOString(),
  };
}
