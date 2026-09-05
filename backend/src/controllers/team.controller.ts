import type { Request, Response, NextFunction } from "express";
import * as teamService from "../services/team.service.js";

export async function createTeamHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const { name, description } = req.body;
        const team = await teamService.createTeam(res.locals.user.id, name, description);
        res.status(201).json({ success: true, team });
    } catch (error) { next(error); }
}

export async function getUserTeamsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const teams = await teamService.getUserTeams(res.locals.user.id);
        res.json({ success: true, teams });
    } catch (error) { next(error); }
}

export async function getTeamDetailsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const teamId = req.params.id as string;
        const team = await teamService.getTeamDetails(teamId, res.locals.user.id);
        res.json({ success: true, team });
    } catch (error) { next(error); }
}

export async function updateTeamHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const teamId = req.params.id as string;
        const team = await teamService.updateTeam(teamId, res.locals.user.id, req.body);
        res.json({ success: true, team });
    } catch (error) { next(error); }
}

export async function deleteTeamHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const teamId = req.params.id as string;
        await teamService.deleteTeam(teamId, res.locals.user.id);
        res.json({ success: true });
    } catch (error) { next(error); }
}

export async function inviteMemberHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const teamId = req.params.id as string;
        const { email, role } = req.body;
        const result = await teamService.inviteMember(teamId, res.locals.user.id, email, role);
        res.json({ success: true, ...result });
    } catch (error) { next(error); }
}

export async function acceptInvitationHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const { token } = req.body;
        const result = await teamService.acceptInvitation(token, res.locals.user.id);
        res.json(result);
    } catch (error) { next(error); }
}

export async function removeMemberHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const teamId = req.params.id as string;
        const userId = req.params.userId as string;
        await teamService.removeTeamMember(teamId, res.locals.user.id, userId);
        res.json({ success: true });
    } catch (error) { next(error); }
}
