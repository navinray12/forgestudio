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
  };
}

function generateBackupId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `bkp_${ts}_${rand}`;
}
