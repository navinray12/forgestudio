import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import crypto from "crypto";

const db = prisma as any;

export async function createTeam(userId: string, name: string, description?: string) {
    if (!name || name.trim() === "") throw new AppError("Team name is required", 400, "BAD_REQUEST");

    const team = await db.team.create({
        data: {
            name: name.trim(),
            description: description?.trim() || null,
            ownerId: userId,
            members: {
                create: {
                    userId,
                    role: "OWNER"
                }
            }
        }
    });
    return team;
}

export async function getUserTeams(userId: string) {
    return await db.team.findMany({
        where: {
            members: { some: { userId } }
        },
        include: {
            _count: { select: { members: true, websites: true } }
        }
    });
}

export async function getTeamDetails(teamId: string, userId: string) {
    const membership = await db.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } }
    });
    if (!membership) throw new AppError("Forbidden", 403, "FORBIDDEN");

    const team = await db.team.findUnique({
        where: { id: teamId },
        include: {
            members: { include: { user: { select: { id: true, fullName: true, email: true } } } },
            websites: true,
            invitations: { where: { status: "PENDING" } }
        }
    });
    if (!team) throw new AppError("Team not found", 404, "NOT_FOUND");
    return { ...team, userRole: membership.role };
}

export async function deleteTeam(teamId: string, userId: string) {
    const team = await db.team.findUnique({ where: { id: teamId } });
    if (!team) throw new AppError("Team not found", 404, "NOT_FOUND");
    if (team.ownerId !== userId) throw new AppError("Only team owner can delete the team", 403, "FORBIDDEN");

    await db.team.delete({ where: { id: teamId } });
    return { success: true };
}

export async function updateTeam(teamId: string, userId: string, data: any) {
    const membership = await db.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } }
    });
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    return await db.team.update({
        where: { id: teamId },
        data: { name: data.name, description: data.description }
    });
}

export async function inviteMember(teamId: string, inviterId: string, email: string, role: string = "DESIGNER") {
    const membership = await db.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: inviterId } }
    });
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const existingMember = await db.user.findUnique({
        where: { email },
        include: { teamMemberships: { where: { teamId } } }
    });

    if (existingMember && existingMember.teamMemberships.length > 0) {
        throw new AppError("User is already a member of this team.", 400, "BAD_REQUEST");
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    const invite = await db.teamInvitation.create({
        data: {
            teamId,
            email,
            role,
            tokenHash,
            status: "PENDING",
            expiresAt: expiry,
            invitedBy: inviterId
        }
    });

    return { inviteId: invite.id, token };
}

export async function acceptInvitation(token: string, userId: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invite = await db.teamInvitation.findUnique({ where: { tokenHash } });
    if (!invite) throw new AppError("Invalid invitation", 400, "BAD_REQUEST");
    if (invite.status !== "PENDING") throw new AppError("Invitation is already processed.", 400, "BAD_REQUEST");
    if (invite.expiresAt < new Date()) throw new AppError("Invitation expired.", 400, "BAD_REQUEST");

    const user = await db.user.findUnique({ where: { id: userId } });
    if (user?.email !== invite.email) throw new AppError("This invitation was sent to a different email address.", 400, "BAD_REQUEST");

    const existing = await db.teamMember.findUnique({
        where: { teamId_userId: { teamId: invite.teamId, userId } }
    });

    if (existing) {
        await db.teamInvitation.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });
        return { success: true, teamId: invite.teamId };
    }

    await db.$transaction([
        db.teamMember.create({
            data: {
                teamId: invite.teamId,
                userId,
                role: invite.role
            }
        }),
        db.teamInvitation.update({
            where: { id: invite.id },
            data: { status: "ACCEPTED" }
        })
    ]);

    return { success: true, teamId: invite.teamId };
}

export async function removeTeamMember(teamId: string, requesterId: string, targetUserId: string) {
    const requesterMembership = await db.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: requesterId } }
    });

    if (!requesterMembership || (requesterMembership.role !== "OWNER" && requesterMembership.role !== "ADMIN")) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const team = await db.team.findUnique({ where: { id: teamId } });
    if (team?.ownerId === targetUserId) {
        throw new AppError("Cannot remove the team owner.", 403, "FORBIDDEN");
    }

    await db.teamMember.delete({
        where: { teamId_userId: { teamId, userId: targetUserId } }
    });

    return { success: true };
}
