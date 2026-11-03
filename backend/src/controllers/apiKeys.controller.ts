import type { Request, Response, NextFunction } from "express";
import { prisma as db } from "../config/prisma.js";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  rotateApiKey,
} from "../services/apiKey.service.js";
import { apiKeyInput } from "../services/api-key-input.js";
import {z} from "zod";
import { AppError } from "../utils/app-error.js";


export async function listApiKeysHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = res.locals.user;
    const safeKeys = await listApiKeys(user.id);
    return res.status(200).json({ success: true, keys: safeKeys });
  } catch (e) {
    next(e);
  }
}

export async function createApiKeyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = res.locals.user;

    const requestSchema = apiKeyInput.extend({
      expiresInDays: z.coerce
        .number()
        .int()
        .min(1)
        .max(365)
        .nullish(),
    });

    const parsed = requestSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(
        "Enter a valid label, API scopes, and expiration period.",
        400,
        "INVALID_REQUEST"
      );
    }

    const { name, scopes, expiresInDays } = parsed.data;

    const result = await createApiKey(
      user.id,
      name,
      scopes,
      expiresInDays ?? null
    );

    return res.status(201).json({
      success: true,
      message: "API key created. It will only be shown once.",
      rawSecret: result.rawSecret,
      key: {
        id: result.apiKey.id,
        name: result.apiKey.name,
        maskedKey: result.apiKey.maskedKey,
        scopes: result.apiKey.scopes,
        expiresAt: result.apiKey.expiresAt,
        createdAt: result.apiKey.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function revokeApiKeyHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const keyId = req.params.id as string;

    if (!z.uuid().safeParse(keyId).success) {
      throw new AppError(
        "Invalid API key identifier.",
        400,
        "INVALID_REQUEST"
      );
    }

    const revoked = await revokeApiKey(user.id, keyId);

    if (!revoked) {
      throw new AppError(
        "API key not found or already revoked.",
        404,
        "NOT_FOUND"
      );
    }

    return res.status(200).json({ success: true, message: "API key revoked securely." });
  } catch (e) {
    next(e);
  }
}

export async function rotateApiKeyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = res.locals.user;
    const keyId = req.params.id as string;
    const { expiresInDays } = req.body || {};

    const result = await rotateApiKey(
      user.id,
      keyId,
      expiresInDays ? Number(expiresInDays) : null
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "API key not found." },
      });
    }

    return res.status(200).json({
      success: true,
      message: "API key rotated. The old key was revoked and the new secret is shown once.",
      rawSecret: result.rawSecret,
      oldKeyId: result.oldKeyId,
      key: {
        id: result.newKey.id,
        name: result.newKey.name,
        maskedKey: result.newKey.maskedKey,
        scopes: result.newKey.scopes,
        expiresAt: result.newKey.expiresAt,
        createdAt: result.newKey.createdAt,
      },
    });
  } catch (e) {
    next(e);
  }
}
