/**
 * @file Compatibility exports for routes. New backend code should import the owning module directly.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";

import loginRoutes from "../modules/authentication/login.routes.js";
import signupRoutes from "../modules/authentication/signup.routes.js";
import oauthRoutes from "../modules/authentication/oauth.routes.js";
import meRoutes from "../modules/authentication/me.routes.js";
import authRoutes from "../modules/authentication/auth.routes.js";
import subscriptionRoutes from "../modules/subscriptions/subscription.routes.js";
import websiteRoutes from "../modules/websites/website.routes.js";
import teamRoutes from "../modules/teams/team.routes.js";
import workspaceRoutes from "../modules/workspaces/workspace.routes.js";
import uploadRoutes from "../modules/media/upload.routes.js";
import apiKeysRoutes from "../modules/api-keys/api-keys.routes.js";
import developerRoutes from "../modules/developer-tools/developer.routes.js";
import composerRoutes from "../modules/php-integrations/composer.routes.js";
import customPostTypeRoutes from "../modules/content-collections/custom-post-type.routes.js";
import customCodeRoutes from "../modules/custom-code/custom-code.routes.js";
import pluginCompatRoutes from "../modules/plugin-compatibility/plugin-compat.routes.js";
import designNotesRoutes from "../modules/design-notes/design-notes.routes.js";
import componentAccessRoutes from "../modules/component-access/component-access.routes.js";
import templateRoutes from "../modules/templates/template.routes.js";
import formRoutes from "../modules/forms/form.routes.js";
import integrationRoutes from "../modules/integrations/integration.routes.js";
import sftpRoutes from "../modules/sftp-connections/sftp.routes.js";
import pluginIntegrationRoutes from "../modules/plugin-integrations/plugin-integration.routes.js";
import multisiteRoutes from "../modules/multisite/multisite.routes.js";

const apiRouter = Router();

// Authentication & Users
apiRouter.use("/auth", loginRoutes);
apiRouter.use("/auth", signupRoutes);
apiRouter.use("/auth", authRoutes);
apiRouter.use("/auth", oauthRoutes);
apiRouter.use("/users", meRoutes);

// Subscriptions & Payments
apiRouter.use("/subscriptions", subscriptionRoutes);

// Websites & Content Management
apiRouter.use("/websites", websiteRoutes);
apiRouter.use("/teams", teamRoutes);
apiRouter.use("/workspaces", workspaceRoutes);
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

export { default as loginRoutes } from "../modules/authentication/login.routes.js";
export { default as signupRoutes } from "../modules/authentication/signup.routes.js";
export { default as oauthRoutes } from "../modules/authentication/oauth.routes.js";
export { default as meRoutes } from "../modules/authentication/me.routes.js";
export { default as authRoutes } from "../modules/authentication/auth.routes.js";
export { default as subscriptionRoutes } from "../modules/subscriptions/subscription.routes.js";
export { default as websiteRoutes } from "../modules/websites/website.routes.js";
export { default as teamRoutes } from "../modules/teams/team.routes.js";
export { default as workspaceRoutes } from "../modules/workspaces/workspace.routes.js";
export { default as uploadRoutes } from "../modules/media/upload.routes.js";
export { default as apiKeysRoutes } from "../modules/api-keys/api-keys.routes.js";
export { default as developerRoutes } from "../modules/developer-tools/developer.routes.js";
export { default as composerRoutes } from "../modules/php-integrations/composer.routes.js";
export { default as customPostTypeRoutes } from "../modules/content-collections/custom-post-type.routes.js";
export { default as customCodeRoutes } from "../modules/custom-code/custom-code.routes.js";
export { default as pluginCompatRoutes } from "../modules/plugin-compatibility/plugin-compat.routes.js";
export { default as designNotesRoutes } from "../modules/design-notes/design-notes.routes.js";
export { default as componentAccessRoutes } from "../modules/component-access/component-access.routes.js";
export { default as templateRoutes } from "../modules/templates/template.routes.js";
export { default as formRoutes } from "../modules/forms/form.routes.js";
export { default as integrationRoutes } from "../modules/integrations/integration.routes.js";
export { default as sftpRoutes } from "../modules/sftp-connections/sftp.routes.js";
export { default as pluginIntegrationRoutes } from "../modules/plugin-integrations/plugin-integration.routes.js";
export { default as multisiteRoutes } from "../modules/multisite/multisite.routes.js";
