import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { assertCmsAccess } from "./cpt.service.js";

export type ThemeLocationType = "HEADER" | "FOOTER" | "SINGLE" | "ARCHIVE" | "ERROR404";

export interface ThemeCondition {
  type:
    | "entire_site"
    | "homepage"
    | "all_pages"
    | "specific_page"
    | "specific_cpt"
    | "specific_entry"
    | "cpt_archive"
    | "error_404";
  targetId?: string; // page slug/id, cpt slug, or entry slug
  isExcluded?: boolean;
  priority?: number;
}

export interface EvaluateContext {
  locationType: ThemeLocationType;
  pageId?: string;
  pageSlug?: string;
  slug?: string;
  isHomepage?: boolean;
  isHome?: boolean;
  cptSlug?: string;
  entrySlug?: string;
  entryId?: string;
  isArchive?: boolean;
  is404?: boolean;
}

const SPECIFICITY_WEIGHTS: Record<string, number> = {
  specific_entry: 100,
  specific_page: 90,
  cpt_archive: 80,
  specific_cpt: 70,
  error_404: 60,
  homepage: 50,
  all_pages: 40,
  entire_site: 10,
};

/**
 * Pure evaluation function for theme location conditions
 */
export function evaluateRulesForContext(
  rules: any[],
  context: EvaluateContext
): { matchedRule: any | null; score: number } {
  const activeRules = (rules || []).filter(
    (r) => r.isActive !== false && r.locationType === context.locationType
  );

  let bestRule: any = null;
  let highestScore = -1;

  for (const rule of activeRules) {
    let conditions: ThemeCondition[] = [];
    if (Array.isArray(rule.conditions)) {
      conditions = rule.conditions;
    } else if (typeof rule.conditions === "string") {
      try { conditions = JSON.parse(rule.conditions); } catch (_) {}
    }

    if (conditions.length === 0) {
      // Default to entire site if no conditions specified
      conditions = [{ type: "entire_site" }];
    }

    let isExcluded = false;
    let ruleMaxScore = -1;

    for (const cond of conditions) {
      let rawType = (cond.type || "entire_site").toLowerCase();
      let condIsExcluded = Boolean(cond.isExcluded);

      if (rawType.startsWith("exclude:")) {
        condIsExcluded = true;
        rawType = rawType.replace(/^exclude:/, "");
      } else if (rawType.startsWith("include:")) {
        rawType = rawType.replace(/^include:/, "");
      }

      let type = rawType;
      let targetId = cond.targetId;
      if (type.startsWith("page:")) {
        targetId = targetId || type.replace(/^page:/, "");
        type = "specific_page";
      } else if (type.startsWith("cpt:")) {
        targetId = targetId || type.replace(/^cpt:/, "");
        type = "specific_cpt";
      } else if (type.startsWith("archive:")) {
        targetId = targetId || type.replace(/^archive:/, "");
        type = "cpt_archive";
      } else if (type.startsWith("entry:")) {
        targetId = targetId || type.replace(/^entry:/, "");
        type = "specific_entry";
      } else if (type === "all" || type === "entire_site") {
        type = "entire_site";
      } else if (type === "home" || type === "singular:home") {
        type = "homepage";
      }

      let matches = false;
      const currentPageId = (context.pageId || "").toLowerCase();
      const currentPageSlug = (context.pageSlug || context.slug || "").replace(/^\//, "").toLowerCase();
      const isHome = Boolean(context.isHomepage || context.isHome || currentPageSlug === "" || currentPageSlug === "home" || currentPageId === "home");

      switch (type) {
        case "entire_site":
          matches = true;
          break;
        case "homepage":
          matches = isHome;
          break;
        case "all_pages":
          matches = !context.is404;
          break;
        case "specific_page":
          if (targetId) {
            const cleanTarget = targetId.toLowerCase().replace(/^\//, "");
            matches = cleanTarget === currentPageId || cleanTarget === currentPageSlug;
          }
          break;
        case "specific_cpt":
          if (targetId && context.cptSlug) {
            matches = targetId.toLowerCase() === context.cptSlug.toLowerCase();
          }
          break;
        case "cpt_archive":
          if (context.isArchive || (context.cptSlug && !context.entrySlug && !context.entryId)) {
            matches = targetId ? targetId.toLowerCase() === (context.cptSlug || "").toLowerCase() : true;
          }
          break;
        case "specific_entry":
          if (targetId) {
            const cleanTarget = targetId.toLowerCase();
            const currentEntry = (context.entryId || context.entrySlug || context.pageSlug || "").toLowerCase();
            matches = cleanTarget === currentEntry;
          }
          break;
        case "error_404":
          matches = Boolean(context.is404 || currentPageId === "404");
          break;
      }

      if (matches) {
        if (condIsExcluded) {
          isExcluded = true;
          break;
        }
        const weight = SPECIFICITY_WEIGHTS[type] || 10;
        if (weight > ruleMaxScore) {
          ruleMaxScore = weight;
        }
      }
    }

    if (!isExcluded && ruleMaxScore > highestScore) {
      highestScore = ruleMaxScore;
      bestRule = rule;
    }
  }

  return { matchedRule: bestRule, score: highestScore };
}

// ============================================================================
// SERVICE METHODS
// ============================================================================

export async function listThemeRules(websiteId: string, userId?: string) {
  if (userId) {
    await assertCmsAccess(websiteId, userId, "VIEWER");
  }

  const rules = await prisma.themeLocationRule.findMany({
    where: { websiteId },
    orderBy: { createdAt: "asc" },
  });

  // Attach template details if available
  const templateIds = rules.map((r) => r.templateId).filter(Boolean);
  const templateMap = new Map<string, any>();

  if (templateIds.length > 0) {
    try {
      const dbTemplates = await (prisma as any).templates.findMany({
        where: { id: { in: templateIds } },
        select: { id: true, name: true, type: true, category: true },
      });
      for (const t of dbTemplates) templateMap.set(t.id, t);
    } catch (_) {}
  }

  return rules.map((rule: any) => ({
    id: rule.id,
    websiteId: rule.websiteId,
    locationType: rule.locationType,
    templateId: rule.templateId,
    template: templateMap.get(rule.templateId) || null,
    conditions: rule.conditions || [],
    isActive: rule.isActive,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  }));
}

export async function createThemeRule(
  websiteId: string,
  userId: string,
  payload: {
    locationType: ThemeLocationType;
    templateId: string;
    conditions?: ThemeCondition[];
    isActive?: boolean;
  }
) {
  await assertCmsAccess(websiteId, userId, "ADMIN");

  const locationType = String(payload.locationType || "HEADER").toUpperCase() as ThemeLocationType;
  const templateId = String(payload.templateId || "").trim();

  if (!templateId) {
    throw new AppError("Template ID is required", 400, "INVALID_TEMPLATE_ID");
  }

  const conditions = Array.isArray(payload.conditions) ? payload.conditions : [{ type: "entire_site" }];
  const isActive = payload.isActive !== false;

  const rule = await prisma.themeLocationRule.create({
    data: {
      websiteId,
      locationType,
      templateId,
      conditions: conditions as any,
      isActive,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "THEME_RULE_CREATED",
      targetResource: `theme_rule:${rule.id}`,
      details: { websiteId, locationType, templateId, conditions } as any,
    },
  });

  return rule;
}

export async function updateThemeRule(
  ruleId: string,
  userId: string,
  payload: {
    locationType?: ThemeLocationType;
    templateId?: string;
    conditions?: ThemeCondition[];
    isActive?: boolean;
  }
) {
  const existing = await prisma.themeLocationRule.findUnique({
    where: { id: ruleId },
  });
  if (!existing) {
    throw new AppError("Theme rule not found", 404, "RULE_NOT_FOUND");
  }

  await assertCmsAccess(existing.websiteId, userId, "ADMIN");

  const locationType = payload.locationType ? String(payload.locationType).toUpperCase() as ThemeLocationType : existing.locationType;
  const templateId = payload.templateId !== undefined ? String(payload.templateId).trim() : existing.templateId;
  const conditions = payload.conditions !== undefined ? payload.conditions : existing.conditions;
  const isActive = payload.isActive !== undefined ? payload.isActive : existing.isActive;

  const updated = await prisma.themeLocationRule.update({
    where: { id: ruleId },
    data: {
      locationType,
      templateId,
      conditions: conditions as any,
      isActive,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "THEME_RULE_UPDATED",
      targetResource: `theme_rule:${ruleId}`,
      details: { websiteId: existing.websiteId, payload } as any,
    },
  });

  return updated;
}

export async function deleteThemeRule(ruleId: string, userId: string) {
  const existing = await prisma.themeLocationRule.findUnique({
    where: { id: ruleId },
  });
  if (!existing) {
    throw new AppError("Theme rule not found", 404, "RULE_NOT_FOUND");
  }

  await assertCmsAccess(existing.websiteId, userId, "ADMIN");

  await prisma.themeLocationRule.delete({ where: { id: ruleId } });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "THEME_RULE_DELETED",
      targetResource: `theme_rule:${ruleId}`,
      details: { websiteId: existing.websiteId, locationType: existing.locationType },
    },
  });

  return { success: true, message: "Theme Location Rule deleted successfully." };
}

export async function evaluateThemeRule(
  websiteId: string,
  context: EvaluateContext,
  userId?: string
) {
  if (userId) {
    await assertCmsAccess(websiteId, userId, "VIEWER");
  }

  const rules = await prisma.themeLocationRule.findMany({
    where: { websiteId, locationType: context.locationType, isActive: true },
  });

  const { matchedRule, score } = evaluateRulesForContext(rules, context);
  if (!matchedRule) {
    return {
      locationType: context.locationType,
      matched: false,
      templateId: null,
      template: null,
    };
  }

  let templateRecord: any = null;
  try {
    templateRecord = await (prisma as any).templates.findUnique({
      where: { id: matchedRule.templateId },
    });
  } catch (_) {}

  return {
    locationType: context.locationType,
    matched: true,
    score,
    ruleId: matchedRule.id,
    templateId: matchedRule.templateId,
    matchedRule,
    template: templateRecord,
  };
}
