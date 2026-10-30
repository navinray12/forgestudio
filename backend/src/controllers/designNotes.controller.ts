import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { getWebsiteById } from "../services/website.service.js";
import { canUserAccessResource } from "../services/permission.service.js";

const db = prisma as any;

/**
 * Validates that user has access to the website and checks the requested capability.
 * Resolves both direct ownership, legacy collaborators, and workspace memberships.
 */
async function verifyWebsiteCapability(
  websiteId: string,
  userId: string,
  capability: "VIEW" | "COMMENT"
): Promise<{ website: any; authorized: boolean }> {
  try {
    const website = await getWebsiteById(websiteId, userId);
    if (!website) {
      return { website: null, authorized: false };
    }
    const authorized = await canUserAccessResource(userId, websiteId, "*", capability);
    return { website, authorized };
  } catch {
    return { website: null, authorized: false };
  }
}

// POST /notes
export const createNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { websiteId, elementId, content } = req.body;
    const authorId = res.locals.user?.id;

    if (!authorId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (!websiteId || typeof websiteId !== "string" || !websiteId.trim()) {
      res.status(400).json({ success: false, message: "websiteId is required" });
      return;
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      res.status(400).json({ success: false, message: "content is required and cannot be empty" });
      return;
    }

    const { website, authorized } = await verifyWebsiteCapability(websiteId.trim(), authorId, "COMMENT");
    if (!website) {
      res.status(404).json({ success: false, message: "Website not found or access denied" });
      return;
    }

    if (!authorized) {
      res.status(403).json({ success: false, message: "Forbidden: You do not have permission to comment on this website" });
      return;
    }

    const sanitizedElementId =
      typeof elementId === "string" && elementId.trim().length > 0 ? elementId.trim() : null;

    const note = await db.designNote.create({
      data: {
        websiteId: websiteId.trim(),
        elementId: sanitizedElementId,
        authorId,
        content: content.trim(),
      },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
      },
    });

    try {
      await db.auditLog.create({
        data: {
          userId: authorId,
          action: "DESIGN_NOTE_CREATED",
          targetResource: `website:${websiteId.trim()}`,
          details: { noteId: note.id, elementId: note.elementId },
        },
      });
    } catch (_) {}

    res.status(201).json({ success: true, note });
  } catch (error) {
    console.error("Create note error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /notes?websiteId=...
export const getNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { websiteId, elementId, resolved } = req.query;
    const userId = res.locals.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (!websiteId || typeof websiteId !== "string" || !websiteId.trim()) {
      res.status(400).json({ success: false, message: "websiteId query parameter is required" });
      return;
    }

    const { website, authorized } = await verifyWebsiteCapability(websiteId.trim(), userId, "VIEW");
    if (!website) {
      res.status(404).json({ success: false, message: "Website not found or access denied" });
      return;
    }

    if (!authorized) {
      res.status(403).json({ success: false, message: "Forbidden: Access denied" });
      return;
    }

    const whereClause: any = { websiteId: websiteId.trim() };
    if (typeof elementId === "string" && elementId.trim()) {
      whereClause.elementId = elementId.trim();
    }
    if (resolved !== undefined) {
      whereClause.resolved = resolved === "true";
    }

    const notes = await db.designNote.findMany({
      where: whereClause,
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
export const getNoteById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = res.locals.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const note = await db.designNote.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
      },
    }).catch(() => null);

    if (!note) {
      res.status(404).json({ success: false, message: "Note not found" });
      return;
    }

    const { website, authorized } = await verifyWebsiteCapability(note.websiteId, userId, "VIEW");
    if (!website || !authorized) {
      res.status(403).json({ success: false, message: "Forbidden: Access denied" });
      return;
    }

    res.status(200).json({ success: true, note });
  } catch (error) {
    console.error("Get note error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PATCH /notes/:id
export const updateNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { content } = req.body;
    const userId = res.locals.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      res.status(400).json({ success: false, message: "Content is required and cannot be empty" });
      return;
    }

    const existingNote = await db.designNote.findUnique({ where: { id } }).catch(() => null);
    if (!existingNote) {
      res.status(404).json({ success: false, message: "Note not found" });
      return;
    }

    // Author-only editing
    if (existingNote.authorId !== userId) {
      res.status(403).json({ success: false, message: "Forbidden: You can only edit your own notes" });
      return;
    }

    // Verify user still has access to the website
    const { website, authorized } = await verifyWebsiteCapability(existingNote.websiteId, userId, "COMMENT");
    if (!website || !authorized) {
      res.status(403).json({ success: false, message: "Forbidden: Access denied" });
      return;
    }

    const note = await db.designNote.update({
      where: { id },
      data: { content: content.trim() },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
      },
    });

    try {
      await db.auditLog.create({
        data: {
          userId,
          action: "DESIGN_NOTE_UPDATED",
          targetResource: `website:${existingNote.websiteId}`,
          details: { noteId: id },
        },
      });
    } catch (_) {}

    res.status(200).json({ success: true, note });
  } catch (error) {
    console.error("Update note error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /notes/:id
export const deleteNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = res.locals.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const existingNote = await db.designNote.findUnique({ where: { id } }).catch(() => null);
    if (!existingNote) {
      res.status(404).json({ success: false, message: "Note not found" });
      return;
    }

    let website: any = null;
    try {
      website = await getWebsiteById(existingNote.websiteId, userId);
    } catch {
      res.status(403).json({ success: false, message: "Forbidden: Access denied" });
      return;
    }

    if (!website) {
      res.status(403).json({ success: false, message: "Forbidden: Access denied" });
      return;
    }

    // Allow author, website owner, or workspace admin/owner to delete
    const isAuthor = existingNote.authorId === userId;
    const isSiteOwner = website.userId === userId || website.userPermission === "OWNER";
    const isWorkspaceAdmin = website.userPermission === "ADMIN";

    if (!isAuthor && !isSiteOwner && !isWorkspaceAdmin) {
      res.status(403).json({ success: false, message: "Forbidden: Not authorized to delete this note" });
      return;
    }

    await db.designNote.delete({ where: { id } });

    try {
      await db.auditLog.create({
        data: {
          userId,
          action: "DESIGN_NOTE_DELETED",
          targetResource: `website:${existingNote.websiteId}`,
          details: { noteId: id, elementId: existingNote.elementId },
        },
      });
    } catch (_) {}

    res.status(200).json({ success: true, message: "Note deleted successfully" });
  } catch (error) {
    console.error("Delete note error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /notes/:id/resolve
export const resolveNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = res.locals.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const existingNote = await db.designNote.findUnique({ where: { id } }).catch(() => null);
    if (!existingNote) {
      res.status(404).json({ success: false, message: "Note not found" });
      return;
    }

    // Users with COMMENT capability (Owners, Admins, Designers, Reviewers) can resolve notes
    const { website, authorized } = await verifyWebsiteCapability(existingNote.websiteId, userId, "COMMENT");
    if (!website) {
      res.status(404).json({ success: false, message: "Website not found or access denied" });
      return;
    }

    if (!authorized) {
      res.status(403).json({ success: false, message: "Forbidden: You do not have permission to resolve notes" });
      return;
    }

    const note = await db.designNote.update({
      where: { id },
      data: { resolved: true },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
      },
    });

    try {
      await db.auditLog.create({
        data: {
          userId,
          action: "DESIGN_NOTE_RESOLVED",
          targetResource: `website:${existingNote.websiteId}`,
          details: { noteId: id, elementId: existingNote.elementId },
        },
      });
    } catch (_) {}

    res.status(200).json({ success: true, note });
  } catch (error) {
    console.error("Resolve note error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /notes/:id/reopen
export const reopenNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = res.locals.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const existingNote = await db.designNote.findUnique({ where: { id } }).catch(() => null);
    if (!existingNote) {
      res.status(404).json({ success: false, message: "Note not found" });
      return;
    }

    // Users with COMMENT capability can reopen notes
    const { website, authorized } = await verifyWebsiteCapability(existingNote.websiteId, userId, "COMMENT");
    if (!website) {
      res.status(404).json({ success: false, message: "Website not found or access denied" });
      return;
    }

    if (!authorized) {
      res.status(403).json({ success: false, message: "Forbidden: You do not have permission to reopen notes" });
      return;
    }

    const note = await db.designNote.update({
      where: { id },
      data: { resolved: false },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
      },
    });

    try {
      await db.auditLog.create({
        data: {
          userId,
          action: "DESIGN_NOTE_REOPENED",
          targetResource: `website:${existingNote.websiteId}`,
          details: { noteId: id, elementId: existingNote.elementId },
        },
      });
    } catch (_) {}

    res.status(200).json({ success: true, note });
  } catch (error) {
    console.error("Reopen note error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
