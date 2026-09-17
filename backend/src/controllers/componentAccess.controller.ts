import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

// Helper to check if user has admin/owner rights to moderate access
const verifyAdminAccess = async (websiteId: string, userId: string) => {
    const website = await prisma.website.findUnique({
        where: { id: websiteId },
        include: { collaborators: true },
    });

    if (!website) throw new AppError("Website not found", 404, "NOT_FOUND");

    if (website.userId === userId) return true; // Owner is admin

    const collab = website.collaborators.find(c => c.userId === userId);
    if (!collab || collab.permission !== "ADMIN") {
        throw new AppError("Forbidden: only Admins can manage component locks", 403, "FORBIDDEN");
    }

    return true;
};

// GET /api/v1/component-access/:websiteId/all
export const getAllComponentAccesses = async (req: Request, res: Response): Promise<void> => {
    try {
        const websiteId = req.params.websiteId as string;
        const userId = res.locals.user?.id;

        const accesses = await prisma.componentAccess.findMany({
            where: { websiteId, userId }
        });

        res.status(200).json({ success: true, accesses });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /api/v1/component-access/:websiteId/:componentId
export const getComponentAccess = async (req: Request, res: Response): Promise<void> => {
    try {
        const websiteId = req.params.websiteId as string;
        const componentId = req.params.componentId as string;
        const userId = res.locals.user?.id;

        const website = await prisma.website.findUnique({
            where: { id: websiteId },
            include: { collaborators: true }
        });
        if (!website || (website.userId !== userId && !website.collaborators.some(c => c.userId === userId))) {
            throw new AppError("Forbidden", 403, "FORBIDDEN");
        }

        const accesses = await prisma.componentAccess.findMany({
            where: { websiteId, componentId },
            include: {
                user: { select: { id: true, fullName: true, email: true } }
            }
        });

        res.status(200).json({ success: true, accesses });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ success: false, message: error.message });
        } else {
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
};

// POST /api/v1/component-access/:websiteId/:componentId/grant
export const grantComponentAccess = async (req: Request, res: Response): Promise<void> => {
    try {
        const websiteId = req.params.websiteId as string;
        const componentId = req.params.componentId as string;
        const userId = res.locals.user?.id;
        const { targetUserId, permission = "EDIT" } = req.body;

        await verifyAdminAccess(websiteId, userId);

        const access = await prisma.componentAccess.upsert({
            where: {
                websiteId_componentId: { websiteId, componentId }
            },
            update: {
                userId: targetUserId,
                permission
            },
            create: {
                websiteId,
                componentId,
                userId: targetUserId,
                permission
            }
        });

        // Return enriched
        const returnAccess = await prisma.componentAccess.findUnique({
            where: { id: access.id },
            include: { user: { select: { id: true, fullName: true, email: true } } }
        });

        res.status(200).json({ success: true, access: returnAccess });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ success: false, message: error.message });
        } else {
            console.error(error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
};

// DELETE /api/v1/component-access/:websiteId/:componentId/revoke/:targetUserId
export const revokeComponentAccess = async (req: Request, res: Response): Promise<void> => {
    try {
        const websiteId = req.params.websiteId as string;
        const componentId = req.params.componentId as string;
        const targetUserId = req.params.targetUserId as string;
        const userId = res.locals.user?.id;

        await verifyAdminAccess(websiteId, userId);

        await prisma.componentAccess.deleteMany({
            where: { websiteId, componentId, userId: targetUserId }
        });

        res.status(200).json({ success: true, message: "Access revoked" });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ success: false, message: error.message });
        } else {
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
};

// POST /api/v1/component-access/bulk-clear
export const clearComponentRestrictions = async (req: Request, res: Response): Promise<void> => {
    try {
        const { websiteId, componentId } = req.body;
        const userId = res.locals.user?.id;

        await verifyAdminAccess(websiteId, userId);

        const ids = Array.isArray(componentId) ? componentId : [componentId];

        await prisma.componentAccess.deleteMany({
            where: { websiteId, componentId: { in: ids } }
        });

        res.status(200).json({ success: true, message: "All restrictions cleared for component(s)" });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ success: false, message: error.message });
        } else {
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
};
