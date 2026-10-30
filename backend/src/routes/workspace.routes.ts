import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  listWorkspacesHandler,
  getUserWorkspacesHandler,
  createWorkspaceHandler,
  getWorkspaceHandler,
  addWorkspaceMemberHandler,
  removeWorkspaceMemberHandler,
  updateWorkspaceMemberRoleHandler,
  assignWebsiteToWorkspaceHandler,
  createWorkspaceInvitationHandler,
  listWorkspaceInvitationsHandler,
  cancelWorkspaceInvitationHandler,
  getMyPendingWorkspaceInvitationsHandler,
  acceptWorkspaceInvitationHandler,
  declineWorkspaceInvitationHandler,
} from "../controllers/workspace.controller.js";

const router = Router();

// All workspace routes require session authentication
router.use(requireAuth);

// User-level invitation actions (MUST be defined before /:id)
router.get("/invitations/pending", getMyPendingWorkspaceInvitationsHandler);
router.post("/invitations/accept", acceptWorkspaceInvitationHandler);
router.post("/invitations/decline", declineWorkspaceInvitationHandler);
router.post("/invitations/:inviteId/accept", acceptWorkspaceInvitationHandler);
router.post("/invitations/:inviteId/decline", declineWorkspaceInvitationHandler);

// Workspace collection routes
router.get("/", listWorkspacesHandler);
router.post("/", createWorkspaceHandler);

// Specific workspace routes
router.get("/:id", getWorkspaceHandler);
router.post("/:id/members", addWorkspaceMemberHandler);
router.patch("/:id/members/:userId", updateWorkspaceMemberRoleHandler);
router.delete("/:id/members/:userId", removeWorkspaceMemberHandler);

// Workspace website assignment (both query and parameter based)
router.post("/:id/assign-website", assignWebsiteToWorkspaceHandler);
router.post("/:id/websites/:websiteId", assignWebsiteToWorkspaceHandler);

// Workspace-scoped invitation routes
router.get("/:id/invitations", listWorkspaceInvitationsHandler);
router.post("/:id/invitations", createWorkspaceInvitationHandler);
router.post("/:id/invitations/:inviteId/cancel", cancelWorkspaceInvitationHandler);

export default router;
