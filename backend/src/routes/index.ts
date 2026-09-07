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
apiRouter.use("/uploads", uploadRoutes);
apiRouter.use("/api-keys", apiKeysRoutes);
apiRouter.use("/developer", developerRoutes);
apiRouter.use("/composer", composerRoutes);

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
