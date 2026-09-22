/**
 * @file Component access: HTTP route registration and middleware order. File responsibility: component access routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import { requireAuth } from "../authentication/session-authentication.middleware.js";
import {
    getAllComponentAccesses,
    getComponentAccess,
    grantComponentAccess,
    revokeComponentAccess,
    clearComponentRestrictions
} from "./component-access.controller.js";

const router = Router();

// Retrieve all specific access records for a project for a specific user
router.get("/:websiteId/all", requireAuth, getAllComponentAccesses);

// Retrieve all specific access records for a component (Used by Admin Panel)
router.get("/:websiteId/:componentId", requireAuth, getComponentAccess);

// Grant specific access to a user
router.post("/:websiteId/:componentId/grant", requireAuth, grantComponentAccess);

// Revoke specific access
router.delete("/:websiteId/:componentId/revoke/:targetUserId", requireAuth, revokeComponentAccess);

// Bulk clear / unlock universally
router.post("/bulk-clear", requireAuth, clearComponentRestrictions);

export default router;
