import { Request, Response } from "express";
import { blockPatternService } from "../services/blocks/blockPattern.service.js";
import { resolveBlockBindings, transformBlock, validateAndNormalizeBlock } from "../services/blocks/blockEngine.service.js";

export async function listPatterns(req: Request, res: Response) {
  try {
    const { workspaceId, organizationId, category, isSynced, search } = req.query;
    const patterns = await blockPatternService.listPatterns({
      workspaceId: typeof workspaceId === "string" ? workspaceId : undefined,
      organizationId: typeof organizationId === "string" ? organizationId : undefined,
      category: typeof category === "string" ? category : undefined,
      isSynced: isSynced !== undefined ? isSynced === "true" : undefined,
      search: typeof search === "string" ? search : undefined,
    });
    return res.json({ success: true, data: patterns });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || "Failed to fetch block patterns" });
  }
}

export async function getPatternById(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const pattern = await blockPatternService.getPatternById(id);
    if (!pattern) {
      return res.status(404).json({ success: false, error: "Block pattern not found" });
    }
    return res.json({ success: true, data: pattern });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || "Failed to fetch pattern" });
  }
}

export async function createPattern(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id || req.body.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "User authentication required" });
    }

    const pattern = await blockPatternService.createPattern({
      ...req.body,
      userId,
    });
    return res.status(201).json({ success: true, data: pattern });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error?.message || "Failed to create pattern" });
  }
}

export async function updatePattern(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id || req.body.userId || "system";
    const pattern = await blockPatternService.updatePattern(id, req.body, userId);
    return res.json({ success: true, data: pattern });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error?.message || "Failed to update pattern" });
  }
}

export async function deletePattern(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    await blockPatternService.deletePattern(id);
    return res.json({ success: true, message: "Pattern deleted successfully" });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error?.message || "Failed to delete pattern" });
  }
}

export async function detachSyncedPattern(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const blocks = await blockPatternService.detachSyncedPattern(id);
    return res.json({ success: true, data: blocks });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error?.message || "Failed to detach synced pattern" });
  }
}

export async function resolveBindings(req: Request, res: Response) {
  try {
    const { block, context } = req.body;
    if (!block) {
      return res.status(400).json({ success: false, error: "Missing block payload" });
    }
    const resolved = resolveBlockBindings(block, context || {});
    return res.json({ success: true, data: resolved });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error?.message || "Failed to resolve block bindings" });
  }
}

export async function transformBlockEndpoint(req: Request, res: Response) {
  try {
    const { block, targetType } = req.body;
    if (!block || !targetType) {
      return res.status(400).json({ success: false, error: "Missing block or targetType payload" });
    }
    const result = transformBlock(block, targetType);
    return res.json({ success: result.success, data: result.transformedBlock, error: result.error });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error?.message || "Failed to transform block" });
  }
}
