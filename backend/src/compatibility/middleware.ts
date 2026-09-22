/**
 * @file Compatibility exports for middleware. New backend code should import the owning module directly.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
export * from "../modules/authentication/session-authentication.middleware.js";
export * from "../modules/authentication/api-key-authentication.middleware.js";
export * from "../modules/subscriptions/subscription.middleware.js";
export * from "../modules/media/upload.middleware.js";
export * from "../platform/http/error.middleware.js";
