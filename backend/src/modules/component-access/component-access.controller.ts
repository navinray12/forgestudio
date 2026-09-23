/**
 * @file Component access: HTTP handlers that translate requests into module operations and responses. File responsibility: component access controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Request, Response } from "express";
import { prisma } from "../../platform/database/prisma.js";
import { AppError } from "../../platform/http/app-error.js";

// Helper to check if user has admin/owner rights to moderate access
/**
 * Verify Admin Access.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 */
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
/**
 * Get All Component Accesses.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
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
/**
 * Get Component Access.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
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
/**
 * Grant Component Access.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
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
/**
 * Revoke Component Access.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
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

// Clears ALL specifically granted accesses if they unlock it fully
/**
 * Clear Component Restrictions.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
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
