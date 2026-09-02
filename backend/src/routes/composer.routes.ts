import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
    composerStatusHandler,
    composerValidateHandler,
    composerInstallHandler,
    composerUpdateHandler,
} from "../controllers/composer.controller.js";

const router = Router();

/** All Composer routes require authentication. */
router.use(requireAuth);

/** Only ADMIN or SUPER_ADMIN may perform Composer operations (F-122 RBAC). */
function requireAdminRole(req: Request, res: Response, next: NextFunction) {
    const user = res.locals.user;
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
        return res.status(403).json({
            success: false,
            message: "Composer operations require ADMIN or SUPER_ADMIN role.",
        });
    }
    next();
}

// GET /api/v1/composer/status – any authenticated user can read status
router.get("/status", composerStatusHandler);

// Mutating operations require admin
router.post("/validate", requireAdminRole, composerValidateHandler);
router.post("/install", requireAdminRole, composerInstallHandler);
router.post("/update", requireAdminRole, composerUpdateHandler);

export default router;
