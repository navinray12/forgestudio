/**
 * @file Workspaces: HTTP route registration and middleware order.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import { requireAuth } from "../authentication/session-authentication.middleware.js";
import * as workspaceController from "./workspace.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/accept", workspaceController.acceptInvitationHandler);

router.get("/", workspaceController.getUserWorkspacesHandler);
router.post("/", workspaceController.createWorkspaceHandler);

router.get("/:id", workspaceController.getWorkspaceHandler);

router.post("/:id/members", workspaceController.addMemberHandler);
router.delete("/:id/members/:userId", workspaceController.removeMemberHandler);
router.post("/:id/invitations", workspaceController.inviteMemberHandler);

router.post("/:id/support-grants", workspaceController.createSupportGrantHandler);
router.delete("/:id/support-grants/:grantId", workspaceController.revokeSupportGrantHandler);

export default router;
