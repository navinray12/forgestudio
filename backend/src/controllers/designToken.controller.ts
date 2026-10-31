import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import {
  validateVariables,
  validateClasses,
  compileDesignSystemCss,
  exportDesignSystem,
  importDesignSystem,
} from "../services/tokens/designToken.service.js";
import { canUserAccessResource } from "../services/permission.service.js";

/**
 * GET /api/websites/:websiteId/design-system
 */
export async function getDesignSystem(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;

    if (!websiteId) {
      return res.status(400).json({ success: false, message: "websiteId is required" });
    }

    const canView = await canUserAccessResource(userId, websiteId, "*", "VIEW");
    if (!canView) {
      return res.status(403).json({ success: false, message: "Forbidden: Access to website design system denied" });
    }

    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { id: true, name: true, slug: true, version: true, editorData: true },
    });

    if (!website) {
      return res.status(404).json({ success: false, message: "Website not found" });
    }

    const editorData: any = website.editorData || {};
    const variables = validateVariables(editorData.globalVariables || []);
    const classes = validateClasses(editorData.globalClasses || []);
    const compiledCss = compileDesignSystemCss(variables, classes);

    return res.status(200).json({
      success: true,
      websiteId,
      version: website.version,
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
    const { variables, classes, expectedVersion } = req.body;

    if (!websiteId) {
      return res.status(400).json({ success: false, message: "websiteId is required" });
    }

    // Role-based capability check: must have EDIT_DESIGN permission
    const canEdit = await canUserAccessResource(userId, websiteId, "*", "EDIT_DESIGN");

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Your role does not have permission to manage global design tokens or classes",
      });
    }

    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { id: true, name: true, slug: true, version: true, editorData: true },
    });

    if (!website) {
      return res.status(404).json({ success: false, message: "Website not found" });
    }

    if (expectedVersion === undefined || expectedVersion === null) {
      return res.status(400).json({
        success: false,
        code: "EXPECTED_VERSION_REQUIRED",
        message: "expectedVersion revision is strictly required for design system updates to prevent concurrent save conflicts.",
      });
    }

    const expVer = Number(expectedVersion);
    if (isNaN(expVer) || expVer < 1) {
      return res.status(400).json({ success: false, message: "Invalid expectedVersion revision" });
    }

    const currentEditorData: any = website.editorData || {};
    const finalVars = variables !== undefined ? validateVariables(variables) : validateVariables(currentEditorData.globalVariables || []);
    const finalClasses = classes !== undefined ? validateClasses(classes) : validateClasses(currentEditorData.globalClasses || []);
    const compiledCss = compileDesignSystemCss(finalVars, finalClasses);

    const varsJson = JSON.stringify(finalVars);
    const classesJson = JSON.stringify(finalClasses);

    const updatedRows = await prisma.$queryRaw<any[]>`
      UPDATE websites
      SET "editorData" = jsonb_set(
            jsonb_set(
              COALESCE("editorData", '{}'::jsonb),
              '{globalVariables}',
              ${varsJson}::jsonb,
              true
            ),
            '{globalClasses}',
            ${classesJson}::jsonb,
            true
          ),
          "version" = "version" + 1,
          "updatedAt" = NOW()
      WHERE id = ${websiteId}::uuid
        AND "version" = ${expVer}
      RETURNING id, "version", "updatedAt"
    `;

    if (!updatedRows || updatedRows.length === 0) {
      return res.status(409).json({
        success: false,
        code: "STALE_VERSION_CONFLICT",
        message: "This website was modified in another session. Please reload before saving design tokens.",
      });
    }

    const newVersion = updatedRows[0].version;

    // Record audit log
    try {
      if ((prisma as any).auditLog) {
        await (prisma as any).auditLog.create({
          data: {
            userId: userId || null,
            action: "design_system.update",
            details: `Updated ${finalVars.length} variables and ${finalClasses.length} global classes for website ${website.name} (v${newVersion})`,
          },
        });
      }
    } catch {
      // safe fallback
    }

    return res.status(200).json({
      success: true,
      message: "Design system updated successfully",
      version: newVersion,
      variables: finalVars,
      classes: finalClasses,
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

    const canView = await canUserAccessResource(userId, websiteId, "*", "VIEW");
    if (!canView) {
      return res.status(403).json({ success: false, message: "Forbidden: Access denied" });
    }

    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { id: true, name: true, slug: true, editorData: true },
    });

    if (!website) {
      return res.status(404).json({ success: false, message: "Website not found" });
    }

    const editorData: any = website.editorData || {};
    const payload = exportDesignSystem(
      editorData.globalVariables || [],
      editorData.globalClasses || [],
      { websiteId: website.id, websiteName: website.name }
    );

    res.setHeader("Content-Disposition", `attachment; filename="${website.slug || "website"}-design-tokens.json"`);
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
    const { payload, mode = "merge", expectedVersion } = req.body; // mode: "replace" | "merge" | "skip"

    const canEdit = await canUserAccessResource(userId, websiteId, "*", "EDIT_DESIGN");

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to import a design system",
      });
    }

    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { id: true, name: true, slug: true, version: true, editorData: true },
    });

    if (!website) {
      return res.status(404).json({ success: false, message: "Website not found" });
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

      const varMap = new Map<string, any>();
      for (const v of existingVars) varMap.set(v.token, v);
      for (const v of imported.variables) varMap.set(v.token, v);
      finalVariables = Array.from(varMap.values());

      const clsMap = new Map<string, any>();
      for (const c of existingClasses) clsMap.set(c.className, c);
      for (const c of imported.classes) clsMap.set(c.className, c);
      finalClasses = Array.from(clsMap.values());
    } else if (mode === "skip") {
      const existingVars = validateVariables(currentEditorData.globalVariables || []);
      const existingClasses = validateClasses(currentEditorData.globalClasses || []);

      const existingTokenSet = new Set(existingVars.map((v) => v.token));
      const existingClassSet = new Set(existingClasses.map((c) => c.className));

      finalVariables = [
        ...existingVars,
        ...imported.variables.filter((v) => !existingTokenSet.has(v.token)),
      ];
      finalClasses = [
        ...existingClasses,
        ...imported.classes.filter((c) => !existingClassSet.has(c.className)),
      ];
    }

    if (expectedVersion === undefined || expectedVersion === null) {
      return res.status(400).json({
        success: false,
        code: "EXPECTED_VERSION_REQUIRED",
        message: "expectedVersion revision is strictly required for design system imports to prevent concurrent save conflicts.",
      });
    }

    const expVer = Number(expectedVersion);
    if (isNaN(expVer) || expVer < 1) {
      return res.status(400).json({ success: false, message: "Invalid expectedVersion revision" });
    }

    const compiledCss = compileDesignSystemCss(finalVariables, finalClasses);
    const varsJson = JSON.stringify(finalVariables);
    const classesJson = JSON.stringify(finalClasses);

    const updatedRows = await prisma.$queryRaw<any[]>`
      UPDATE websites
      SET "editorData" = jsonb_set(
            jsonb_set(
              COALESCE("editorData", '{}'::jsonb),
              '{globalVariables}',
              ${varsJson}::jsonb,
              true
            ),
            '{globalClasses}',
            ${classesJson}::jsonb,
            true
          ),
          "version" = "version" + 1,
          "updatedAt" = NOW()
      WHERE id = ${websiteId}::uuid
        AND "version" = ${expVer}
      RETURNING id, "version", "updatedAt"
    `;

    if (!updatedRows || updatedRows.length === 0) {
      return res.status(409).json({
        success: false,
        code: "STALE_VERSION_CONFLICT",
        message: "Conflict: website was updated elsewhere. Import cancelled.",
      });
    }

    const newVersion = updatedRows[0].version;

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${imported.variables.length} variables and ${imported.classes.length} classes (${mode} mode)`,
      version: newVersion,
      variables: finalVariables,
      classes: finalClasses,
      compiledCss,
    });
  } catch (error: any) {
    console.error("Error importing design system:", error);
    return res.status(400).json({ success: false, message: error.message || "Failed to import design system" });
  }
}

