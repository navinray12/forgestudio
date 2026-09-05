import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { getWebsiteById } from "./website.service.js";

const db = prisma as any;

export const DEFAULT_CAPABILITIES: Record<string, string[]> = {
    OWNER: ["VIEW", "COMMENT", "EDIT_CONTENT", "EDIT_DESIGN", "PUBLISH", "MANAGE_MEMBERS", "MANAGE_PERMISSIONS", "MANAGE_PROJECT"],
    ADMIN: ["VIEW", "COMMENT", "EDIT_CONTENT", "EDIT_DESIGN", "PUBLISH", "MANAGE_MEMBERS", "MANAGE_PERMISSIONS"],
    DESIGNER: ["VIEW", "COMMENT", "EDIT_CONTENT", "EDIT_DESIGN", "PUBLISH"],
    CONTENT_EDITOR: ["VIEW", "COMMENT", "EDIT_CONTENT", "PUBLISH"],
    REVIEWER: ["VIEW", "COMMENT"]
};

export async function canUserAccessResource(userId: string, websiteId: string, resourceId: string, capability: string): Promise<boolean> {
    // 1. Check basic ownership / team access via getWebsiteById
    const website = await getWebsiteById(websiteId, userId);
    const role = website.userPermission || "REVIEWER";

    if (role === "OWNER") return true;

    // 2. Check Role defaults
    let isAllowed = DEFAULT_CAPABILITIES[role]?.includes(capability) || false;

    // 3. Find Global Overrides (resourceId = "*")
    const globalOverride = await db.granularPermission.findUnique({
        where: { websiteId_userId_resourceId_capability: { websiteId, userId, resourceId: "*", capability } }
    });

    if (globalOverride) {
        isAllowed = (globalOverride.effect === "ALLOW");
    }

    // 4. Find Specific Resource Overrides
    if (resourceId !== "*") {
        const specificOverride = await db.granularPermission.findUnique({
            where: { websiteId_userId_resourceId_capability: { websiteId, userId, resourceId, capability } }
        });

        if (specificOverride) {
            isAllowed = (specificOverride.effect === "ALLOW");
        }
    }

    return isAllowed;
}

export async function authorizeResourceAccess(userId: string, websiteId: string, resourceId: string, capability: string) {
    const isAllowed = await canUserAccessResource(userId, websiteId, resourceId, capability);
    if (!isAllowed) {
        throw new AppError(`You do not have permission to ${capability} this resource.`, 403, "FORBIDDEN");
    }
}

export async function getGranularPermissions(websiteId: string, requesterUserId: string) {
    const website = await getWebsiteById(websiteId, requesterUserId);
    if (website.userPermission !== "OWNER" && website.userPermission !== "ADMIN" && !DEFAULT_CAPABILITIES[website.userPermission]?.includes("MANAGE_PERMISSIONS")) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    return await db.granularPermission.findMany({
        where: { websiteId },
        include: { user: { select: { fullName: true, email: true } } }
    });
}

export async function setGranularPermission(websiteId: string, requesterUserId: string, targetUserId: string, resourceId: string, capability: string, effect: string) {
    if (effect !== "ALLOW" && effect !== "DENY" && effect !== "INHERIT") throw new AppError("Invalid effect", 400, "BAD_REQUEST");

    const website = await getWebsiteById(websiteId, requesterUserId);
    if (website.userPermission !== "OWNER" && website.userPermission !== "ADMIN" && !DEFAULT_CAPABILITIES[website.userPermission]?.includes("MANAGE_PERMISSIONS")) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    // Prevent changing owner permissions
    if (website.userId === targetUserId) {
        throw new AppError("Cannot restrict project owner", 403, "FORBIDDEN");
    }

    const membership = await db.websiteCollaborator.findUnique({
        where: { websiteId_userId: { websiteId, userId: targetUserId } }
    });
    if (!membership) throw new AppError("Target user is not a project member", 400, "BAD_REQUEST");

    if (effect === "INHERIT") {
        await db.granularPermission.deleteMany({
            where: { websiteId, userId: targetUserId, resourceId, capability }
        });
        return { success: true };
    }

    const perm = await db.granularPermission.upsert({
        where: { websiteId_userId_resourceId_capability: { websiteId, userId: targetUserId, resourceId, capability } },
        update: { effect },
        create: { websiteId, userId: targetUserId, resourceId, capability, effect }
    });

    return { success: true, permission: perm };
}
