import type { Request, Response, NextFunction } from "express";
import { prisma as db } from "../config/prisma.js";
import crypto from "crypto";

export async function listApiKeysHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const user = res.locals.user;
        const keys = await db.developerApiKey.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });

        const safeKeys = keys.map(k => ({
            id: k.id,
            name: k.name,
            scopes: k.scopes,
            createdAt: k.createdAt,
            lastUsedAt: k.lastUsedAt,
            revokedAt: k.revokedAt,
            isRevoked: !!k.revokedAt
        }));

        res.status(200).json({ success: true, keys: safeKeys });
    } catch (e) { next(e); }
}

export async function createApiKeyHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const user = res.locals.user;
        const { name, scopes } = req.body;

        // Masked generation
        const rawSecret = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

        const key = await db.developerApiKey.create({
            data: {
                userId: user.id,
                name: name || "Developer Key",
                tokenHash,
                scopes: scopes || ["websites:read"]
            }
        });

        res.status(201).json({
            success: true,
            message: "API key created. It will only be shown once.",
            rawSecret, // F-118 specifies we return this ONLY once during creation
            key: { id: key.id, name: key.name, scopes: key.scopes, createdAt: key.createdAt }
        });
    } catch (e) { next(e); }
}

export async function revokeApiKeyHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const user = res.locals.user;
        const keyId = req.params.id as string;

        await db.developerApiKey.updateMany({
            where: { id: keyId, userId: user.id },
            data: { revokedAt: new Date() }
        });

        res.status(200).json({ success: true, message: "API key revoked securely." });
    } catch (e) { next(e); }
}
