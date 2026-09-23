/**
 * Phase 19: Website Backup Controller
 * Create, list, restore, and manage backup policy per website.
 */
import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import {
  createBackupRecord,
  appendBackup,
  stripSnapshot,
  restoreFromBackup,
  pruneExpiredBackups,
  validateBackupPolicy,
  updateBackupRecord,
  type BackupTrigger,
} from "../services/backups/websiteBackup.service.js";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function getAuthorizedWebsite(websiteId: string, userId?: string) {
  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) return null;
  if (userId && website.userId !== userId) {
    const collab = await (prisma as any).websiteCollaborator?.findFirst?.({ where: { websiteId, userId } });
    if (!collab) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"].includes(user.role as string)) return null;
    }
  }
  return website;
}

function readBackups(website: any): any[] {
  const ed: any = website.editorData || {};
  return Array.isArray(ed.backups) ? ed.backups : [];
}

async function patchEditorData(websiteId: string, website: any, patch: Record<string, any>) {
  const ed: any = website.editorData || {};
  return prisma.website.update({ where: { id: websiteId }, data: { editorData: { ...ed, ...patch } } });
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/** GET /api/websites/:websiteId/backups */
export async function listBackups(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    let backups = readBackups(website);
    backups = pruneExpiredBackups(backups);

    // Return metadata only (no snapshot payload) for list view
    const metadata = backups.map(stripSnapshot);
    return res.status(200).json({ success: true, backups: metadata, total: metadata.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** POST /api/websites/:websiteId/backups */
export async function createBackup(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const trigger: BackupTrigger = req.body.trigger || "manual";
    const label: string | undefined = req.body.label;
    const notes: string | undefined = req.body.notes;

    const editorData: any = website.editorData || {};
    const backup = createBackupRecord(editorData, { trigger, label, notes });

    let existing = readBackups(website);
    existing = pruneExpiredBackups(existing);
    const updated = appendBackup(existing, backup);

    await patchEditorData(websiteId, website, { backups: updated });

    return res.status(201).json({ success: true, backup: stripSnapshot(backup) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** GET /api/websites/:websiteId/backups/:backupId */
export async function getBackup(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const backupId = String(req.params.backupId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const backups = readBackups(website);
    const backup = backups.find((b: any) => b.id === backupId);
    if (!backup) return res.status(404).json({ success: false, message: "Backup not found" });

    return res.status(200).json({ success: true, backup });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** GET /api/websites/:websiteId/backups/:backupId/download */
export async function downloadBackup(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const backupId = String(req.params.backupId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const backups = readBackups(website);
    const backup = backups.find((b: any) => b.id === backupId);
    if (!backup) return res.status(404).json({ success: false, message: "Backup not found" });

    const safeSlug = (website.slug || website.name || "website").replace(/[^a-zA-Z0-9_-]/g, "_");
    const dateStr = new Date(backup.createdAt).toISOString().slice(0, 10);
    const filename = `backup-${safeSlug}-${dateStr}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(JSON.stringify(backup, null, 2));
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** PATCH /api/websites/:websiteId/backups/:backupId */
export async function updateBackup(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const backupId = String(req.params.backupId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const { label, notes } = req.body;
    const backups = readBackups(website);
    const { updated, backup } = updateBackupRecord(backups, backupId, { label, notes });

    await patchEditorData(websiteId, website, { backups: updated });

    return res.status(200).json({ success: true, backup: stripSnapshot(backup) });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/** POST /api/websites/:websiteId/backups/:backupId/restore */
export async function restoreBackup(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const backupId = String(req.params.backupId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const editorData: any = website.editorData || {};
    const backups = readBackups(website);
    const backup = backups.find((b: any) => b.id === backupId);
    if (!backup) return res.status(404).json({ success: false, message: "Backup not found" });

    // First create a pre-restore backup of the current state
    const preRestoreBackup = createBackupRecord(editorData, {
      trigger: "pre-restore",
      label: `Pre-Restore Snapshot (before restoring ${backupId})`,
    });
    const withPreRestore = appendBackup(backups, preRestoreBackup);

    // Now restore
    const restored = restoreFromBackup({ ...editorData, backups: withPreRestore }, backup);

    await prisma.website.update({ where: { id: websiteId }, data: { editorData: restored } });

    return res.status(200).json({
      success: true,
      message: `Restored from backup ${backupId}`,
      preRestoreBackupId: preRestoreBackup.id,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/** DELETE /api/websites/:websiteId/backups/:backupId */
export async function deleteBackup(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const backupId = String(req.params.backupId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const backups = readBackups(website);
    const filtered = backups.filter((b: any) => b.id !== backupId);
    if (filtered.length === backups.length) return res.status(404).json({ success: false, message: "Backup not found" });

    await patchEditorData(websiteId, website, { backups: filtered });
    return res.status(200).json({ success: true, message: "Backup deleted" });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** GET /api/websites/:websiteId/backups/policy */
export async function getBackupPolicy(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const ed: any = website.editorData || {};
    const policy = validateBackupPolicy(ed.backupPolicy || {});
    return res.status(200).json({ success: true, policy });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** PUT /api/websites/:websiteId/backups/policy */
export async function updateBackupPolicy(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const policy = validateBackupPolicy(req.body);
    await patchEditorData(websiteId, website, { backupPolicy: policy });
    return res.status(200).json({ success: true, policy });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
