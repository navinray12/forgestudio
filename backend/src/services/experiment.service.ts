import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

const db = prisma as any;

export type ExperimentTargetType = "POPUP" | "SECTION";
export type ExperimentStatus = "DRAFT" | "RUNNING" | "PAUSED" | "CONCLUDED";
export type ExperimentGoalAction = "FORM_SUBMIT" | "CLICK" | "LINK_REDIRECT";

export interface ExperimentVariant {
  id: string;              // 'control', 'variant_b'
  name: string;
  trafficAllocation: number; // e.g. 50 (percentage)
  targetEntityId: string;    // popupId or elementId
  impressions: number;
  conversions: number;
}

export interface Experiment {
  id: string;
  websiteId: string;
  title: string;
  targetType: ExperimentTargetType;
  status: ExperimentStatus;
  winningVariantId?: string;
  variants: ExperimentVariant[];
  goalAction: ExperimentGoalAction;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Retrieves all experiments for a website with calculated conversion performance metrics.
 */
export async function getExperiments(websiteId: string) {
  if (!websiteId) throw new AppError("Website ID is required", 400, "BAD_REQUEST");

  const website = await db.website.findUnique({
    where: { id: websiteId },
    select: { id: true, name: true, editorData: true },
  });

  if (!website) throw new AppError("Website not found", 404, "NOT_FOUND");

  const editorData = typeof website.editorData === "string"
    ? JSON.parse(website.editorData)
    : (website.editorData || {});

  const experiments: Experiment[] = Array.isArray(editorData.experiments)
    ? editorData.experiments
    : [];

  const enriched = experiments.map((exp) => {
    const totalImpressions = exp.variants.reduce((acc, v) => acc + (v.impressions || 0), 0);
    const totalConversions = exp.variants.reduce((acc, v) => acc + (v.conversions || 0), 0);
    const overallConversionRate = totalImpressions > 0
      ? Number(((totalConversions / totalImpressions) * 100).toFixed(2))
      : 0;

    const variantsWithRate = exp.variants.map((v) => ({
      ...v,
      conversionRate: v.impressions > 0
        ? Number(((v.conversions / v.impressions) * 100).toFixed(2))
        : 0,
    }));

    return {
      ...exp,
      variants: variantsWithRate,
      analytics: {
        totalImpressions,
        totalConversions,
        overallConversionRate,
      },
    };
  });

  return enriched;
}

/**
 * Creates a new A/B experiment.
 */
export async function createExperiment(websiteId: string, input: Partial<Experiment>) {
  if (!websiteId) throw new AppError("Website ID is required", 400, "BAD_REQUEST");
  if (!input.title) throw new AppError("Experiment title is required", 400, "BAD_REQUEST");

  const website = await db.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) throw new AppError("Website not found", 404, "NOT_FOUND");

  const editorData = typeof website.editorData === "string"
    ? JSON.parse(website.editorData)
    : (website.editorData || {});

  const currentExperiments: Experiment[] = Array.isArray(editorData.experiments)
    ? editorData.experiments
    : [];

  const experimentId = `exp_${crypto.randomBytes(6).toString("hex")}`;
  const now = new Date().toISOString();

  // Normalize variants with safe fallback defaults
  const variants: ExperimentVariant[] = Array.isArray(input.variants) && input.variants.length >= 2
    ? input.variants.map((v, i) => ({
        id: v.id || (i === 0 ? "control" : `variant_${String.fromCharCode(97 + i)}`),
        name: v.name || (i === 0 ? "Original (Control)" : `Variant ${String.fromCharCode(65 + i)}`),
        trafficAllocation: typeof v.trafficAllocation === "number" ? v.trafficAllocation : 50,
        targetEntityId: v.targetEntityId || "",
        impressions: 0,
        conversions: 0,
      }))
    : [
        {
          id: "control",
          name: "Original (Control)",
          trafficAllocation: 50,
          targetEntityId: input.targetType === "POPUP" ? "popup-default" : "hero-section-1",
          impressions: 0,
          conversions: 0,
        },
        {
          id: "variant_b",
          name: "Variant B (Challenger)",
          trafficAllocation: 50,
          targetEntityId: input.targetType === "POPUP" ? "popup-variant-b" : "hero-section-2",
          impressions: 0,
          conversions: 0,
        },
      ];

  const newExperiment: Experiment = {
    id: experimentId,
    websiteId,
    title: input.title.trim(),
    targetType: input.targetType || "POPUP",
    status: input.status || "DRAFT",
    variants,
    goalAction: input.goalAction || "FORM_SUBMIT",
    createdAt: now,
    updatedAt: now,
  };

  editorData.experiments = [newExperiment, ...currentExperiments];

  await db.website.update({
    where: { id: websiteId },
    data: { editorData },
  });

  return newExperiment;
}

/**
 * Updates an existing experiment.
 */
export async function updateExperiment(
  websiteId: string,
  experimentId: string,
  updates: Partial<Experiment>
) {
  if (!websiteId || !experimentId) {
    throw new AppError("Website ID and Experiment ID are required", 400, "BAD_REQUEST");
  }

  const website = await db.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) throw new AppError("Website not found", 404, "NOT_FOUND");

  const editorData = typeof website.editorData === "string"
    ? JSON.parse(website.editorData)
    : (website.editorData || {});

  const experiments: Experiment[] = Array.isArray(editorData.experiments)
    ? editorData.experiments
    : [];

  const index = experiments.findIndex((e) => e.id === experimentId);
  if (index === -1) throw new AppError("Experiment not found", 404, "NOT_FOUND");

  const updated: Experiment = {
    ...experiments[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  experiments[index] = updated;
  editorData.experiments = experiments;

  await db.website.update({
    where: { id: websiteId },
    data: { editorData },
  });

  return updated;
}

/**
 * Records an impression telemetry event for an experiment variant.
 */
export async function recordImpression(
  websiteId: string,
  experimentId: string,
  variantId: string
) {
  if (!websiteId || !experimentId || !variantId) return false;

  const website = await db.website.findUnique({
    where: { id: websiteId },
    select: { id: true, editorData: true },
  });

  if (!website) return false;

  const editorData = typeof website.editorData === "string"
    ? JSON.parse(website.editorData)
    : (website.editorData || {});

  const experiments: Experiment[] = Array.isArray(editorData.experiments)
    ? editorData.experiments
    : [];

  const exp = experiments.find((e) => e.id === experimentId);
  if (!exp || exp.status !== "RUNNING") return false;

  const variant = exp.variants.find((v) => v.id === variantId);
  if (!variant) return false;

  variant.impressions = (variant.impressions || 0) + 1;
  exp.updatedAt = new Date().toISOString();

  await db.website.update({
    where: { id: websiteId },
    data: { editorData },
  });

  return true;
}

/**
 * Records a goal conversion event for an experiment variant.
 */
export async function recordConversion(
  websiteId: string,
  experimentId: string,
  variantId: string
) {
  if (!websiteId || !experimentId || !variantId) return false;

  const website = await db.website.findUnique({
    where: { id: websiteId },
    select: { id: true, editorData: true },
  });

  if (!website) return false;

  const editorData = typeof website.editorData === "string"
    ? JSON.parse(website.editorData)
    : (website.editorData || {});

  const experiments: Experiment[] = Array.isArray(editorData.experiments)
    ? editorData.experiments
    : [];

  const exp = experiments.find((e) => e.id === experimentId);
  if (!exp || exp.status !== "RUNNING") return false;

  const variant = exp.variants.find((v) => v.id === variantId);
  if (!variant) return false;

  variant.conversions = (variant.conversions || 0) + 1;
  exp.updatedAt = new Date().toISOString();

  await db.website.update({
    where: { id: websiteId },
    data: { editorData },
  });

  return true;
}

/**
 * Concludes an experiment and crowns a winning variant.
 */
export async function concludeExperiment(
  websiteId: string,
  experimentId: string,
  winningVariantId: string
) {
  return updateExperiment(websiteId, experimentId, {
    status: "CONCLUDED",
    winningVariantId,
  });
}

/**
 * Deletes an experiment.
 */
export async function deleteExperiment(websiteId: string, experimentId: string) {
  if (!websiteId || !experimentId) {
    throw new AppError("Website ID and Experiment ID are required", 400, "BAD_REQUEST");
  }

  const website = await db.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) throw new AppError("Website not found", 404, "NOT_FOUND");

  const editorData = typeof website.editorData === "string"
    ? JSON.parse(website.editorData)
    : (website.editorData || {});

  const experiments: Experiment[] = Array.isArray(editorData.experiments)
    ? editorData.experiments
    : [];

  editorData.experiments = experiments.filter((e) => e.id !== experimentId);

  await db.website.update({
    where: { id: websiteId },
    data: { editorData },
  });

  return { success: true, message: "Experiment removed." };
}
