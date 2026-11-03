import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getUserOrganizationsHandler,
  createOrganizationHandler,
  getOrganizationHandler,
  addOrganizationMemberHandler,
  removeOrganizationMemberHandler,
} from "../controllers/organization.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", getUserOrganizationsHandler);
router.post("/", createOrganizationHandler);
router.get("/:id", getOrganizationHandler);
router.post("/:id/members", addOrganizationMemberHandler);
router.delete("/:id/members/:userId", removeOrganizationMemberHandler);

export default router;
