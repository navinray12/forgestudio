import { Request, Response } from "express";
import {
  getRemoteAdminOverview,
  generateWpAdminSso,
  optimizeRemoteDatabase,
} from "../services/wordpress/wpAdmin.service.js";

export async function getRemoteAdminOverviewHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const id = req.params.id as string;
  const overview = await getRemoteAdminOverview(id, userId);
  res.status(200).json({ success: true, ...overview });
}

export async function generateWpAdminSsoHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const id = req.params.id as string;
  const sso = await generateWpAdminSso(id, userId);
  res.status(200).json({ success: true, ...sso });
}

export async function optimizeRemoteDatabaseHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const id = req.params.id as string;
  const { cleanRevisions, cleanTransients, optimizeTables, emptyTrash } = req.body || {};

  const result = await optimizeRemoteDatabase(id, userId, {
    cleanRevisions: cleanRevisions ?? true,
    cleanTransients: cleanTransients ?? true,
    optimizeTables: optimizeTables ?? true,
    emptyTrash: emptyTrash ?? true,
  });

  res.status(200).json(result);
}
