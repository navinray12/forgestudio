/**
 * @file Teams: HTTP route registration and middleware order. File responsibility: team routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import { requireAuth } from "../authentication/session-authentication.middleware.js";
import * as teamController from "./team.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/accept", teamController.acceptInvitationHandler);

router.get("/", teamController.getUserTeamsHandler);
router.post("/", teamController.createTeamHandler);

router.get("/:id", teamController.getTeamDetailsHandler);
router.put("/:id", teamController.updateTeamHandler);
router.delete("/:id", teamController.deleteTeamHandler);

router.post("/:id/invite", teamController.inviteMemberHandler);
router.delete("/:id/members/:userId", teamController.removeMemberHandler);

export default router;
