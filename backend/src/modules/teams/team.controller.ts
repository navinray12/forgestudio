/**
 * @file Teams: HTTP handlers that translate requests into module operations and responses. File responsibility: team controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { Request, Response, NextFunction } from "express";
import * as teamService from "./team.service.js";

/**
 * Create Team Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function createTeamHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const { name, description } = req.body;
        const team = await teamService.createTeam(res.locals.user.id, name, description);
        res.status(201).json({ success: true, team });
    } catch (error) { next(error); }
}

/**
 * Get User Teams Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function getUserTeamsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const teams = await teamService.getUserTeams(res.locals.user.id);
        res.json({ success: true, teams });
    } catch (error) { next(error); }
}

/**
 * Get Team Details Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function getTeamDetailsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const teamId = req.params.id as string;
        const team = await teamService.getTeamDetails(teamId, res.locals.user.id);
        res.json({ success: true, team });
    } catch (error) { next(error); }
}

/**
 * Update Team Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function updateTeamHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const teamId = req.params.id as string;
        const team = await teamService.updateTeam(teamId, res.locals.user.id, req.body);
        res.json({ success: true, team });
    } catch (error) { next(error); }
}

/**
 * Delete Team Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function deleteTeamHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const teamId = req.params.id as string;
        await teamService.deleteTeam(teamId, res.locals.user.id);
        res.json({ success: true });
    } catch (error) { next(error); }
}

/**
 * Invite Member Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function inviteMemberHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const teamId = req.params.id as string;
        const { email, role } = req.body;
        const result = await teamService.inviteMember(teamId, res.locals.user.id, email, role);
        res.json({ success: true, ...result });
    } catch (error) { next(error); }
}

/**
 * Accept Invitation Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function acceptInvitationHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const { token } = req.body;
        const result = await teamService.acceptInvitation(token, res.locals.user.id);
        res.json(result);
    } catch (error) { next(error); }
}

/**
 * Remove Member Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function removeMemberHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const teamId = req.params.id as string;
        const userId = req.params.userId as string;
        await teamService.removeTeamMember(teamId, res.locals.user.id, userId);
        res.json({ success: true });
    } catch (error) { next(error); }
}
