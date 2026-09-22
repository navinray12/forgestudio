import { Router } from "express";
import { requireAuth } from "./session-authentication.middleware.js";
import * as designTokenController from "./designToken.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/:websiteId/design-system", designTokenController.getDesignSystem);
router.put("/:websiteId/design-system", designTokenController.updateDesignSystem);
router.post("/:websiteId/design-system/export", designTokenController.exportDesignSystemPayload);
router.post("/:websiteId/design-system/import", designTokenController.importDesignSystemPayload);

export default router;
