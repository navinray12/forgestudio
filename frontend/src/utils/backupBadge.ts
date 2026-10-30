export interface BackupTriggerBadgeConfig {
  label: string;
  className: string;
}

/**
 * Returns the badge label and Tailwind styling classes for a given backup trigger.
 * Maps known backend triggers ('manual', 'scheduled', 'pre-publish', 'pre-restore'),
 * legacy 'restore-point', empty/missing triggers, and unknown trigger values safely.
 */
export function getBackupTriggerBadgeConfig(trigger?: unknown): BackupTriggerBadgeConfig {
  if (typeof trigger !== "string" || !trigger.trim()) {
    return {
      label: "Manual",
      className: "px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20",
    };
  }

  const normalized = trigger.trim().toLowerCase();

  switch (normalized) {
    case "pre-publish":
      return {
        label: "Pre-Publish Safety",
        className: "px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20",
      };

    case "scheduled":
      return {
        label: "Scheduled",
        className: "px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
      };

    case "pre-restore":
    case "restore-point":
      return {
        label: "Pre-Restore Safety",
        className: "px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20",
      };

    case "manual":
      return {
        label: "Manual",
        className: "px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20",
      };

    default: {
      // Safe fallback for unknown trigger values without crashing
      const raw = trigger.trim();
      const formatted = raw
        .split(/[-_]/)
        .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
        .filter(Boolean)
        .join(" ");

      return {
        label: formatted || raw || "Unknown",
        className: "px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20",
      };
    }
  }
}
