import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";

interface CustomFieldInput {
    name: string;
    slug?: string;
    key?: string;
    type?: string;
    required?: boolean;
    options?: Record<string, unknown>;
}

// ====== CPT Management ======
export async function getCustomPostTypesHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const websiteId = req.params.websiteId as string;
        const cpts = await prisma.customPostType.findMany({
            where: { websiteId },
            include: { _count: { select: { entries: true, fields: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ success: true, data: cpts });
    } catch (e) { next(e); }
}

export async function createCustomPostTypeHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const websiteId = req.params.websiteId as string;
        const { name, slug, description, supports } = req.body;

        const existing = await prisma.customPostType.findFirst({ where: { websiteId, slug } });
        if (existing) {
            return res.status(409).json({ success: false, error: { message: "Slug already exists" } });
        }

        const cpt = await prisma.customPostType.create({
            data: {
                websiteId,
                name,
                slug,
                description: description || null,
                supports: supports || ["title", "editor", "thumbnail"],
            }
        });
        res.status(201).json({ success: true, data: cpt });
    } catch (e) { next(e); }
}

export async function deleteCustomPostTypeHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const cptId = req.params.cptId as string;
        // Cascade-delete all related fields and entries first (if Prisma schema doesn't cascade automatically)
        await prisma.customField.deleteMany({ where: { postTypeId: cptId } });
        await prisma.customEntry.deleteMany({ where: { postTypeId: cptId } });
        await prisma.customPostType.delete({ where: { id: cptId } });
        res.status(200).json({ success: true, message: "Custom Post Type deleted successfully." });
    } catch (e) { next(e); }
}

// ====== Custom Fields ======
export async function getCustomFieldsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const cptId = req.params.cptId as string;
        const fields = await prisma.customField.findMany({
            where: { postTypeId: cptId },
            orderBy: { order: 'asc' }
        });
        res.status(200).json({ success: true, data: fields });
    } catch (e) { next(e); }
}

export async function saveCustomFieldsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const cptId = req.params.cptId as string;
        const { fields } = req.body; // Array of fields from drag-and-drop

        await prisma.$transaction(async (tx) => {
            await tx.customField.deleteMany({ where: { postTypeId: cptId } });
            if (fields && Array.isArray(fields) && fields.length > 0) {
                await tx.customField.createMany({
                    data: fields.map((f: CustomFieldInput, idx: number) => ({
                        postTypeId: cptId,
                        name: f.name,
                        slug: f.slug || f.key || f.name.toLowerCase().replace(/\s+/g, '_'),
                        type: f.type || 'text',
                        order: idx,
                        config: {
                            required: f.required || false,
                            options: (f.options || {}) as any,
                        }
                    }))
                });
            }
        });

        res.status(200).json({ success: true });
    } catch (e) { next(e); }
}

// ====== Custom Entries ======
export async function getCustomEntriesHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const cptId = req.params.cptId as string;
        const entries = await prisma.customEntry.findMany({
            where: { postTypeId: cptId },
            include: { author: { select: { fullName: true, email: true } } },
            orderBy: { updatedAt: 'desc' }
        });
        res.status(200).json({ success: true, data: entries });
    } catch (e) { next(e); }
}

export async function createCustomEntryHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const cptId = req.params.cptId as string;
        const { title, slug, status, values, data } = req.body;
        const authorId = res.locals.user.id; // From requireAuth

        const existing = await prisma.customEntry.findFirst({ where: { postTypeId: cptId, slug } });
        if (existing) {
            return res.status(409).json({ success: false, error: { message: "Slug already exists" } });
        }

        const entry = await prisma.customEntry.create({
            data: {
                postTypeId: cptId,
                title,
                slug,
                status: status || "PUBLISHED",
                data: values ?? data ?? {},
                authorId,
            }
        });
        res.status(201).json({ success: true, data: entry });
    } catch (e) { next(e); }
}

export async function updateCustomEntryHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const entryId = req.params.entryId as string;
        const { title, slug, status, values, data } = req.body;

        const entry = await prisma.customEntry.update({
            where: { id: entryId },
            data: {
                title,
                slug,
                status,
                data: values ?? data ?? {},
            }
        });
        res.status(200).json({ success: true, data: entry });
    } catch (e) { next(e); }
}

export async function deleteCustomEntryHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const entryId = req.params.entryId as string;
        await prisma.customEntry.delete({ where: { id: entryId } });
        res.status(200).json({ success: true });
    } catch (e) { next(e); }
}
