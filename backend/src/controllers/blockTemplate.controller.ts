import { Request, Response } from "express";
import { BlockTemplateService } from "../services/blocks/blockTemplate.service.js";
import { TemplatePartService } from "../services/blocks/templatePart.service.js";
import { GlobalStyleService } from "../services/blocks/globalStyle.service.js";

export async function listBlockTemplatesHandler(req: Request, res: Response): Promise<void> {
  try {
    const { workspaceId, type, search } = req.query;
    const templates = await BlockTemplateService.listTemplates({
      workspaceId: workspaceId ? String(workspaceId) : undefined,
      type: type ? (String(type) as any) : undefined,
      search: search ? String(search) : undefined,
    });
    res.status(200).json({ success: true, templates });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createBlockTemplateHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id || "00000000-0000-0000-0000-000000000000";
    const template = await BlockTemplateService.createTemplate({
      ...req.body,
      userId,
    });
    res.status(201).json({ success: true, template });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function updateBlockTemplateHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const template = await BlockTemplateService.updateTemplate(id, req.body);
    res.status(200).json({ success: true, template });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function deleteBlockTemplateHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    await BlockTemplateService.deleteTemplate(id);
    res.status(200).json({ success: true, message: "Template deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function listTemplatePartsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { workspaceId, area, search } = req.query;
    const templateParts = await TemplatePartService.listTemplateParts({
      workspaceId: workspaceId ? String(workspaceId) : undefined,
      area: area ? (String(area) as any) : undefined,
      search: search ? String(search) : undefined,
    });
    res.status(200).json({ success: true, templateParts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createTemplatePartHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id || "00000000-0000-0000-0000-000000000000";
    const templatePart = await TemplatePartService.createTemplatePart({
      ...req.body,
      userId,
    });
    res.status(201).json({ success: true, templatePart });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function getGlobalStylesHandler(req: Request, res: Response): Promise<void> {
  try {
    const { workspaceId } = req.query;
    const styles = await GlobalStyleService.getGlobalStyles(workspaceId ? String(workspaceId) : undefined);
    const compiledCss = GlobalStyleService.compileGlobalStylesToCss(styles);
    res.status(200).json({ success: true, styles, compiledCss });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function saveGlobalStylesHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id || "00000000-0000-0000-0000-000000000000";
    const saved = await GlobalStyleService.saveGlobalStyles({
      ...req.body,
      userId,
    });
    res.status(200).json({ success: true, saved });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}
