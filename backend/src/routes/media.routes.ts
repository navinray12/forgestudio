import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  listMediaAssetsHandler,
  getMediaAssetHandler,
  updateMediaAssetHandler,
  deleteMediaAssetHandler,
  optimizeMediaAssetHandler,
  convertMediaAssetToWebpHandler,
} from "../controllers/media.controller.js";

const router = Router();

// All media endpoints require authentication for tenant isolation
router.use(requireAuth);

router.get("/", listMediaAssetsHandler);
router.get("/:id", getMediaAssetHandler);
router.patch("/:id", updateMediaAssetHandler);
router.delete("/:id", deleteMediaAssetHandler);
router.post("/:id/optimize", optimizeMediaAssetHandler);
router.post("/:id/convert-webp", convertMediaAssetToWebpHandler);

export default router;
