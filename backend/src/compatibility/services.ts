/**
 * @file Compatibility exports for services. New backend code should import the owning module directly.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
export * from "../modules/authentication/auth.service.js";
export * from "../modules/authentication/login.service.js";
export * from "../modules/authentication/signup.service.js";
export * from "../modules/forms/form.service.js";
export * from "../modules/subscriptions/subscription.service.js";
export * from "../modules/teams/team.service.js";
export * from "../modules/integrations/integration.service.js";
export * from "../modules/authentication/otp.service.js";
export * from "../modules/permissions/permission.service.js";
export * from "../modules/authentication/oauth.service.js";
export * from "../modules/php-integrations/composer.service.js";
export * from "../modules/notifications/email.service.js";
export * from "../modules/authentication/session.service.js";
