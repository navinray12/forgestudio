import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import {
  validateVariables,
  validateClasses,
  compileDesignSystemCss,
  exportDesignSystem,
  importDesignSystem,
} from "../services/tokens/designToken.service.js";

/**
 * Helper to fetch a website and verify user has access.
 */
async function getAuthorizedWebsite(websiteId: string, userId?: string) {
  if (!websiteId) return null;
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
  });
  if (!website) return null;

  // If userId is provided, check if owner or collaborator
  if (userId && website.userId !== userId) {
    const collaborator = await prisma.websiteCollaborator.findFirst({
      where: {
        websiteId,
        userId,
      },
    });
    if (!collaborator) {
      // Check platform admin/super admin
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && (user.role as string) !== "PLATFORM_ADMIN")) {
        return null;
      }
    }
  }

  return website;
}

/**
 * GET /api/websites/:websiteId/design-system
 */
export async function getDesignSystem(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;

    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) {
      return res.status(404).json({ success: false, message: "Website not found or unauthorized" });
    }

    const editorData: any = website.editorData || {};
    const variables = validateVariables(editorData.globalVariables || []);
    const classes = validateClasses(editorData.globalClasses || []);
    const compiledCss = compileDesignSystemCss(variables, classes);

    return res.status(200).json({
      success: true,
      variables,
      classes,
      compiledCss,
    });
  } catch (error: any) {
    console.error("Error fetching design system:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
}

/**
 * PUT /api/websites/:websiteId/design-system
 */
export async function updateDesignSystem(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const { variables, classes } = req.body;

    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) {
      return res.status(404).json({ success: false, message: "Website not found or unauthorized" });
    }

    // Role-based class management (F-340):
    if (userId && website.userId !== userId) {
      const collaborator = await prisma.websiteCollaborator.findFirst({
        where: { websiteId, userId },
      });
      if (collaborator && (collaborator.permission === "VIEW" || collaborator.permission === "COMMENT")) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Your role does not have permission to manage global design classes (Role-Based Class Management F-340)",
        });
      }
    }

    const validatedVars = validateVariables(variables || []);
    const validatedClasses = validateClasses(classes || []);
    const compiledCss = compileDesignSystemCss(validatedVars, validatedClasses);

    const currentEditorData: any = website.editorData || {};
    const updatedEditorData = {
      ...currentEditorData,
      globalVariables: validatedVars,
      globalClasses: validatedClasses,
    };

    const updatedWebsite = await prisma.website.update({
      where: { id: websiteId },
      data: {
        editorData: updatedEditorData,
      },
    });

    // Record audit log if model exists
    try {
      if ((prisma as any).auditLog) {
        await (prisma as any).auditLog.create({
          data: {
            userId: userId || website.userId,
            action: "design_system.update",
            details: `Updated ${validatedVars.length} variables and ${validatedClasses.length} global classes for website ${website.name}`,
          },
        });
      }
    } catch {
      // safe fallback
    }

    return res.status(200).json({
      success: true,
      message: "Design system updated successfully",
      variables: validatedVars,
      classes: validatedClasses,
      compiledCss,
    });
  } catch (error: any) {
    console.error("Error updating design system:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
}

/**
 * POST /api/websites/:websiteId/design-system/export
 */
export async function exportDesignSystemPayload(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;

    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) {
      return res.status(404).json({ success: false, message: "Website not found or unauthorized" });
    }

    const editorData: any = website.editorData || {};
    const payload = exportDesignSystem(editorData.globalVariables || [], editorData.globalClasses || []);

    res.setHeader("Content-Disposition", `attachment; filename="${website.slug}-design-tokens.json"`);
    res.setHeader("Content-Type", "application/json");
    return res.status(200).send(JSON.stringify(payload, null, 2));
  } catch (error: any) {
    console.error("Error exporting design system:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
}

/**
 * POST /api/websites/:websiteId/design-system/import
 */
export async function importDesignSystemPayload(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const { payload, mode } = req.body; // mode: "replace" | "merge"

    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) {
      return res.status(404).json({ success: false, message: "Website not found or unauthorized" });
    }

    if (!payload) {
      return res.status(400).json({ success: false, message: "Design system payload is required" });
    }

    const imported = importDesignSystem(payload);
    const currentEditorData: any = website.editorData || {};

    let finalVariables = imported.variables;
    let finalClasses = imported.classes;

    if (mode === "merge") {
      const existingVars = validateVariables(currentEditorData.globalVariables || []);
      const existingClasses = validateClasses(currentEditorData.globalClasses || []);

      // Merge variables by token
      const varMap = new Map<string, any>();
      for (const v of existingVars) varMap.set(v.token, v);
      for (const v of imported.variables) varMap.set(v.token, v);
      finalVariables = Array.from(varMap.values());

      // Merge classes by className
      const clsMap = new Map<string, any>();
      for (const c of existingClasses) clsMap.set(c.className, c);
      for (const c of imported.classes) clsMap.set(c.className, c);
      finalClasses = Array.from(clsMap.values());
    }

    const compiledCss = compileDesignSystemCss(finalVariables, finalClasses);
    const updatedEditorData = {
      ...currentEditorData,
      globalVariables: finalVariables,
      globalClasses: finalClasses,
    };

    await prisma.website.update({
      where: { id: websiteId },
      data: { editorData: updatedEditorData },
    });

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${imported.variables.length} variables and ${imported.classes.length} classes`,
      variables: finalVariables,
      classes: finalClasses,
      compiledCss,
    });
  } catch (error: any) {
    console.error("Error importing design system:", error);
    return res.status(400).json({ success: false, message: error.message || "Failed to import design system" });
  }
}
