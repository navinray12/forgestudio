import { Router } from "express";
import { getPlugins, activatePlugin } from "../controllers/pluginCompat.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", getPlugins as any);
router.post("/:pluginId/activate", activatePlugin as any);

export default router;
