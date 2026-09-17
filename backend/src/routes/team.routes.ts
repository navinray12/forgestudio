import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import * as teamController from "../controllers/team.controller.js";

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

router.post("/invitations/:inviteId/revoke", teamController.revokeInvitationHandler);
router.post("/invitations/:inviteId/resend", teamController.resendInvitationHandler);
router.post("/:id/invitations/:inviteId/revoke", teamController.revokeInvitationHandler);
router.post("/:id/invitations/:inviteId/resend", teamController.resendInvitationHandler);

export default router;
