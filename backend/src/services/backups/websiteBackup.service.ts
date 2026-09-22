/**
 * Phase 19: Enterprise Multisite — Website Backup Service
 *
 * Provides on-demand and scheduled snapshot creation, listing,
 * restoration, and metadata for website backups.
 *
 * Backups are stored in Website.editorData.backups[] as JSON snapshots.
 * Additive only — does not replace or remove existing data.
 */

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
 * Creates a new backup record from the current editorData.
 * Strips the existing backups[] array from the snapshot to prevent recursion.
 */
export function createBackupRecord(
  editorData: Record<string, any>,
  options: {
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

  const sizeBytes = Buffer.byteLength(JSON.stringify(snapshot), "utf8");

  return {
    id: generateBackupId(),
    label: options.label || defaultLabel(trigger),
    trigger,
    status: "ready",
    createdAt: new Date().toISOString(),
    sizeBytes,
    schemaVersion: editorData.version || 1,
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
  // Prune oldest — keep newest MAX_BACKUPS_PER_WEBSITE
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
 * Restores editorData from a backup snapshot.
 * Returns the merged editorData (backup snapshot + original backups[] preserved).
 */
export function restoreFromBackup(
  currentEditorData: Record<string, any>,
  backup: WebsiteBackup
): Record<string, any> {
  if (backup.status !== "ready") {
    throw new Error(`Backup "${backup.id}" is not in a restorable state (status: ${backup.status})`);
  }

  // Preserve the existing backups list through the restore
  const existingBackups = Array.isArray(currentEditorData.backups) ? currentEditorData.backups : [];

  return {
    ...backup.snapshot,
    // Re-attach backups after restore
    backups: existingBackups,
    // Stamp the restore event
    _lastRestoredFrom: backup.id,
    _lastRestoredAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Expiry Check
// ---------------------------------------------------------------------------

/**
 * Filters out expired backups from a list.
 */
export function pruneExpiredBackups(backups: WebsiteBackup[]): WebsiteBackup[] {
  const now = new Date();
  return backups.filter((b) => {
    if (!b.expiresAt) return true; // never expires
    return new Date(b.expiresAt) > now;
  });
}

// ---------------------------------------------------------------------------
// Scheduled Backup Policy
// ---------------------------------------------------------------------------

export interface BackupSchedulePolicy {
  enabled: boolean;
  /** Cron expression — e.g. "0 2 * * *" for 2 AM daily */
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

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function generateBackupId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `bkp_${ts}_${rand}`;
}
