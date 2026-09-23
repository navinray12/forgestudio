import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import * as multisiteController from "../controllers/multisite.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/network", multisiteController.createNetwork);
router.get("/networks", multisiteController.listNetworks);
router.delete("/network/:id", multisiteController.deleteNetwork);

export default router;
