/**
 * @file Content collections: HTTP route registration and middleware order. File responsibility: custom post type routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import { requireAuth } from "../authentication/session-authentication.middleware.js";
import {
    getCustomPostTypesHandler,
    createCustomPostTypeHandler,
    deleteCustomPostTypeHandler,
    getCustomFieldsHandler,
    saveCustomFieldsHandler,
    getCustomEntriesHandler,
    createCustomEntryHandler,
    updateCustomEntryHandler,
    deleteCustomEntryHandler
} from "./custom-post-type.controller.js";

const router = Router();

// Used behind /api/cpt nested structures
// Ex: /api/cpt/websites/:websiteId/types
router.get("/websites/:websiteId/types", requireAuth, getCustomPostTypesHandler);
router.post("/websites/:websiteId/types", requireAuth, createCustomPostTypeHandler);
router.delete("/types/:cptId", requireAuth, deleteCustomPostTypeHandler);

// Fields
router.get("/types/:cptId/fields", requireAuth, getCustomFieldsHandler);
router.post("/types/:cptId/fields", requireAuth, saveCustomFieldsHandler);

// Entries
router.get("/types/:cptId/entries", requireAuth, getCustomEntriesHandler);
router.post("/types/:cptId/entries", requireAuth, createCustomEntryHandler);
router.patch("/entries/:entryId", requireAuth, updateCustomEntryHandler);
router.delete("/entries/:entryId", requireAuth, deleteCustomEntryHandler);

export default router;
