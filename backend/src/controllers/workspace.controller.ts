import type { Request, Response, NextFunction } from "express";
import {
  createWorkspace,
  getWorkspace,
  getUserWorkspaces,
  addWorkspaceMember,
  removeWorkspaceMember,
  assignWebsiteToWorkspace,
} from "../services/workspace.service.js";

export async function getUserWorkspacesHandler(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const workspaces = await getUserWorkspaces(user.id);
    return res.status(200).json({ success: true, workspaces });
  } catch (err) {
    next(err);
  }
}

export async function createWorkspaceHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const { name, slug, organizationId, settings } = req.body;
    const workspace = await createWorkspace(user.id, name, slug, organizationId, settings);
    return res.status(201).json({ success: true, workspace });
  } catch (err) {
    next(err);
  }
}

export async function getWorkspaceHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const wsId = String(req.params.id);
    const workspace = await getWorkspace(wsId, user.id);
    return res.status(200).json({ success: true, workspace });
  } catch (err) {
    next(err);
  }
}

export async function addWorkspaceMemberHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const wsId = String(req.params.id);
    const { userId, role } = req.body;
    const member = await addWorkspaceMember(wsId, user.id, String(userId), role);
    return res.status(201).json({ success: true, member });
  } catch (err) {
    next(err);
  }
}

export async function removeWorkspaceMemberHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const wsId = String(req.params.id);
    const targetUserId = String(req.params.userId);
    const result = await removeWorkspaceMember(wsId, user.id, targetUserId);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function assignWebsiteToWorkspaceHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const wsId = String(req.params.id);
    const websiteId = String(req.params.websiteId);
    const updated = await assignWebsiteToWorkspace(websiteId, wsId, user.id);
    return res.status(200).json({ success: true, website: updated });
  } catch (err) {
    next(err);
  }
}
