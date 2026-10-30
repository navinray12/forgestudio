import type { Request, Response, NextFunction } from "express";
import { prisma as db } from "../config/prisma.js";
import { createApiKey } from "../services/apiKey.service.js";
import { apiKeyInput } from "../services/api-key-input.js";
import {z} from "zod";
import { AppError } from "../utils/app-error.js";

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
        const parsed = apiKeyInput.safeParse(req.body);
        if (!parsed.success) throw new AppError("Enter a label (1-50 characters) and select valid API scopes.", 400, "INVALID_REQUEST");
        const {rawSecret, apiKey: key} = await createApiKey(user.id, parsed.data.name, parsed.data.scopes);

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
        if (!z.uuid().safeParse(keyId).success) throw new AppError("Invalid API key identifier.", 400, "INVALID_REQUEST");

        const existing = await db.developerApiKey.findFirst({where: {id: keyId, userId: user.id}});
        if (!existing) throw new AppError("API key not found.", 404, "NOT_FOUND");
        await db.developerApiKey.updateMany({
            where: { id: keyId, userId: user.id, revokedAt: null },
            data: { revokedAt: new Date() }
        });

        res.status(200).json({ success: true, message: "API key revoked securely." });
    } catch (e) { next(e); }
}
