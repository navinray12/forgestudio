/**
 * @file Websites: HTTP route registration and middleware order. File responsibility: website routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import { requireAuth } from "../authentication/session-authentication.middleware.js";
import { authorizeCapability } from "../permissions/permission.service.js";
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
} from "./website.controller.js";
import {
  getWebsiteRevisionsHandler,
  getRevisionByIdHandler,
  createRevisionHandler,
  restoreRevisionHandler,
} from "../revisions/revision.controller.js";
import {
  validatePublishHandler,
  publishWebsiteHandler,
  getDeploymentsHandler,
  getDeploymentByIdHandler,
  rollbackDeploymentHandler,
  downloadStaticExportHandler,
} from "../publishing/publishing.controller.js";
import {
  connectWordPressHandler,
  getWordPressStatusHandler,
  verifyWordPressHandler,
  disconnectWordPressHandler,
  syncWordPressPagesHandler,
  handleWordPressWebhook,
} from "../wordpress-connections/wordpress.controller.js";

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

// Production Publishing & Deployment API
router.post("/:id/validate-publish", authorizeCapability("PUBLISH"), validatePublishHandler);
router.post("/:id/publish", authorizeCapability("PUBLISH"), publishWebsiteHandler);
router.get("/:id/deployments", authorizeCapability("VIEW"), getDeploymentsHandler);
router.get("/:id/deployments/:deploymentId", authorizeCapability("VIEW"), getDeploymentByIdHandler);
router.get("/:id/deployments/:deploymentId/export-download", authorizeCapability("VIEW"), downloadStaticExportHandler);
router.post("/:id/deployments/:deploymentId/rollback", authorizeCapability("ROLLBACK"), rollbackDeploymentHandler);

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

router.get("/:id/permissions", authorizeCapability("MANAGE_TEAM"), getGranularPermissionsHandler);
router.post("/:id/permissions", authorizeCapability("MANAGE_TEAM"), setGranularPermissionHandler);

export default router;
