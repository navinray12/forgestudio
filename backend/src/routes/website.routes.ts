import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getWebsitesHandler,
  getWebsiteByIdHandler,
  createWebsiteHandler,
  updateWebsiteHandler,
  deleteWebsiteHandler,
  getWebsiteRolesHandler,
  updateWebsiteRoleHandler,
  inviteWebsiteMemberHandler,
  acceptWebsiteInvitationHandler,
  removeWebsiteMemberHandler,
  getGranularPermissionsHandler,
  setGranularPermissionHandler,
  getPublicWebsiteHandler,
} from "../controllers/website.controller.js";
import {
  getWebsiteRevisionsHandler,
  getRevisionByIdHandler,
  createRevisionHandler,
  restoreRevisionHandler,
} from "../controllers/revision.controller.js";
import {
  validatePublishHandler,
  publishWebsiteHandler,
  getDeploymentsHandler,
  getDeploymentByIdHandler,
  rollbackDeploymentHandler,
} from "../controllers/publishing.controller.js";
import {
  connectWordPressHandler,
  getWordPressStatusHandler,
  verifyWordPressHandler,
  disconnectWordPressHandler,
  syncWordPressPagesHandler,
  handleWordPressWebhook,
} from "../controllers/wordpress.controller.js";

const router = Router();

// Public endpoint for published websites (Unauthenticated, Comment 7 & 8)
router.get("/public/:id", getPublicWebsiteHandler);

// Public webhook endpoint for WordPress events (HMAC signature protected)
router.post("/:id/wordpress/webhook", handleWordPressWebhook);

// Protect all other website endpoints with authentication
router.use(requireAuth);

router.get("/", getWebsitesHandler);
router.post("/", createWebsiteHandler);
router.get("/:id", getWebsiteByIdHandler);
router.put("/:id", updateWebsiteHandler);
router.delete("/:id", deleteWebsiteHandler);

// WordPress Connector API
router.post("/:id/wordpress/connect", connectWordPressHandler);
router.get("/:id/wordpress/status", getWordPressStatusHandler);
router.post("/:id/wordpress/verify", verifyWordPressHandler);
router.post("/:id/wordpress/disconnect", disconnectWordPressHandler);
router.post("/:id/wordpress/sync-pages", syncWordPressPagesHandler);

// Production Publishing & Deployment API
router.post("/:id/validate-publish", validatePublishHandler);
router.post("/:id/publish", publishWebsiteHandler);
router.get("/:id/deployments", getDeploymentsHandler);
router.get("/:id/deployments/:deploymentId", getDeploymentByIdHandler);
router.post("/:id/deployments/:deploymentId/rollback", rollbackDeploymentHandler);

// Revisions API
router.get("/:id/revisions", getWebsiteRevisionsHandler);
router.get("/:id/revisions/:revisionId", getRevisionByIdHandler);
router.post("/:id/revisions", createRevisionHandler);
router.post("/:id/revisions/:revisionId/restore", restoreRevisionHandler);

router.get("/:id/roles", getWebsiteRolesHandler);
router.put("/:id/roles/:collaboratorUserId", updateWebsiteRoleHandler);

router.post("/accept", acceptWebsiteInvitationHandler);
router.post("/:id/invite", inviteWebsiteMemberHandler);
router.delete("/:id/members/:collaboratorUserId", removeWebsiteMemberHandler);

router.get("/:id/permissions", getGranularPermissionsHandler);
router.post("/:id/permissions", setGranularPermissionHandler);

export default router;

