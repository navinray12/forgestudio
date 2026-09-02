import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getWebsitesHandler,
  getWebsiteByIdHandler,
  createWebsiteHandler,
  updateWebsiteHandler,
  deleteWebsiteHandler,
<<<<<<< HEAD
} from "../controllers/website.controller.js";
=======
  publishWebsiteHandler,
  restoreRevisionHandler
} from "../controllers/website.controller.js";
import { developerApiRateLimiter } from "../middlewares/rateLimiter.middleware.js";
>>>>>>> 8d95dec (Initial project code)

const router = Router();

// Protect all website endpoints with authentication
router.use(requireAuth);
<<<<<<< HEAD
=======
// Ensure external API scripts respect rate limits independently of web dashboard users
router.use(developerApiRateLimiter);
>>>>>>> 8d95dec (Initial project code)

router.get("/", getWebsitesHandler);
router.post("/", createWebsiteHandler);
router.get("/:id", getWebsiteByIdHandler);
router.put("/:id", updateWebsiteHandler);
<<<<<<< HEAD
=======
router.post("/:id/publish", publishWebsiteHandler);
router.post("/:id/restore/:revisionId", restoreRevisionHandler);
>>>>>>> 8d95dec (Initial project code)
router.delete("/:id", deleteWebsiteHandler);

export default router;
