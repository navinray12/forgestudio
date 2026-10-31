import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { generateAllCodeOutputs, buildProjectZipStream } from "../services/codeGenerator.service.js";
import { buildHelloThemeZipStream, generateHelloThemeFiles } from "../services/helloTheme.service.js";
import { getWebsiteById } from "../services/website.service.js";
import { normalizeGlobalRole } from "../services/permission.service.js";

const db = prisma as any;

/**
 * Validates and retrieves website with strict centralized authorization.
 * Fails closed if userId or websiteId is missing or invalid.
 */
async function getAuthorizedWebsite(websiteId: string, userId?: string) {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    return null;
  }
  if (!websiteId || typeof websiteId !== "string" || !websiteId.trim()) {
    return null;
  }

  const cleanWebsiteId = websiteId.trim();
  const cleanUserId = userId.trim();

  // 1. Delegate to centralized website authorization service (handles Owner, Collaborators, Workspace & Org members)
  try {
    const website = await getWebsiteById(cleanWebsiteId, cleanUserId);
    if (website) return website;
  } catch {
    // 2. Fallback check for global platform administrator privileges
    const user = await db.user.findUnique({ where: { id: cleanUserId } });
    if (user && user.role) {
      const normRole = normalizeGlobalRole(user.role);
      if (normRole === "SUPER_ADMIN" || normRole === "PLATFORM_ADMIN") {
        const site = await db.website.findUnique({ where: { id: cleanWebsiteId } });
        if (site) return site;
      }
    }
  }

  return null;
}

/**
 * GET /api/websites/:websiteId/export/preview
 * Generate and preview code outputs (HTML, CSS, JS, Optimized DOM, Semantic HTML, React, Tailwind, Next.js, Component Export).
 */
export async function getCodePreview(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "").trim();
    const userId = res.locals.user?.id || (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (!websiteId) {
      return res.status(400).json({ success: false, message: "Website ID is required" });
    }

    const scope = (req.query.scope as any) === "component" ? "component" : "full";
    const componentId = req.query.componentId ? String(req.query.componentId) : undefined;

    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const editorData = typeof website.editorData === "string"
      ? JSON.parse(website.editorData)
      : (website.editorData || {});

    const codeResult = generateAllCodeOutputs(editorData, { scope, componentId });

    return res.status(200).json({
      success: true,
      websiteId: website.id,
      websiteName: website.name,
      scope,
      componentId,
      code: codeResult,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/websites/:websiteId/export/zip
 * Download complete portable project or single component ZIP archive (static, react, tailwind, nextjs).
 */
export async function downloadProjectZip(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "").trim();
    const userId = res.locals.user?.id || (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (!websiteId) {
      return res.status(400).json({ success: false, message: "Website ID is required" });
    }

    const exportType = (req.query.type as any) || "static";
    const scope = (req.query.scope as any) === "component" ? "component" : "full";
    const componentId = req.query.componentId ? String(req.query.componentId) : undefined;

    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const editorData = typeof website.editorData === "string"
      ? JSON.parse(website.editorData)
      : (website.editorData || {});

    const zipBuffer = await buildProjectZipStream(editorData, exportType, scope, componentId);
    const safeSlug = (website.slug || website.name || "project").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = scope === "component" ? `component-${componentId || "export"}.zip` : `${safeSlug}-${exportType}-export.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(zipBuffer);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/plugins/wordpress/hello-theme/download
 * Download Hello Theme companion WordPress theme zip package (X-786).
 */
export async function downloadHelloThemeZip(_req: Request, res: Response) {
  try {
    const zipBuffer = await buildHelloThemeZipStream("Hello ForgeStudio");

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="hello-forgestudio-theme.zip"');
    return res.status(200).send(zipBuffer);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/plugins/wordpress/hello-theme/preview
 * Preview Hello Theme companion theme source files.
 */
export async function previewHelloThemeFiles(_req: Request, res: Response) {
  try {
    const files = generateHelloThemeFiles();
    return res.status(200).json({ success: true, theme: files });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
