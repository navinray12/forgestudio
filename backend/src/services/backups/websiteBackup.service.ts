/**
 * Phase 19: Enterprise Multisite — Website Backup Service
 *
 * Provides on-demand and scheduled snapshot creation, listing,
 * restoration, and metadata for website backups.
 *
 * Durable Storage Architecture:
 * 1. Primary snapshot metadata stored additively in Website.editorData.backups[].
 * 2. Independent durable file archive written to disk at uploads/backups/:websiteId/:backupId.json.
 */
import fs from "fs";
import path from "path";
import { prisma } from "../../config/prisma.js";

export type BackupTrigger = "manual" | "scheduled" | "pre-publish" | "pre-restore";
export type BackupStatus = "creating" | "ready" | "restoring" | "failed" | "expired";

export interface WebsiteBackup {
  /** Unique backup identifier */
  id: string;
  /** Human-readable label */
  label: string;
  /** What triggered this backup */
  trigger: BackupTrigger;
  /** Lifecycle status */
  status: BackupStatus;
  /** ISO timestamp of creation */
  createdAt: string;
  /** Size of the backup data (bytes) */
  sizeBytes: number;
  /** Schema version at time of backup */
  schemaVersion: number;
  /** Durable disk storage path */
  storagePath?: string;
  /** The full editorData snapshot (without nested backups to prevent recursion) */
  snapshot: Record<string, any>;
  /** Optional notes from the user */
  notes?: string;
  /** ISO timestamp of expiry (null = never expires) */
  expiresAt?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of backups retained per website (oldest pruned beyond limit) */
export const MAX_BACKUPS_PER_WEBSITE = 25;

const BACKUPS_STORAGE_DIR = path.join(process.cwd(), "uploads", "backups");

function ensureBackupDir(websiteId: string): string {
  const dir = path.join(BACKUPS_STORAGE_DIR, websiteId.replace(/[^a-zA-Z0-9_-]/g, "_"));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** Default backup label pattern */
function defaultLabel(trigger: BackupTrigger): string {
  const now = new Date();
  const dateStr = now.toISOString().replace("T", " ").slice(0, 16);
  const triggerLabel = {
    manual: "Manual",
    scheduled: "Scheduled",
    "pre-publish": "Pre-Publish",
    "pre-restore": "Pre-Restore",
  }[trigger];
  return `${triggerLabel} Backup — ${dateStr}`;
}

// ---------------------------------------------------------------------------
// Backup Creation
// ---------------------------------------------------------------------------

/**
 * Creates a new backup record from current editorData.
 * Strips backups[] from snapshot and writes durable file to uploads/backups/:websiteId/:backupId.json.
 */
export function createBackupRecord(
  editorData: Record<string, any>,
  options: {
    websiteId?: string;
    trigger?: BackupTrigger;
    label?: string;
    notes?: string;
    expiresAt?: string;
  } = {}
): WebsiteBackup {
  const trigger: BackupTrigger = options.trigger || "manual";

  // Deep clone without backups to prevent snapshot nesting
  const { backups: _omit, ...snapshotData } = editorData;
  const snapshot = JSON.parse(JSON.stringify(snapshotData));

  const id = generateBackupId();
  const sizeBytes = Buffer.byteLength(JSON.stringify(snapshot), "utf8");

  let storagePath: string | undefined;
  if (options.websiteId) {
    try {
      const dir = ensureBackupDir(options.websiteId);
      storagePath = path.join(dir, `${id}.json`);
      fs.writeFileSync(storagePath, JSON.stringify(snapshot, null, 2), "utf8");
    } catch (e) {
      console.warn(`[Backup] Non-fatal: Could not write backup file to disk:`, e);
    }
  }

  return {
    id,
    label: options.label || defaultLabel(trigger),
    trigger,
    status: "ready",
    createdAt: new Date().toISOString(),
    sizeBytes,
    schemaVersion: editorData.version || 1,
    storagePath,
    snapshot,
    notes: options.notes,
    expiresAt: options.expiresAt,
  };
}

// ---------------------------------------------------------------------------
// Backup List Management
// ---------------------------------------------------------------------------

/**
 * Appends a new backup to the list and prunes oldest entries beyond MAX_BACKUPS_PER_WEBSITE.
 */
export function appendBackup(existing: WebsiteBackup[], newBackup: WebsiteBackup): WebsiteBackup[] {
  const updated = [newBackup, ...existing];
  return updated.slice(0, MAX_BACKUPS_PER_WEBSITE);
}

/**
 * Returns backup metadata without the snapshot payload (for list views).
 */
export function stripSnapshot(backup: WebsiteBackup): Omit<WebsiteBackup, "snapshot"> {
  const { snapshot: _s, ...meta } = backup;
  return meta;
}

/**
 * Updates an existing backup's metadata (e.g. label and notes).
 */
export function updateBackupRecord(
  backups: WebsiteBackup[],
  backupId: string,
  patch: { label?: string; notes?: string }
): { updated: WebsiteBackup[]; backup: WebsiteBackup } {
  const index = backups.findIndex((b) => b.id === backupId);
  if (index === -1) {
    throw new Error(`Backup "${backupId}" not found`);
  }
  const existing = backups[index];
  const updatedBackup: WebsiteBackup = {
    ...existing,
    label: typeof patch.label === "string" && patch.label.trim() ? patch.label.trim() : existing.label,
    notes: patch.notes !== undefined ? patch.notes : existing.notes,
  };
  const updatedList = [...backups];
  updatedList[index] = updatedBackup;
  return { updated: updatedList, backup: updatedBackup };
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

/**
 * Restores editorData from a backup snapshot or durable storage file.
 * Returns merged editorData (backup snapshot + original backups[] preserved).
 */
export function restoreFromBackup(
  currentEditorData: Record<string, any>,
  backup: WebsiteBackup
): Record<string, any> {
  if (backup.status !== "ready") {
    throw new Error(`Backup "${backup.id}" is not in a restorable state (status: ${backup.status})`);
  }

  let snapshotData = backup.snapshot;

  // Verify and read from durable file if available and valid
  if (backup.storagePath && fs.existsSync(backup.storagePath)) {
    try {
      const raw = fs.readFileSync(backup.storagePath, "utf8");
      snapshotData = JSON.parse(raw);
    } catch (e) {
      console.warn(`[Backup] Could not read durable backup file at ${backup.storagePath}, falling back to DB snapshot payload`, e);
    }
  }

  const existingBackups = Array.isArray(currentEditorData.backups) ? currentEditorData.backups : [];

  return {
    ...snapshotData,
    backups: existingBackups,
    _lastRestoredFrom: backup.id,
    _lastRestoredAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Expiry Check
// ---------------------------------------------------------------------------

export function pruneExpiredBackups(backups: WebsiteBackup[]): WebsiteBackup[] {
  const now = new Date();
  return backups.filter((b) => {
    if (!b.expiresAt) return true;
    return new Date(b.expiresAt) > now;
  });
}

// ---------------------------------------------------------------------------
// Scheduled Backup Policy
// ---------------------------------------------------------------------------

export interface BackupSchedulePolicy {
  enabled: boolean;
  cronExpression: string;
  retainCount: number;
  trigger: BackupTrigger;
  lastRunAt?: string;
  lastSlotAt?: string;
}

export const DEFAULT_BACKUP_POLICY: BackupSchedulePolicy = {
  enabled: false,
  cronExpression: "0 2 * * *",
  retainCount: 7,
  trigger: "scheduled",
};

export function validateBackupPolicy(raw: any): BackupSchedulePolicy {
  return {
    enabled: raw?.enabled === true,
    cronExpression:
      typeof raw?.cronExpression === "string" && raw.cronExpression.trim()
        ? raw.cronExpression.trim()
        : DEFAULT_BACKUP_POLICY.cronExpression,
    retainCount:
      typeof raw?.retainCount === "number" ? Math.min(25, Math.max(1, raw.retainCount)) : DEFAULT_BACKUP_POLICY.retainCount,
    trigger: (["manual", "scheduled", "pre-publish", "pre-restore"] as const).includes(raw?.trigger)
      ? raw.trigger
      : "scheduled",
    lastRunAt: raw?.lastRunAt || undefined,
    lastSlotAt: raw?.lastSlotAt || undefined,
  };
}

export function deleteBackupFile(
  websiteId: string,
  backupId: string,
  storagePath?: string
): { deleted: boolean; alreadyMissing: boolean; path: string } {
  if (!websiteId || typeof websiteId !== "string") {
    throw new Error("Invalid websiteId for backup file deletion");
  }

  const cleanBackupId = backupId ? String(backupId).trim() : "";
  if (!cleanBackupId || !/^[a-zA-Z0-9_-]+$/.test(cleanBackupId)) {
    throw new Error(`Invalid backupId "${backupId}": contains invalid characters`);
  }

  const safeWebsiteId = websiteId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const siteDir = path.resolve(BACKUPS_STORAGE_DIR, safeWebsiteId);

  let targetPath: string;
  if (storagePath) {
    targetPath = path.resolve(storagePath);
  } else {
    targetPath = path.join(siteDir, `${cleanBackupId}.json`);
  }

  if (fs.existsSync(targetPath)) {
    try {
      fs.unlinkSync(targetPath);
      return { deleted: true, alreadyMissing: false, path: targetPath };
    } catch (err: any) {
      throw new Error(`Failed to delete backup file at ${targetPath}: ${err.message}`);
    }
  }

  return { deleted: false, alreadyMissing: true, path: targetPath };
}

export function matchCronField(fieldStr: string, val: number, isDow: boolean = false): boolean {
  if (!fieldStr || typeof fieldStr !== "string") return false;
  const clean = fieldStr.trim();
  if (clean === "*") return true;

  if (clean.includes(",")) {
    return clean.split(",").some((part) => matchCronField(part, val, isDow));
  }

  if (clean.includes("/")) {
    const [rangePart, stepPart] = clean.split("/");
    const step = parseInt(stepPart, 10);
    if (isNaN(step) || step <= 0) return false;

    if (rangePart === "*" || rangePart === "") {
      return val % step === 0;
    }
    if (rangePart.includes("-")) {
      const [startStr, endStr] = rangePart.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (isNaN(start) || isNaN(end) || val < start || val > end) return false;
      return (val - start) % step === 0;
    }
    const single = parseInt(rangePart, 10);
    return !isNaN(single) && val >= single && (val - single) % step === 0;
  }

  if (clean.includes("-")) {
    const [startStr, endStr] = clean.split("-");
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end)) return false;
    return val >= start && val <= end;
  }

  const num = parseInt(clean, 10);
  if (isNaN(num)) return false;
  if (isDow && num === 7 && val === 0) return true;
  return num === val;
}

export function matchesCron(cronExpr: string, date: Date): boolean {
  if (!cronExpr || typeof cronExpr !== "string") return false;
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [minPart, hourPart, domPart, monthPart, dowPart] = parts;
  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();
  const dom = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const dow = date.getUTCDay();

  if (!matchCronField(minPart, minute, false)) return false;
  if (!matchCronField(hourPart, hour, false)) return false;
  if (!matchCronField(domPart, dom, false)) return false;
  if (!matchCronField(monthPart, month, false)) return false;
  if (!matchCronField(dowPart, dow, true)) return false;

  return true;
}

export function getMostRecentCronSlot(cronExpr: string, now: Date = new Date(), maxLookbackDays: number = 31): Date | null {
  if (!cronExpr || typeof cronExpr !== "string") return null;
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const topOfMinute = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    0,
    0
  ));

  const maxMinutes = maxLookbackDays * 24 * 60;
  for (let m = 0; m <= maxMinutes; m++) {
    const candidate = new Date(topOfMinute.getTime() - m * 60000);
    if (matchesCron(cronExpr, candidate)) {
      return candidate;
    }
  }
  return null;
}

export function isBackupDue(
  policy: BackupSchedulePolicy,
  now: Date = new Date(),
  referenceDate?: Date | null
): boolean {
  if (!policy || !policy.enabled) return false;

  const slot = getMostRecentCronSlot(policy.cronExpression, now);
  if (!slot) return false;

  const lastRun = referenceDate !== undefined
    ? referenceDate
    : policy.lastRunAt
    ? new Date(policy.lastRunAt)
    : null;

  if (!lastRun) return true;
  return slot.getTime() > lastRun.getTime();
}

export function pruneBackupsByRetention(
  websiteId: string,
  backups: WebsiteBackup[],
  retainCount: number
): {
  retained: WebsiteBackup[];
  prunedCount: number;
  errors: string[];
} {
  const safeRetainCount = Math.min(25, Math.max(1, retainCount || DEFAULT_BACKUP_POLICY.retainCount));

  if (!Array.isArray(backups) || backups.length <= safeRetainCount) {
    return { retained: backups || [], prunedCount: 0, errors: [] };
  }

  const sorted = [...backups].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const retained = sorted.slice(0, safeRetainCount);
  const candidatesForDeletion = sorted.slice(safeRetainCount);

  let prunedCount = 0;
  const errors: string[] = [];

  for (const b of candidatesForDeletion) {
    try {
      deleteBackupFile(websiteId, b.id, b.storagePath);
      prunedCount++;
    } catch (err: any) {
      console.warn(`[Backup Retention] Could not delete obsolete backup file "${b.id}" for site "${websiteId}":`, err?.message);
      errors.push(`Failed to delete backup ${b.id}: ${err?.message}`);
      retained.push(b);
    }
  }

  const finalRetained = pruneExpiredBackups(retained);

  return {
    retained: finalRetained,
    prunedCount,
    errors,
  };
}

export async function processScheduledBackupsForWebsite(
  website: { id: string; editorData?: any },
  now: Date = new Date()
): Promise<{
  created: boolean;
  backup?: WebsiteBackup;
  prunedCount: number;
  error?: string;
}> {
  const editorData = website.editorData || {};
  const policy = validateBackupPolicy(editorData.backupPolicy);

  if (!policy.enabled) {
    return { created: false, prunedCount: 0 };
  }

  const slot = getMostRecentCronSlot(policy.cronExpression, now);
  if (!slot) {
    return { created: false, prunedCount: 0 };
  }

  const isDue = isBackupDue(policy, now);
  if (!isDue) {
    return { created: false, prunedCount: 0 };
  }

  const existingBackups: WebsiteBackup[] = Array.isArray(editorData.backups) ? editorData.backups : [];
  const slotIso = slot.toISOString();
  const label = `Scheduled Backup — ${slot.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;

  const newBackup = createBackupRecord(editorData, {
    websiteId: website.id,
    trigger: "scheduled",
    label,
    notes: `Automated scheduled backup created for slot ${slotIso}`,
  });

  const updatedBackups = appendBackup(existingBackups, newBackup);
  const { retained, prunedCount } = pruneBackupsByRetention(website.id, updatedBackups, policy.retainCount);

  const updatedPolicy: BackupSchedulePolicy = {
    ...policy,
    lastRunAt: now.toISOString(),
    lastSlotAt: slotIso,
  };

  const updatedEditorData = {
    ...editorData,
    backupPolicy: updatedPolicy,
    backups: retained,
    _lastBackupAt: newBackup.createdAt,
    _lastBackupTrigger: "scheduled",
  };

  await prisma.website.update({
    where: { id: website.id },
    data: {
      editorData: updatedEditorData,
    },
  });

  return {
    created: true,
    backup: newBackup,
    prunedCount,
  };
}

export async function processAllScheduledBackups(now: Date = new Date()): Promise<{
  processed: number;
  created: number;
  pruned: number;
  failed: number;
  errors: Array<{ websiteId: string; error: string }>;
}> {
  try {
    const websites = await prisma.website.findMany({
      where: {
        status: { not: "DELETED" },
      },
      select: {
        id: true,
        editorData: true,
      },
    });

    let processed = 0;
    let created = 0;
    let pruned = 0;
    let failed = 0;
    const errors: Array<{ websiteId: string; error: string }> = [];

    for (const website of websites) {
      const ed: any = website.editorData || {};
      if (!ed.backupPolicy?.enabled) {
        continue;
      }
      processed++;
      try {
        const res = await processScheduledBackupsForWebsite(website, now);
        if (res.created) created++;
        pruned += res.prunedCount;
      } catch (err: any) {
        failed++;
        errors.push({ websiteId: website.id, error: err?.message || String(err) });
        console.error(`[Scheduled Backup] Error processing website "${website.id}":`, err?.message || err);
      }
    }

    return { processed, created, pruned, failed, errors };
  } catch (err: any) {
    console.error("[Scheduled Backup] Error in processAllScheduledBackups:", err?.message || err);
    return { processed: 0, created: 0, pruned: 0, failed: 0, errors: [] };
  }
}

function generateBackupId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `bkp_${ts}_${rand}`;
}
