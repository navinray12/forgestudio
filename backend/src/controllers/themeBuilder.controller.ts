import type { Request, Response, NextFunction } from "express";
import * as themeBuilderService from "../services/themeBuilder.service.js";

export async function listThemeRulesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = req.params.websiteId as string;
    const userId = res.locals.user?.id;
    const rules = await themeBuilderService.listThemeRules(websiteId, userId);
    res.status(200).json({ success: true, data: rules });
  } catch (e) {
    next(e);
  }
}

export async function createThemeRuleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = req.params.websiteId as string;
    const userId = res.locals.user?.id;
    const rule = await themeBuilderService.createThemeRule(websiteId, userId, req.body);
    res.status(201).json({ success: true, data: rule });
  } catch (e) {
    next(e);
  }
}

export async function updateThemeRuleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const ruleId = req.params.ruleId as string;
    const userId = res.locals.user?.id;
    const rule = await themeBuilderService.updateThemeRule(ruleId, userId, req.body);
    res.status(200).json({ success: true, data: rule });
  } catch (e) {
    next(e);
  }
}

export async function deleteThemeRuleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const ruleId = req.params.ruleId as string;
    const userId = res.locals.user?.id;
    const result = await themeBuilderService.deleteThemeRule(ruleId, userId);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function evaluateThemeRuleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = req.params.websiteId as string;
    const userId = res.locals.user?.id;
    const { locationType, pageSlug, isHomepage, cptSlug, entrySlug, is404 } = req.body;

    const result = await themeBuilderService.evaluateThemeRule(
      websiteId,
      {
        locationType: locationType || "HEADER",
        pageSlug,
        isHomepage,
        cptSlug,
        entrySlug,
        is404,
      },
      userId
    );

    res.status(200).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
}
