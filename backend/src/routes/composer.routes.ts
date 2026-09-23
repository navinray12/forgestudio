import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { getComposerStatus, validateComposer, installDependencies } from "../controllers/composer.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/status", getComposerStatus);
router.post("/validate", validateComposer);
router.post("/install", installDependencies);

export default router;
