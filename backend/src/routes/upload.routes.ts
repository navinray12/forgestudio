import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { handleImageUpload, handleVideoUpload } from "../middlewares/upload.middleware.js";

const router = Router();

// Protect image and video uploads with authentication
router.use(requireAuth);

router.post("/image", handleImageUpload);
router.post("/video", handleVideoUpload);

export default router;
