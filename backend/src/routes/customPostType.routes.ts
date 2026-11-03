import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getCustomPostTypesHandler,
  createCustomPostTypeHandler,
  updateCustomPostTypeHandler,
  deleteCustomPostTypeHandler,
  getCustomFieldsHandler,
  saveCustomFieldsHandler,
  getCustomEntriesHandler,
  getCustomEntryHandler,
  createCustomEntryHandler,
  updateCustomEntryHandler,
  deleteCustomEntryHandler,
  getPublicEntriesByCptSlugHandler,
} from "../controllers/customPostType.controller.js";

const router = Router();

// Public / Anonymous read access for published entries:
router.get("/websites/:websiteId/public/types/:cptSlug/entries", getPublicEntriesByCptSlugHandler);

router.use(requireAuth);
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  if (res.locals.user.status !== "ACTIVE") {
    res.status(403).json({ message: "An active account is required." });
    return;
  }
  if (
    req.method !== "GET" &&
    req.headers.origin &&
    req.headers.origin !== new URL(process.env.FRONTEND_URL || "http://localhost:5173").origin
  ) {
    res.status(403).json({ message: "This request is not allowed." });
    return;
  }
  if (["POST", "PATCH", "PUT"].includes(req.method) && !req.is("application/json")) {
    res.status(415).json({ message: "JSON is required." });
    return;
  }
  next();
});

// CPT Management: /api/cpt/websites/:websiteId/types
router.get("/websites/:websiteId/types", getCustomPostTypesHandler);
router.post("/websites/:websiteId/types", createCustomPostTypeHandler);
router.put("/types/:cptId", updateCustomPostTypeHandler);
router.patch("/types/:cptId", updateCustomPostTypeHandler);
router.delete("/types/:cptId", deleteCustomPostTypeHandler);

// Fields
router.get("/types/:cptId/fields", getCustomFieldsHandler);
router.post("/types/:cptId/fields", saveCustomFieldsHandler);
router.put("/types/:cptId/fields", saveCustomFieldsHandler);

// Entries
router.get("/types/:cptId/entries", getCustomEntriesHandler);
router.post("/types/:cptId/entries", createCustomEntryHandler);
router.get("/entries/:entryId", getCustomEntryHandler);
router.put("/entries/:entryId", updateCustomEntryHandler);
router.patch("/entries/:entryId", updateCustomEntryHandler);
router.delete("/entries/:entryId", deleteCustomEntryHandler);

export default router;
