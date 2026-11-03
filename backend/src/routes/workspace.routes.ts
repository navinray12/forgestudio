import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getUserWorkspacesHandler,
  createWorkspaceHandler,
  getWorkspaceHandler,
  addWorkspaceMemberHandler,
  removeWorkspaceMemberHandler,
  assignWebsiteToWorkspaceHandler,
} from "../controllers/workspace.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", getUserWorkspacesHandler);
router.post("/", createWorkspaceHandler);
router.get("/:id", getWorkspaceHandler);
router.post("/:id/members", addWorkspaceMemberHandler);
router.delete("/:id/members/:userId", removeWorkspaceMemberHandler);
router.post("/:id/websites/:websiteId", assignWebsiteToWorkspaceHandler);

export default router;
