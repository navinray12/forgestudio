import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getWebsitesHandler,
  getWebsiteByIdHandler,
  createWebsiteHandler,
  updateWebsiteHandler,
  deleteWebsiteHandler,
  getWebsiteRolesHandler,
  updateWebsiteRoleHandler,
  inviteWebsiteMemberHandler,
  acceptWebsiteInvitationHandler,
  removeWebsiteMemberHandler,
  getGranularPermissionsHandler,
  setGranularPermissionHandler,
} from "../controllers/website.controller.js";

const router = Router();

// Protect all website endpoints with authentication
router.use(requireAuth);

router.get("/", getWebsitesHandler);
router.post("/", createWebsiteHandler);
router.get("/:id", getWebsiteByIdHandler);
router.put("/:id", updateWebsiteHandler);
router.delete("/:id", deleteWebsiteHandler);

router.get("/:id/roles", getWebsiteRolesHandler);
router.put("/:id/roles/:collaboratorUserId", updateWebsiteRoleHandler);

router.post("/accept", acceptWebsiteInvitationHandler);
router.post("/:id/invite", inviteWebsiteMemberHandler);
router.delete("/:id/members/:collaboratorUserId", removeWebsiteMemberHandler);

router.get("/:id/permissions", getGranularPermissionsHandler);
router.post("/:id/permissions", setGranularPermissionHandler);

export default router;

