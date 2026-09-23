import { Router } from "express";
import { requireAuth } from "./session-authentication.middleware.js";
import {
  listMediaAssetsHandler,
  getMediaAssetHandler,
  updateMediaAssetHandler,
  deleteMediaAssetHandler,
} from "./media.controller.js";

const router = Router();

// All media endpoints require authentication for tenant isolation
router.use(requireAuth);

router.get("/", listMediaAssetsHandler);
router.get("/:id", getMediaAssetHandler);
router.patch("/:id", updateMediaAssetHandler);
router.delete("/:id", deleteMediaAssetHandler);

export default router;
