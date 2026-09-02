import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import { randomBytes, createHash } from "crypto";

export async function createApiKeyHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const { name, scopes } = req.body;
        const userId = res.locals.user.id;

        if (!name) {
            return res.status(400).json({ success: false, message: "API key name is required" });
        }

        // Generate raw key
        const rawKey = `fs_${randomBytes(24).toString("hex")}`;
        const keyHash = createHash('sha256').update(rawKey).digest('hex');

        const db = prisma as any;
        const newKey = await db.apiKey.create({
            data: {
                name,
                keyHash,
                userId,
                scopes: scopes && Array.isArray(scopes) ? scopes : ["read"]
            }
        });

        // F-118: Return rawKey only ONCE. It is mathematically impossible to recover it from the hash later.
        return res.status(201).json({
            success: true,
            data: {
                id: newKey.id,
                name: newKey.name,
                scopes: newKey.scopes,
                createdAt: newKey.createdAt,
                key: rawKey // ONLY SEND THIS ONCE
            }
        });
    } catch (e) {
        next(e);
    }
}

export async function getApiKeysHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = res.locals.user.id;
        const db = prisma as any;

        const keys = await db.apiKey.findMany({
            where: { userId },
            select: {
                id: true,
                name: true,
                scopes: true,
                lastUsedAt: true,
                revokedAt: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({ success: true, data: keys });
    } catch (e) {
        next(e);
    }
}

export async function revokeApiKeyHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = res.locals.user.id;
        const { id } = req.params;
        const db = prisma as any;

        const apiKey = await db.apiKey.findFirst({
            where: { id, userId }
        });

        if (!apiKey) {
            return res.status(404).json({ success: false, message: "API key not found" });
        }

        await db.apiKey.update({
            where: { id },
            data: { revokedAt: new Date() }
        });

        return res.status(200).json({ success: true, message: "API Key revoked successfully" });
    } catch (e) {
        next(e);
    }
}
