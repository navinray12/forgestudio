import { Router } from "express";

import loginRoutes from "./login.routes.js";
import signupRoutes from "./signup.routes.js";
import oauthRoutes from "./oauth.routes.js";
import meRoutes from "./me.routes.js";
import authRoutes from "./auth.routes.js";
import subscriptionRoutes from "./subscription.routes.js";
import websiteRoutes from "./website.routes.js";
import teamRoutes from "./team.routes.js";
import uploadRoutes from "./upload.routes.js";
import apiKeysRoutes from "./apiKeys.routes.js";
import developerRoutes from "./developer.routes.js";
import composerRoutes from "./composer.routes.js";
import customPostTypeRoutes from "./customPostType.routes.js";
import customCodeRoutes from "./customCode.routes.js";
import pluginCompatRoutes from "./pluginCompat.routes.js";
import designNotesRoutes from "./designNotes.routes.js";
import componentAccessRoutes from "./componentAccess.routes.js";
import templateRoutes from "./template.routes.js";
import formRoutes from "./form.routes.js";
import integrationRoutes from "./integration.routes.js";
import sftpRoutes from "./sftp.routes.js";
import pluginIntegrationRoutes from "./pluginIntegration.routes.js";
import multisiteRoutes from "./multisite.routes.js";
import designTokenRoutes from "./designToken.routes.js";
import designSystemRoutes from "./designSystem.routes.js";
import commerceRoutes from "./commerce.routes.js";
import enterpriseMultisiteRoutes from "./enterpriseMultisite.routes.js";
import licenseRoutes from "./license.routes.js";
import whitelabelRoutes from "./whitelabel.routes.js";
import usageRoutes from "./usage.routes.js";
import stagingRoutes from "./staging.routes.js";
import serverConfigRoutes from "./serverConfig.routes.js";
import hostingRoutes from "./hosting.routes.js";
import performanceRoutes from "./performance.routes.js";
import imageOptimizationRoutes from "./imageOptimization.routes.js";

const apiRouter = Router();

// Authentication & Users
apiRouter.use("/auth", loginRoutes);
apiRouter.use("/auth", signupRoutes);
apiRouter.use("/auth", authRoutes);
apiRouter.use("/auth", oauthRoutes);
apiRouter.use("/users", meRoutes);
apiRouter.use("/users/me", usageRoutes);

// Subscriptions, Licensing & Payments
apiRouter.use("/subscriptions", subscriptionRoutes);
apiRouter.use("/licenses", licenseRoutes);
apiRouter.use("/agency", whitelabelRoutes);

// Websites & Content Management
// Note: designSystemRoutes includes the 4 original design-token endpoints (GET/PUT/export/import)
// via the embedded designTokenController import — designTokenRoutes is kept separately for
// backward compatibility with any existing direct callers of its routes.
apiRouter.use("/websites", websiteRoutes);
apiRouter.use("/websites", designTokenRoutes);
apiRouter.use("/websites", designSystemRoutes);
apiRouter.use("/websites", commerceRoutes);
apiRouter.use("/websites", enterpriseMultisiteRoutes);
apiRouter.use("/websites", stagingRoutes);
apiRouter.use("/websites", serverConfigRoutes);
apiRouter.use("/websites", hostingRoutes);
apiRouter.use("/websites", performanceRoutes);
apiRouter.use("/websites", imageOptimizationRoutes);
apiRouter.use("/teams", teamRoutes);
apiRouter.use("/uploads", uploadRoutes);
apiRouter.use("/api-keys", apiKeysRoutes);
apiRouter.use("/developer", developerRoutes);
apiRouter.use("/composer", composerRoutes);
apiRouter.use("/sftp", sftpRoutes);
apiRouter.use("/plugins-integration", pluginIntegrationRoutes);
apiRouter.use("/multisite", multisiteRoutes);

// Custom Types, Code, and Components
apiRouter.use("/", customPostTypeRoutes);
apiRouter.use("/", customCodeRoutes);
apiRouter.use("/", pluginCompatRoutes);
apiRouter.use("/", designNotesRoutes);
apiRouter.use("/", componentAccessRoutes);
apiRouter.use("/", templateRoutes);
apiRouter.use("/", formRoutes);
apiRouter.use("/", integrationRoutes);

export { apiRouter };

export { default as loginRoutes } from "./login.routes.js";
export { default as signupRoutes } from "./signup.routes.js";
export { default as oauthRoutes } from "./oauth.routes.js";
export { default as meRoutes } from "./me.routes.js";
export { default as authRoutes } from "./auth.routes.js";
export { default as subscriptionRoutes } from "./subscription.routes.js";
export { default as websiteRoutes } from "./website.routes.js";
export { default as teamRoutes } from "./team.routes.js";
export { default as uploadRoutes } from "./upload.routes.js";
export { default as apiKeysRoutes } from "./apiKeys.routes.js";
export { default as developerRoutes } from "./developer.routes.js";
export { default as composerRoutes } from "./composer.routes.js";
export { default as customPostTypeRoutes } from "./customPostType.routes.js";
export { default as customCodeRoutes } from "./customCode.routes.js";
export { default as pluginCompatRoutes } from "./pluginCompat.routes.js";
export { default as designNotesRoutes } from "./designNotes.routes.js";
export { default as componentAccessRoutes } from "./componentAccess.routes.js";
export { default as templateRoutes } from "./template.routes.js";
export { default as formRoutes } from "./form.routes.js";
export { default as integrationRoutes } from "./integration.routes.js";
export { default as sftpRoutes } from "./sftp.routes.js";
export { default as pluginIntegrationRoutes } from "./pluginIntegration.routes.js";
export { default as multisiteRoutes } from "./multisite.routes.js";
export { default as designTokenRoutes } from "./designToken.routes.js";
export { default as designSystemRoutes } from "./designSystem.routes.js";
export { default as commerceRoutes } from "./commerce.routes.js";
export { default as enterpriseMultisiteRoutes } from "./enterpriseMultisite.routes.js";
export { default as licenseRoutes } from "./license.routes.js";
export { default as whitelabelRoutes } from "./whitelabel.routes.js";
export { default as usageRoutes } from "./usage.routes.js";
export { default as stagingRoutes } from "./staging.routes.js";
export { default as serverConfigRoutes } from "./serverConfig.routes.js";
export { default as hostingRoutes } from "./hosting.routes.js";
export { default as performanceRoutes } from "./performance.routes.js";
export { default as imageOptimizationRoutes } from "./imageOptimization.routes.js";
export { default as aiHostingRoutes } from "./aiHosting.routes.js";
export { default as elementorCloudRoutes } from "./elementorCloud.routes.js";
export { default as exportRoutes } from "./export.routes.js";

