import type { Request, Response, NextFunction } from "express";
import {
  getUserWorkspaces,
  createWorkspace,
  getWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  assignWebsiteToWorkspace,
  inviteWorkspaceMember,
  getWorkspaceInvitations,
  getMyPendingWorkspaceInvitations,
  acceptWorkspaceInvitation,
  declineWorkspaceInvitation,
  cancelWorkspaceInvitation,
} from "../services/workspace.service.js";
import { AppError } from "../utils/app-error.js";

/**
 * GET /api/v1/workspaces
 * List all workspaces the authenticated user belongs to
 */
export async function listWorkspacesHandler(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    if (!user?.id) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const workspaces = await getUserWorkspaces(user.id);

    return res.status(200).json({
      success: true,
      workspaces: workspaces.map((w: any) => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        ownerId: w.ownerId,
        organizationId: w.organizationId,
        userRole: w.members?.[0]?.role || (w.ownerId === user.id ? "OWNER" : "MEMBER"),
        _count: w._count,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/workspaces
 * Create a new workspace
 */
export async function createWorkspaceHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    if (!user?.id) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const { name, slug, organizationId, settings } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new AppError("Workspace name is required", 400, "BAD_REQUEST");
    }

    const workspace = await createWorkspace(
      user.id,
      name.trim(),
      slug,
      organizationId,
      settings
    );

    return res.status(201).json({
      success: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        ownerId: workspace.ownerId,
        organizationId: workspace.organizationId,
        userRole: "OWNER",
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/workspaces/:id
 * Get workspace details with access control
 */
export async function getWorkspaceHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    if (!user?.id) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const workspaceId = req.params.id as string;
    const workspace = await getWorkspace(workspaceId, user.id);

    return res.status(200).json({
      success: true,
      workspace,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/workspaces/:id/members
 * Add a member to a workspace (Owner/Admin only)
 */
export async function addWorkspaceMemberHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    if (!user?.id) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const workspaceId = req.params.id as string;
    const { targetUserId, role } = req.body;

    if (!targetUserId) {
      throw new AppError("targetUserId is required", 400, "BAD_REQUEST");
    }

    const member = await addWorkspaceMember(
      workspaceId,
      user.id,
      targetUserId,
      role || "MEMBER"
    );

    return res.status(201).json({
      success: true,
      member,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/workspaces/:id/members/:userId
 * Remove a member from a workspace
 */
export async function removeWorkspaceMemberHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    if (!user?.id) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const workspaceId = req.params.id as string;
    const targetUserId = req.params.userId as string;

    const result = await removeWorkspaceMember(workspaceId, user.id, targetUserId);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/workspaces/:id/members/:userId
 * Update a member's role (Owner/Admin only)
 */
export async function updateWorkspaceMemberRoleHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    if (!user?.id) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const workspaceId = req.params.id as string;
    const targetUserId = req.params.userId as string;
    const { role } = req.body;

    if (!role || typeof role !== "string") {
      throw new AppError("Role is required", 400, "BAD_REQUEST");
    }

    const updated = await updateWorkspaceMemberRole(
      workspaceId,
      user.id,
      targetUserId,
      role.trim().toUpperCase()
    );

    return res.status(200).json({
      success: true,
      member: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/workspaces/:id/assign-website
 * Assign a website to a workspace
 */
export async function assignWebsiteToWorkspaceHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    if (!user?.id) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const workspaceId = req.params.id as string;
    const { websiteId } = req.body;

    if (!websiteId) {
      throw new AppError("websiteId is required", 400, "BAD_REQUEST");
    }

    const updated = await assignWebsiteToWorkspace(websiteId, workspaceId, user.id);

    return res.status(200).json({
      success: true,
      website: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/workspaces/:id/invitations
 * Invite a registered user to the workspace
 */
export async function createWorkspaceInvitationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    if (!user?.id) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const workspaceId = req.params.id as string;
    const { email, role } = req.body;

    const result = await inviteWorkspaceMember(workspaceId, user.id, email, role);

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/workspaces/:id/invitations
 * List all invitations for a workspace (Owner/Admin)
 */
export async function listWorkspaceInvitationsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    if (!user?.id) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const workspaceId = req.params.id as string;
    const invitations = await getWorkspaceInvitations(workspaceId, user.id);

    return res.status(200).json({
      success: true,
      invitations,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/workspaces/:id/invitations/:inviteId/cancel
 * Cancel a workspace invitation (Owner/Admin)
 */
export async function cancelWorkspaceInvitationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    if (!user?.id) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const inviteId = req.params.inviteId as string;
    const result = await cancelWorkspaceInvitation(inviteId, user.id);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/workspaces/invitations/pending
 * List pending invitations for the current user
 */
export async function getMyPendingWorkspaceInvitationsHandler(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    if (!user?.id) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const invitations = await getMyPendingWorkspaceInvitations(user.id);

    return res.status(200).json({
      success: true,
      invitations,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/workspaces/invitations/:inviteId/accept
 * Accept an invitation (Intended invitee only)
 */
export async function acceptWorkspaceInvitationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    if (!user?.id) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const identifier = (req.params.inviteId || req.body.invitationId || req.body.token) as string;
    const result = await acceptWorkspaceInvitation(identifier, user.id);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/workspaces/invitations/:inviteId/decline
 * Decline an invitation (Intended invitee only)
 */
export async function declineWorkspaceInvitationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    if (!user?.id) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const identifier = (req.params.inviteId || req.body.invitationId || req.body.token) as string;
    const result = await declineWorkspaceInvitation(identifier, user.id);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
