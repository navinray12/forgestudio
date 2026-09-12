import type { Request, Response, NextFunction } from "express";
import {
  getUserWebsites,
  getWebsiteById,
  createWebsite,
  updateWebsiteEditorData,
  deleteWebsite,
} from "../services/website.service.js";

/**
 * GET /api/websites
 * Fetch all websites for current authenticated user
 */
export async function getWebsitesHandler(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websites = await getUserWebsites(user.id);

    return res.status(200).json({
      success: true,
      websites,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/websites/:id
 * Get single website details and editor JSON data
 */
export async function getWebsiteByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;

    const website = await getWebsiteById(websiteId, user.id);

    return res.status(200).json({
      success: true,
      website,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/websites
 * Create a new website with subscription limit validation
 */
export async function createWebsiteHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const { name } = req.body;

    const website = await createWebsite(user.id, name);

    return res.status(201).json({
      success: true,
      message: "Website created successfully",
      website,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/websites/:id
 * Save updated editor JSON data
 */
export async function updateWebsiteHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;
    const { editorData, performanceSettings } = req.body;

    const website = await updateWebsiteEditorData(websiteId, user.id, editorData, performanceSettings);

    return res.status(200).json({
      success: true,
      message: "Website saved successfully",
      website,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/websites/:id
 * Delete a user's website
 */
export async function deleteWebsiteHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;

    await deleteWebsite(websiteId, user.id);

    return res.status(200).json({
      success: true,
      message: "Website deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function getWebsiteRolesHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;

    // Using default service to import
    const { getWebsiteRoles } = await import("../services/website.service.js");
    const roles = await getWebsiteRoles(websiteId, user.id);

    return res.status(200).json({
      success: true,
      roles,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateWebsiteRoleHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;
    const collaboratorUserId = req.params.collaboratorUserId as string;
    const { role } = req.body;

    const { updateWebsiteRole } = await import("../services/website.service.js");
    const result = await updateWebsiteRole(websiteId, user.id, collaboratorUserId, role);

    return res.status(200).json({
      success: true,
      message: "Role updated successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function inviteWebsiteMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, role } = req.body;
    const { inviteWebsiteMember } = await import("../services/website.service.js");
    const result = await inviteWebsiteMember(req.params.id as string, res.locals.user.id, email, role);
    return res.status(200).json({ success: true, ...result });
  } catch (error) { next(error); }
}

export async function acceptWebsiteInvitationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.body;
    const { acceptWebsiteInvitation } = await import("../services/website.service.js");
    const result = await acceptWebsiteInvitation(token, res.locals.user.id);
    return res.status(200).json({ ...result, success: true });
  } catch (error) { next(error); }
}

export async function removeWebsiteMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { removeWebsiteMember } = await import("../services/website.service.js");
    await removeWebsiteMember(req.params.id as string, res.locals.user.id, req.params.collaboratorUserId as string);
    return res.status(200).json({ success: true, message: "Member removed" });
  } catch (error) { next(error); }
}

export async function getGranularPermissionsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { getGranularPermissions } = await import("../services/permission.service.js");
    const result = await getGranularPermissions(req.params.id as string, res.locals.user.id);
    return res.status(200).json({ success: true, permissions: result });
  } catch (error) { next(error); }
}

export async function setGranularPermissionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { targetUserId, resourceId, capability, effect } = req.body;
    const { setGranularPermission } = await import("../services/permission.service.js");
    const result = await setGranularPermission(req.params.id as string, res.locals.user.id, targetUserId, resourceId, capability, effect);
    return res.status(200).json({ ...result, success: true });
  } catch (error) { next(error); }
}

/**
 * GET /api/v1/websites/public/:id
 * Public unauthenticated endpoint for published website runtime (Comment 7 & 8)
 */
export async function getPublicWebsiteHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const websiteId = req.params.id as string;
    const { getPublicWebsiteById } = await import("../services/website.service.js");
    const website = await getPublicWebsiteById(websiteId);

    return res.status(200).json({
      success: true,
      website,
    });
  } catch (error) {
    next(error);
  }
}
