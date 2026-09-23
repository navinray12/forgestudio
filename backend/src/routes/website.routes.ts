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
  getManagedWebsiteDetailsHandler,
  getCookieConsentHandler,
  updateCookieConsentHandler,
} from "../controllers/website.controller.js";
import {
  getMailerConfigHandler,
  saveMailerConfigHandler,
  testMailerConnectionHandler,
  getDeliveryLogsHandler,
} from "../controllers/mailer.controller.js";
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
  downloadLatestStaticExportHandler,
  getReleasesHandler,
  instantRollbackHandler,
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
import {
  bulkVerifyHandler,
  bulkSyncHandler,
  bulkDeleteHandler,
} from "../controllers/bulkOperations.controller.js";
import {
  runPerformanceAuditHandler,
  getPerformanceMetricsHandler,
} from "../controllers/performance.controller.js";
import {
  optimizeImageHandler,
  getOptimizationStatsHandler,
} from "../controllers/imageOptimization.controller.js";
import {
  getRemoteAdminOverviewHandler,
  generateWpAdminSsoHandler,
  optimizeRemoteDatabaseHandler,
} from "../controllers/wpAdmin.controller.js";
import {
  analyzeSeoHandler,
  auditImagesHandler,
  auditAccessibilityHandler,
  generateStructuredDataHandler,
  saveWebsiteSeoHandler,
} from "../controllers/seo.controller.js";

const router = Router();

// Public endpoint for published websites (Unauthenticated, Comment 7 & 8)
router.get("/public/:id", getPublicWebsiteHandler);

// Public webhook endpoint for WordPress events (HMAC signature protected)
router.post("/:id/wordpress/webhook", handleWordPressWebhook);

// Protect all other website endpoints with authentication
router.use(requireAuth);

// Bulk Operations API (F-430) - Must precede /:id
router.post("/bulk/verify", bulkVerifyHandler);
router.post("/bulk/sync", bulkSyncHandler);
router.post("/bulk/delete", bulkDeleteHandler);

router.get("/", getWebsitesHandler);
router.post("/", createWebsiteHandler);
router.get("/:id", authorizeCapability("VIEW"), getWebsiteByIdHandler);
router.get("/:id/managed-details", authorizeCapability("VIEW"), getManagedWebsiteDetailsHandler);
router.put("/:id", authorizeCapability("EDIT"), updateWebsiteHandler);
router.delete("/:id", authorizeCapability("DELETE"), deleteWebsiteHandler);

// Cookie Consent (F-438)
router.get("/:id/cookie-consent", authorizeCapability("VIEW"), getCookieConsentHandler);
router.put("/:id/cookie-consent", authorizeCapability("EDIT"), updateCookieConsentHandler);

// Site Mailer Suite (F-435, F-436, F-437)
router.get("/:id/mailer/config", authorizeCapability("VIEW"), getMailerConfigHandler);
router.put("/:id/mailer/config", authorizeCapability("EDIT"), saveMailerConfigHandler);
router.post("/:id/mailer/test", authorizeCapability("EDIT"), testMailerConnectionHandler);
router.get("/:id/mailer/logs", authorizeCapability("VIEW"), getDeliveryLogsHandler);

// Performance Monitoring API (F-431)
router.post("/:id/performance/audit", authorizeCapability("VIEW"), runPerformanceAuditHandler);
router.get("/:id/performance/metrics", authorizeCapability("VIEW"), getPerformanceMetricsHandler);

// Image Optimization & Credits Engine API (F-433, F-434)
router.post("/:id/images/optimize-image", authorizeCapability("EDIT"), optimizeImageHandler);
router.get("/:id/images/stats", authorizeCapability("VIEW"), getOptimizationStatsHandler);

// Remote WordPress Administration & DB Optimization API (F-429, F-432)
router.get("/:id/wordpress/admin/overview", authorizeCapability("VIEW"), getRemoteAdminOverviewHandler);
router.post("/:id/wordpress/admin/sso", authorizeCapability("MANAGE_INTEGRATIONS"), generateWpAdminSsoHandler);
router.post("/:id/wordpress/database/optimize", authorizeCapability("MANAGE_INTEGRATIONS"), optimizeRemoteDatabaseHandler);


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
router.get("/:id/export/zip", authorizeCapability("VIEW"), downloadLatestStaticExportHandler);
router.post("/:id/deployments/:deploymentId/rollback", authorizeCapability("ROLLBACK"), rollbackDeploymentHandler);
router.get("/:id/releases", authorizeCapability("VIEW"), getReleasesHandler);
router.post("/:id/releases/:releaseId/rollback", authorizeCapability("ROLLBACK"), instantRollbackHandler);
router.post("/:id/schedule-publish", authorizeCapability("PUBLISH"), schedulePublishHandler);
router.post("/:id/cancel-scheduled-publish", authorizeCapability("PUBLISH"), cancelScheduledPublishHandler);
router.post("/:id/promote", authorizeCapability("PUBLISH"), promoteDeploymentHandler);

// Quality & SEO Analysis API
router.post("/:id/seo/analyze", authorizeCapability("VIEW"), analyzeSeoHandler);
router.post("/:id/seo/audit-images", authorizeCapability("VIEW"), auditImagesHandler);
router.post("/:id/seo/audit-a11y", authorizeCapability("VIEW"), auditAccessibilityHandler);
router.post("/:id/seo/structured-data", authorizeCapability("VIEW"), generateStructuredDataHandler);
router.put("/:id/seo", authorizeCapability("EDIT_SEO"), saveWebsiteSeoHandler);

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
