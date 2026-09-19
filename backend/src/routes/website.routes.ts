import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { authorizeCapability } from "../services/permission.service.js";
import {
  getWebsitesHandler,
  getWebsiteByIdHandler,
  createWebsiteHandler,
  updateWebsiteHandler,
  deleteWebsiteHandler,
  getWebsiteRolesHandler,
  updateWebsiteRoleHandler,
  inviteWebsiteMemberHandler,
  revokeWebsiteInvitationHandler,
  resendWebsiteInvitationHandler,
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
  downloadStaticExportHandler,
} from "../controllers/publishing.controller.js";
import {
  connectWordPressHandler,
  getWordPressStatusHandler,
  verifyWordPressHandler,
  disconnectWordPressHandler,
  syncWordPressPagesHandler,
  handleWordPressWebhook,
  getAcfFieldsHandler,
  getToolsetFieldsHandler,
  getPodsFieldsHandler,
  syncGutenbergBlocksHandler,
  getMultisiteSitesHandler,
} from "../controllers/wordpress.controller.js";
import {
  schedulePublishHandler,
  cancelScheduledPublishHandler,
  promoteDeploymentHandler,
} from "../controllers/operations.controller.js";

const router = Router();

// Public endpoint for published websites (Unauthenticated, Comment 7 & 8)
router.get("/public/:id", getPublicWebsiteHandler);

// Public webhook endpoint for WordPress events (HMAC signature protected)
router.post("/:id/wordpress/webhook", handleWordPressWebhook);

// Protect all other website endpoints with authentication
router.use(requireAuth);

router.get("/", getWebsitesHandler);
router.post("/", createWebsiteHandler);
router.get("/:id", authorizeCapability("VIEW"), getWebsiteByIdHandler);
router.put("/:id", authorizeCapability("EDIT"), updateWebsiteHandler);
router.delete("/:id", authorizeCapability("DELETE"), deleteWebsiteHandler);

// WordPress Connector API
router.post("/:id/wordpress/connect", authorizeCapability("MANAGE_INTEGRATIONS"), connectWordPressHandler);
router.get("/:id/wordpress/status", authorizeCapability("VIEW"), getWordPressStatusHandler);
router.post("/:id/wordpress/verify", authorizeCapability("MANAGE_INTEGRATIONS"), verifyWordPressHandler);
router.post("/:id/wordpress/disconnect", authorizeCapability("MANAGE_INTEGRATIONS"), disconnectWordPressHandler);
router.post("/:id/wordpress/sync-pages", authorizeCapability("MANAGE_INTEGRATIONS"), syncWordPressPagesHandler);
router.get("/:id/wordpress/acf-fields", authorizeCapability("VIEW"), getAcfFieldsHandler);
router.get("/:id/wordpress/toolset-fields", authorizeCapability("VIEW"), getToolsetFieldsHandler);
router.get("/:id/wordpress/pods-fields", authorizeCapability("VIEW"), getPodsFieldsHandler);
router.post("/:id/wordpress/gutenberg-sync", authorizeCapability("MANAGE_INTEGRATIONS"), syncGutenbergBlocksHandler);
router.get("/:id/wordpress/multisite-sites", authorizeCapability("VIEW"), getMultisiteSitesHandler);


// Production Publishing & Deployment API
router.post("/:id/validate-publish", authorizeCapability("PUBLISH"), validatePublishHandler);
router.post("/:id/publish", authorizeCapability("PUBLISH"), publishWebsiteHandler);
router.get("/:id/deployments", authorizeCapability("VIEW"), getDeploymentsHandler);
router.get("/:id/deployments/:deploymentId", authorizeCapability("VIEW"), getDeploymentByIdHandler);
router.get("/:id/deployments/:deploymentId/export-download", authorizeCapability("VIEW"), downloadStaticExportHandler);
router.post("/:id/deployments/:deploymentId/rollback", authorizeCapability("ROLLBACK"), rollbackDeploymentHandler);
router.post("/:id/schedule-publish", authorizeCapability("PUBLISH"), schedulePublishHandler);
router.post("/:id/cancel-scheduled-publish", authorizeCapability("PUBLISH"), cancelScheduledPublishHandler);
router.post("/:id/promote", authorizeCapability("PUBLISH"), promoteDeploymentHandler);

// Revisions API
router.get("/:id/revisions", authorizeCapability("VIEW"), getWebsiteRevisionsHandler);
router.get("/:id/revisions/:revisionId", authorizeCapability("VIEW"), getRevisionByIdHandler);
router.post("/:id/revisions", authorizeCapability("EDIT"), createRevisionHandler);
router.post("/:id/revisions/:revisionId/restore", authorizeCapability("EDIT"), restoreRevisionHandler);

router.get("/:id/roles", authorizeCapability("VIEW"), getWebsiteRolesHandler);
router.put("/:id/roles/:collaboratorUserId", authorizeCapability("MANAGE_TEAM"), updateWebsiteRoleHandler);

router.post("/accept", acceptWebsiteInvitationHandler);
router.post("/:id/invite", authorizeCapability("MANAGE_TEAM"), inviteWebsiteMemberHandler);
router.delete("/:id/members/:collaboratorUserId", authorizeCapability("MANAGE_TEAM"), removeWebsiteMemberHandler);

router.post("/invitations/:inviteId/revoke", revokeWebsiteInvitationHandler);
router.post("/invitations/:inviteId/resend", resendWebsiteInvitationHandler);
router.post("/:id/invitations/:inviteId/revoke", authorizeCapability("MANAGE_TEAM"), revokeWebsiteInvitationHandler);
router.post("/:id/invitations/:inviteId/resend", authorizeCapability("MANAGE_TEAM"), resendWebsiteInvitationHandler);

router.get("/:id/permissions", authorizeCapability("MANAGE_TEAM"), getGranularPermissionsHandler);
router.post("/:id/permissions", authorizeCapability("MANAGE_TEAM"), setGranularPermissionHandler);

export default router;
