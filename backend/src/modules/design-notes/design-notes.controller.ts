/**
 * @file Design notes: HTTP handlers that translate requests into module operations and responses. File responsibility: design notes controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Request, Response } from "express";
import { prisma } from "../../platform/database/prisma.js";

// Helper to check access to website
/**
 * Check Website Access.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 */
const checkWebsiteAccess = async (websiteId: string, userId: string): Promise<boolean> => {
    const website = await prisma.website.findUnique({
        where: { id: websiteId },
        include: { collaborators: true },
    });

    if (!website) return false;
    if (website.userId === userId) return true;

    const isCollaborator = website.collaborators.some((c: { userId: string }) => c.userId === userId);
    return isCollaborator;
};

// POST /notes
/**
 * Create Note.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export const createNote = async (req: Request, res: Response): Promise<void> => {
    try {
        const { websiteId, elementId, content } = req.body;
        const authorId = res.locals.user?.id;

        if (!websiteId || !content) {
            res.status(400).json({ success: false, message: "Missing required fields" });
            return;
        }

        const hasAccess = await checkWebsiteAccess(websiteId, authorId);
        if (!hasAccess) {
            res.status(403).json({ success: false, message: "Forbidden" });
            return;
        }

        const note = await prisma.designNote.create({
            data: {
                websiteId,
                elementId: elementId || null,
                authorId,
                content,
            },
            include: {
                author: { select: { id: true, fullName: true, email: true } },
            }
        });

        res.status(201).json({ success: true, note });
    } catch (error) {
        console.error("Create note error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /notes?websiteId=...
/**
 * Get Notes.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export const getNotes = async (req: Request, res: Response): Promise<void> => {
    try {
        const { websiteId } = req.query;
        const userId = res.locals.user?.id;

        if (!websiteId || typeof websiteId !== "string") {
            res.status(400).json({ success: false, message: "websiteId query parameter is required" });
            return;
        }

        const hasAccess = await checkWebsiteAccess(websiteId, userId);
        if (!hasAccess) {
            res.status(403).json({ success: false, message: "Forbidden" });
            return;
        }

        const notes = await prisma.designNote.findMany({
            where: { websiteId },
            include: {
                author: { select: { id: true, fullName: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        res.status(200).json({ success: true, notes });
    } catch (error) {
        console.error("Get notes error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// GET /notes/:id
/**
 * Get Note By Id.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export const getNoteById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const userId = res.locals.user?.id;

        const note = await prisma.designNote.findUnique({
            where: { id },
            include: {
                author: { select: { id: true, fullName: true, email: true } },
            }
        });

        if (!note) {
            res.status(404).json({ success: false, message: "Note not found" });
            return;
        }

        const hasAccess = await checkWebsiteAccess(note.websiteId, userId);
        if (!hasAccess) {
            res.status(403).json({ success: false, message: "Forbidden" });
            return;
        }

        res.status(200).json({ success: true, note });
    } catch (error) {
        console.error("Get note error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// PATCH /notes/:id
/**
 * Update Note.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export const updateNote = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { content } = req.body;
        const userId = res.locals.user?.id;

        if (!content) {
            res.status(400).json({ success: false, message: "Content is required" });
            return;
        }

        const existingNote = await prisma.designNote.findUnique({ where: { id } });
        if (!existingNote) {
            res.status(404).json({ success: false, message: "Note not found" });
            return;
        }

        // Only the author can edit the note content
        if (existingNote.authorId !== userId) {
            res.status(403).json({ success: false, message: "Forbidden: You can only edit your own notes" });
            return;
        }

        const note = await prisma.designNote.update({
            where: { id },
            data: { content },
            include: {
                author: { select: { id: true, fullName: true, email: true } },
            }
        });

        res.status(200).json({ success: true, note });
    } catch (error) {
        console.error("Update note error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// DELETE /notes/:id
/**
 * Delete Note.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export const deleteNote = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const userId = res.locals.user?.id;

        const existingNote = await prisma.designNote.findUnique({ where: { id } });
        if (!existingNote) {
            res.status(404).json({ success: false, message: "Note not found" });
            return;
        }

        const hasAccess = await checkWebsiteAccess(existingNote.websiteId, userId);
        if (!hasAccess) {
            res.status(403).json({ success: false, message: "Forbidden" });
            return;
        }

        // Allow author or website owner to delete
        const isOwner = await prisma.website.findFirst({ where: { id: existingNote.websiteId, userId: userId } });
        if (existingNote.authorId !== userId && !isOwner) {
            res.status(403).json({ success: false, message: "Forbidden: Not authorized to delete this note" });
            return;
        }

        await prisma.designNote.delete({ where: { id } });

        res.status(200).json({ success: true, message: "Note deleted successfully" });
    } catch (error) {
        console.error("Delete note error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /notes/:id/resolve
/**
 * Resolve Note.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export const resolveNote = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const userId = res.locals.user?.id;

        const existingNote = await prisma.designNote.findUnique({ where: { id } });
        if (!existingNote) {
            res.status(404).json({ success: false, message: "Note not found" });
            return;
        }

        const hasAccess = await checkWebsiteAccess(existingNote.websiteId, userId);
        if (!hasAccess) {
            res.status(403).json({ success: false, message: "Forbidden" });
            return;
        }

        const note = await prisma.designNote.update({
            where: { id },
            data: {
                resolved: true,
            },
            include: {
                author: { select: { id: true, fullName: true, email: true } },
            }
        });

        res.status(200).json({ success: true, note });
    } catch (error) {
        console.error("Resolve note error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// POST /notes/:id/reopen
/**
 * Reopen Note.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export const reopenNote = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const userId = res.locals.user?.id;

        const existingNote = await prisma.designNote.findUnique({ where: { id } });
        if (!existingNote) {
            res.status(404).json({ success: false, message: "Note not found" });
            return;
        }

        const hasAccess = await checkWebsiteAccess(existingNote.websiteId, userId);
        if (!hasAccess) {
            res.status(403).json({ success: false, message: "Forbidden" });
            return;
        }

        const note = await prisma.designNote.update({
            where: { id },
            data: {
                resolved: false,
            },
            include: {
                author: { select: { id: true, fullName: true, email: true } },
            }
        });

        res.status(200).json({ success: true, note });
    } catch (error) {
        console.error("Reopen note error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
