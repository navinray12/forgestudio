import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { handleImageUpload } from "../middlewares/upload.middleware.js";

const router = Router();

// Protect image upload with authentication
router.use(requireAuth);

router.post("/image", handleImageUpload);

export default router;
