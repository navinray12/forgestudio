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
  revokeWordPressHandler,
  syncWordPressPagesHandler,
  handleWordPressWebhook,
  getAcfFieldsHandler,
  getToolsetFieldsHandler,
  getPodsFieldsHandler,
  syncGutenbergBlocksHandler,
  getMultisiteSitesHandler,
  downloadPluginHandler,
  getWordPressSiteInfoHandler,
  getWordPressSiteHealthHandler,
  listWordPressPagesHandler,
  getWordPressPageHandler,
  createWordPressPageHandler,
  updateWordPressPageHandler,
  deleteWordPressPageHandler,
  duplicateWordPressPageHandler,
  reorderWordPressPageHandler,
  uploadWordPressMediaHandler,
  listWordPressMediaHandler,
  getWordPressMediaHandler,
  updateWordPressMediaHandler,
  deleteWordPressMediaHandler,
  publishWordPressPageHandler,
  getWordPressPublishStatusHandler,
  getWordPressRollbackTargetsHandler,
  rollbackWordPressPageHandler,
  createWordPressPublishJobHandler,
  getWordPressPublishJobStatusHandler,
  listWordPressPublishJobsHandler,
  cancelWordPressPublishJobHandler,
  retryWordPressPublishJobHandler,
  previewWordPressHtmlHandler,
  previewWordPressGutenbergHandler,
  getWordPressFormsCapabilitiesHandler,
  listWordPressFormsHandler,
  getWordPressFormHandler,
  createWordPressFormHandler,
  updateWordPressFormHandler,
  deleteWordPressFormHandler,
  syncWordPressFormHandler,
  submitWordPressFormHandler,
  getWordPressFormSubmissionsHandler,
  deleteWordPressFormSubmissionHandler,
  getWordPressSeoCapabilitiesHandler,
  getWordPressPageSeoHandler,
  updateWordPressPageSeoHandler,
  syncWordPressPageSeoHandler,
  reconcileWordPressPageSeoHandler,
  getWordPressAnalyticsCapabilitiesHandler,
  getWordPressAnalyticsConfigHandler,
  updateWordPressAnalyticsConfigHandler,
  getWordPressAnalyticsDataHandler,
  syncWordPressAnalyticsHandler,
  reconcileWordPressAnalyticsConfigHandler,
  getWordPressMenuCapabilitiesHandler,
  listWordPressMenusHandler,
  getWordPressMenuHandler,
  createWordPressMenuHandler,
  updateWordPressMenuHandler,
  deleteWordPressMenuHandler,
  listWordPressMenuItemsHandler,
  createWordPressMenuItemHandler,
  updateWordPressMenuItemHandler,
  deleteWordPressMenuItemHandler,
  reorderWordPressMenuItemsHandler,
  getWordPressMenuLocationsHandler,
  assignWordPressMenuLocationHandler,
  syncWordPressMenusHandler,
  reconcileWordPressMenuHandler,
  getWordPressWebhookCapabilitiesHandler,
  listWordPressWebhooksHandler,
  getWordPressWebhookHandler,
  createWordPressWebhookHandler,
  updateWordPressWebhookHandler,
  deleteWordPressWebhookHandler,
  enableWordPressWebhookHandler,
  disableWordPressWebhookHandler,
  listWordPressWebhookDeliveriesHandler,
  handleIncomingWordPressWebhookDeliveryHandler,
  getWordPressPluginCapabilitiesHandler,
  listWordPressPluginsHandler,
  getWordPressPluginDetailsHandler,
  activateWordPressPluginHandler,
  deactivateWordPressPluginHandler,
  updateWordPressPluginHandler,
  deleteWordPressPluginHandler,
  installWordPressPluginHandler,
  reconcileWordPressPluginMutationHandler,
  getWordPressThemeCapabilitiesHandler,
  listWordPressThemesHandler,
  getActiveWordPressThemeHandler,
  getWordPressThemeDetailsHandler,
  activateWordPressThemeHandler,
  updateWordPressThemeHandler,
  deleteWordPressThemeHandler,
  installWordPressThemeHandler,
  reconcileWordPressThemeMutationHandler,
  getWordPressCacheCapabilitiesHandler,
  getWordPressCacheStatusHandler,
  purgeWordPressCacheHandler,
  clearWordPressCacheHandler,
  warmWordPressCacheHandler,
  getWordPressCacheGroupsHandler,
  reconcileWordPressCacheOperationHandler,
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
  fullQualityAuditHandler,
  performanceAuditHandler,
  codeQualityAuditHandler,
  visualRegressionHandler,
  goldenTestHandler,
  performanceBudgetHandler,
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
router.get("/:id/wordpress/download-plugin", authorizeCapability("VIEW"), downloadPluginHandler);
router.post("/:id/wordpress/connect", authorizeCapability("MANAGE_INTEGRATIONS"), connectWordPressHandler);
router.get("/:id/wordpress/status", authorizeCapability("VIEW"), getWordPressStatusHandler);
router.get("/:id/wordpress/connection", authorizeCapability("VIEW"), getWordPressStatusHandler);
router.get("/:id/wordpress/site-info", authorizeCapability("VIEW"), getWordPressSiteInfoHandler);
router.get("/:id/wordpress/site-health", authorizeCapability("VIEW"), getWordPressSiteHealthHandler);
router.get("/:id/wordpress/pages", authorizeCapability("VIEW"), listWordPressPagesHandler);
router.get("/:id/wordpress/pages/:pageId", authorizeCapability("VIEW"), getWordPressPageHandler);
router.post("/:id/wordpress/pages", authorizeCapability("EDIT"), createWordPressPageHandler);
router.patch("/:id/wordpress/pages/:pageId", authorizeCapability("EDIT"), updateWordPressPageHandler);
router.put("/:id/wordpress/pages/:pageId", authorizeCapability("EDIT"), updateWordPressPageHandler);
router.delete("/:id/wordpress/pages/:pageId", authorizeCapability("DELETE"), deleteWordPressPageHandler);
router.post("/:id/wordpress/pages/:pageId/duplicate", authorizeCapability("EDIT"), duplicateWordPressPageHandler);
router.patch("/:id/wordpress/pages/:pageId/reorder", authorizeCapability("EDIT"), reorderWordPressPageHandler);
router.get("/:id/wordpress/media", authorizeCapability("VIEW"), listWordPressMediaHandler);
router.get("/:id/wordpress/media/:mediaId", authorizeCapability("VIEW"), getWordPressMediaHandler);
router.post("/:id/wordpress/media", authorizeCapability("EDIT"), uploadWordPressMediaHandler);
router.put("/:id/wordpress/media/:mediaId", authorizeCapability("EDIT"), updateWordPressMediaHandler);
router.patch("/:id/wordpress/media/:mediaId", authorizeCapability("EDIT"), updateWordPressMediaHandler);
router.delete("/:id/wordpress/media/:mediaId", authorizeCapability("DELETE"), deleteWordPressMediaHandler);
router.post("/:id/wordpress/verify", authorizeCapability("MANAGE_INTEGRATIONS"), verifyWordPressHandler);
router.post("/:id/wordpress/disconnect", authorizeCapability("MANAGE_INTEGRATIONS"), disconnectWordPressHandler);
router.post("/:id/wordpress/revoke", authorizeCapability("MANAGE_INTEGRATIONS"), revokeWordPressHandler);
router.post("/:id/wordpress/sync-pages", authorizeCapability("MANAGE_INTEGRATIONS"), syncWordPressPagesHandler);
router.get("/:id/wordpress/acf-fields", authorizeCapability("VIEW"), getAcfFieldsHandler);
router.get("/:id/wordpress/toolset-fields", authorizeCapability("VIEW"), getToolsetFieldsHandler);
router.get("/:id/wordpress/pods-fields", authorizeCapability("VIEW"), getPodsFieldsHandler);
router.post("/:id/wordpress/gutenberg-sync", authorizeCapability("MANAGE_INTEGRATIONS"), syncGutenbergBlocksHandler);
router.get("/:id/wordpress/multisite-sites", authorizeCapability("VIEW"), getMultisiteSitesHandler);
router.post("/:id/wordpress/publish-page", authorizeCapability("PUBLISH"), publishWordPressPageHandler);
router.post("/:id/wordpress/publish-wp", authorizeCapability("PUBLISH"), publishWordPressPageHandler);
router.get("/:id/wordpress/pages/:pageId/publish-status", authorizeCapability("VIEW"), getWordPressPublishStatusHandler);
router.get("/:id/wordpress/publish-status", authorizeCapability("VIEW"), getWordPressPublishStatusHandler);
router.get("/:id/wordpress/pages/:pageId/rollback-targets", authorizeCapability("PUBLISH"), getWordPressRollbackTargetsHandler);
router.get("/:id/wordpress/rollback-targets", authorizeCapability("PUBLISH"), getWordPressRollbackTargetsHandler);
router.post("/:id/wordpress/pages/:pageId/rollback", authorizeCapability("PUBLISH"), rollbackWordPressPageHandler);
router.post("/:id/wordpress/rollback", authorizeCapability("PUBLISH"), rollbackWordPressPageHandler);

// WordPress Publishing Jobs (F-498)
router.post("/:id/wordpress/pages/:pageId/jobs", authorizeCapability("PUBLISH"), createWordPressPublishJobHandler);
router.post("/:id/wordpress/jobs", authorizeCapability("PUBLISH"), createWordPressPublishJobHandler);
router.get("/:id/wordpress/pages/:pageId/jobs", authorizeCapability("VIEW"), listWordPressPublishJobsHandler);
router.get("/:id/wordpress/jobs", authorizeCapability("VIEW"), listWordPressPublishJobsHandler);
router.get("/:id/wordpress/jobs/:jobId", authorizeCapability("VIEW"), getWordPressPublishJobStatusHandler);
router.post("/:id/wordpress/jobs/:jobId/cancel", authorizeCapability("PUBLISH"), cancelWordPressPublishJobHandler);
router.post("/:id/wordpress/jobs/:jobId/retry", authorizeCapability("PUBLISH"), retryWordPressPublishJobHandler);

// WordPress HTML Publishing Preview (F-499)
router.post("/:id/wordpress/pages/:pageId/preview-html", authorizeCapability("VIEW"), previewWordPressHtmlHandler);
router.post("/:id/wordpress/preview-html", authorizeCapability("VIEW"), previewWordPressHtmlHandler);
router.get("/:id/wordpress/pages/:pageId/preview-html", authorizeCapability("VIEW"), previewWordPressHtmlHandler);
router.get("/:id/wordpress/preview-html", authorizeCapability("VIEW"), previewWordPressHtmlHandler);

// WordPress Gutenberg Block Publishing Preview (F-500)
router.post("/:id/wordpress/pages/:pageId/preview-gutenberg", authorizeCapability("VIEW"), previewWordPressGutenbergHandler);
router.post("/:id/wordpress/preview-gutenberg", authorizeCapability("VIEW"), previewWordPressGutenbergHandler);
router.get("/:id/wordpress/pages/:pageId/preview-gutenberg", authorizeCapability("VIEW"), previewWordPressGutenbergHandler);
router.get("/:id/wordpress/preview-gutenberg", authorizeCapability("VIEW"), previewWordPressGutenbergHandler);

// WordPress Forms API (F-501)
router.get("/:id/wordpress/forms/capabilities", authorizeCapability("VIEW"), getWordPressFormsCapabilitiesHandler);
router.get("/:id/wordpress/forms", authorizeCapability("VIEW"), listWordPressFormsHandler);
router.get("/:id/wordpress/forms/:formId", authorizeCapability("VIEW"), getWordPressFormHandler);
router.post("/:id/wordpress/forms", authorizeCapability("EDIT"), createWordPressFormHandler);
router.put("/:id/wordpress/forms/:formId", authorizeCapability("EDIT"), updateWordPressFormHandler);
router.delete("/:id/wordpress/forms/:formId", authorizeCapability("DELETE"), deleteWordPressFormHandler);
router.post("/:id/wordpress/forms/:formId/sync", authorizeCapability("PUBLISH"), syncWordPressFormHandler);
router.post("/:id/wordpress/forms/:formId/submit", submitWordPressFormHandler);
router.get("/:id/wordpress/forms/:formId/submissions", authorizeCapability("VIEW"), getWordPressFormSubmissionsHandler);
router.delete("/:id/wordpress/forms/:formId/submissions/:submissionId", authorizeCapability("DELETE"), deleteWordPressFormSubmissionHandler);

// WordPress SEO API (F-502)
router.get("/:id/wordpress/seo/capabilities", authorizeCapability("VIEW"), getWordPressSeoCapabilitiesHandler);
router.get("/:id/wordpress/seo/pages/:pageId", authorizeCapability("VIEW"), getWordPressPageSeoHandler);
router.put("/:id/wordpress/seo/pages/:pageId", authorizeCapability("EDIT_SEO"), updateWordPressPageSeoHandler);
router.post("/:id/wordpress/seo/pages/:pageId/sync", authorizeCapability("PUBLISH"), syncWordPressPageSeoHandler);
router.post("/:id/wordpress/seo/pages/:pageId/reconcile", authorizeCapability("PUBLISH"), reconcileWordPressPageSeoHandler);

// WordPress Analytics API (F-503)
router.get("/:id/wordpress/analytics/capabilities", authorizeCapability("VIEW"), getWordPressAnalyticsCapabilitiesHandler);
router.get("/:id/wordpress/analytics/config", authorizeCapability("VIEW"), getWordPressAnalyticsConfigHandler);
router.put("/:id/wordpress/analytics/config", authorizeCapability("EDIT_ANALYTICS"), updateWordPressAnalyticsConfigHandler);
router.get("/:id/wordpress/analytics", authorizeCapability("VIEW"), getWordPressAnalyticsDataHandler);
router.post("/:id/wordpress/analytics/sync", authorizeCapability("PUBLISH"), syncWordPressAnalyticsHandler);
router.post("/:id/wordpress/analytics/reconcile", authorizeCapability("PUBLISH"), reconcileWordPressAnalyticsConfigHandler);

// WordPress Menus API (F-504)
router.get("/:id/wordpress/menus/capabilities", authorizeCapability("VIEW"), getWordPressMenuCapabilitiesHandler);
router.get("/:id/wordpress/menus", authorizeCapability("VIEW"), listWordPressMenusHandler);
router.post("/:id/wordpress/menus", authorizeCapability("EDIT"), createWordPressMenuHandler);
router.get("/:id/wordpress/menus/locations", authorizeCapability("VIEW"), getWordPressMenuLocationsHandler);
router.post("/:id/wordpress/menus/locations", authorizeCapability("EDIT"), assignWordPressMenuLocationHandler);
router.get("/:id/wordpress/menus/:menuId", authorizeCapability("VIEW"), getWordPressMenuHandler);
router.put("/:id/wordpress/menus/:menuId", authorizeCapability("EDIT"), updateWordPressMenuHandler);
router.delete("/:id/wordpress/menus/:menuId", authorizeCapability("DELETE"), deleteWordPressMenuHandler);
router.get("/:id/wordpress/menus/:menuId/items", authorizeCapability("VIEW"), listWordPressMenuItemsHandler);
router.post("/:id/wordpress/menus/:menuId/items", authorizeCapability("EDIT"), createWordPressMenuItemHandler);
router.put("/:id/wordpress/menus/:menuId/items/reorder", authorizeCapability("EDIT"), reorderWordPressMenuItemsHandler);
router.put("/:id/wordpress/menus/:menuId/items/:itemId", authorizeCapability("EDIT"), updateWordPressMenuItemHandler);
router.delete("/:id/wordpress/menus/:menuId/items/:itemId", authorizeCapability("DELETE"), deleteWordPressMenuItemHandler);
router.post("/:id/wordpress/menus/:menuId/sync", authorizeCapability("PUBLISH"), syncWordPressMenusHandler);
router.post("/:id/wordpress/menus/:menuId/reconcile", authorizeCapability("PUBLISH"), reconcileWordPressMenuHandler);

// F-505 — WordPress Webhooks API Routes
router.get("/:id/wordpress/webhooks/capabilities", authorizeCapability("VIEW"), getWordPressWebhookCapabilitiesHandler);
router.get("/:id/wordpress/webhooks", authorizeCapability("VIEW"), listWordPressWebhooksHandler);
router.post("/:id/wordpress/webhooks", authorizeCapability("EDIT"), createWordPressWebhookHandler);
router.post("/:id/wordpress/webhooks/delivery", handleIncomingWordPressWebhookDeliveryHandler);
router.get("/:id/wordpress/webhooks/:webhookId", authorizeCapability("VIEW"), getWordPressWebhookHandler);
router.put("/:id/wordpress/webhooks/:webhookId", authorizeCapability("EDIT"), updateWordPressWebhookHandler);
router.delete("/:id/wordpress/webhooks/:webhookId", authorizeCapability("DELETE"), deleteWordPressWebhookHandler);
router.post("/:id/wordpress/webhooks/:webhookId/enable", authorizeCapability("EDIT"), enableWordPressWebhookHandler);
router.post("/:id/wordpress/webhooks/:webhookId/disable", authorizeCapability("EDIT"), disableWordPressWebhookHandler);
router.get("/:id/wordpress/webhooks/:webhookId/deliveries", authorizeCapability("VIEW"), listWordPressWebhookDeliveriesHandler);

// F-506 — WordPress Plugins API Routes
router.get("/:id/wordpress/plugins/capabilities", authorizeCapability("VIEW"), getWordPressPluginCapabilitiesHandler);
router.get("/:id/wordpress/plugins", authorizeCapability("VIEW"), listWordPressPluginsHandler);
router.post("/:id/wordpress/plugins/install", authorizeCapability("EDIT"), installWordPressPluginHandler);
router.get("/:id/wordpress/plugins/:pluginId", authorizeCapability("VIEW"), getWordPressPluginDetailsHandler);
router.post("/:id/wordpress/plugins/:pluginId/activate", authorizeCapability("EDIT"), activateWordPressPluginHandler);
router.post("/:id/wordpress/plugins/:pluginId/deactivate", authorizeCapability("EDIT"), deactivateWordPressPluginHandler);
router.post("/:id/wordpress/plugins/:pluginId/update", authorizeCapability("EDIT"), updateWordPressPluginHandler);
router.delete("/:id/wordpress/plugins/:pluginId", authorizeCapability("DELETE"), deleteWordPressPluginHandler);
router.post("/:id/wordpress/plugins/:pluginId/reconcile", authorizeCapability("EDIT"), reconcileWordPressPluginMutationHandler);

// F-507 — WordPress Themes API Routes
router.get("/:id/wordpress/themes/capabilities", authorizeCapability("VIEW"), getWordPressThemeCapabilitiesHandler);
router.get("/:id/wordpress/themes", authorizeCapability("VIEW"), listWordPressThemesHandler);
router.get("/:id/wordpress/themes/active", authorizeCapability("VIEW"), getActiveWordPressThemeHandler);
router.post("/:id/wordpress/themes/install", authorizeCapability("EDIT"), installWordPressThemeHandler);
router.get("/:id/wordpress/themes/:themeId", authorizeCapability("VIEW"), getWordPressThemeDetailsHandler);
router.post("/:id/wordpress/themes/:themeId/activate", authorizeCapability("EDIT"), activateWordPressThemeHandler);
router.post("/:id/wordpress/themes/:themeId/update", authorizeCapability("EDIT"), updateWordPressThemeHandler);
router.delete("/:id/wordpress/themes/:themeId", authorizeCapability("DELETE"), deleteWordPressThemeHandler);
router.post("/:id/wordpress/themes/:themeId/reconcile", authorizeCapability("EDIT"), reconcileWordPressThemeMutationHandler);

// F-508 — WordPress Cache API Routes
router.get("/:id/wordpress/cache/capabilities", authorizeCapability("VIEW"), getWordPressCacheCapabilitiesHandler);
router.get("/:id/wordpress/cache/status", authorizeCapability("VIEW"), getWordPressCacheStatusHandler);
router.post("/:id/wordpress/cache/purge", authorizeCapability("EDIT"), purgeWordPressCacheHandler);
router.post("/:id/wordpress/cache/clear", authorizeCapability("EDIT"), clearWordPressCacheHandler);
router.post("/:id/wordpress/cache/warm", authorizeCapability("EDIT"), warmWordPressCacheHandler);
router.get("/:id/wordpress/cache/groups", authorizeCapability("VIEW"), getWordPressCacheGroupsHandler);
router.post("/:id/wordpress/cache/reconcile", authorizeCapability("EDIT"), reconcileWordPressCacheOperationHandler);





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
router.post("/:id/seo/full-audit", authorizeCapability("VIEW"), fullQualityAuditHandler);
router.post("/:id/seo/performance-audit", authorizeCapability("VIEW"), performanceAuditHandler);
router.post("/:id/seo/quality-audit", authorizeCapability("VIEW"), codeQualityAuditHandler);
router.post("/:id/seo/visual-regression", authorizeCapability("VIEW"), visualRegressionHandler);
router.post("/:id/seo/golden-test", authorizeCapability("VIEW"), goldenTestHandler);
router.post("/:id/seo/performance-budget", authorizeCapability("VIEW"), performanceBudgetHandler);

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
