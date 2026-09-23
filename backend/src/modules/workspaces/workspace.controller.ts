/**
 * @file Workspaces: HTTP handlers that translate requests into module operations and responses.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { Request, Response, NextFunction } from "express";
import * as workspaceService from "./workspace.service.js";
import * as membershipService from "./workspace-membership.service.js";
import { AppError } from "../../platform/http/app-error.js";

/**
 * Create Workspace Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function createWorkspaceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, slug, organizationId, settings } = req.body;
    const workspace = await workspaceService.createWorkspace(res.locals.user.id, name, slug, organizationId, settings);
    res.status(201).json({ success: true, workspace });
  } catch (error) { next(error); }
}

/**
 * Get User Workspaces Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function getUserWorkspacesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaces = await workspaceService.getUserWorkspaces(res.locals.user.id);
    res.json({ success: true, workspaces });
  } catch (error) { next(error); }
}

/**
 * Get Workspace Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function getWorkspaceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const workspace = await workspaceService.getWorkspace(req.params.id as string, res.locals.user.id);
    res.json({ success: true, workspace });
  } catch (error) { next(error); }
}

/**
 * Add Member Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function addMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { targetUserId, role } = req.body;
    const member = await workspaceService.addWorkspaceMember(req.params.id as string, res.locals.user.id, targetUserId, role);
    res.json({ success: true, member });
  } catch (error) { next(error); }
}

/**
 * Remove Member Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function removeMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await workspaceService.removeWorkspaceMember(req.params.id as string, res.locals.user.id, req.params.userId as string);
    res.json({ success: true });
  } catch (error) { next(error); }
}

/**
 * Invite Member Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function inviteMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, role } = req.body;
    const result = await membershipService.inviteToWorkspace(req.params.id as string, res.locals.user.id, email, role);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

/**
 * Accept Invitation Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function acceptInvitationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.body;
    if (typeof token !== "string" || !token) {
      throw new AppError("An invitation token is required.", 400, "BAD_REQUEST");
    }
    const result = await membershipService.acceptWorkspaceInvitation(token, res.locals.user.id);
    res.json(result);
  } catch (error) { next(error); }
}

/**
 * Create Support Grant Handler. Requires the caller to already hold a platform
 * administrator role (enforced inside the service, not merely by this route).
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function createSupportGrantHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { granteeId, reason, ttlMs } = req.body;
    const grant = await membershipService.createSupportGrant(
      req.params.id as string,
      granteeId,
      reason,
      res.locals.user.id,
      typeof ttlMs === "number" ? ttlMs : undefined,
    );
    res.status(201).json({ success: true, grant });
  } catch (error) { next(error); }
}

/**
 * Revoke Support Grant Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function revokeSupportGrantHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await membershipService.revokeSupportGrant(req.params.grantId as string, res.locals.user.id);
    res.json(result);
  } catch (error) { next(error); }
}
