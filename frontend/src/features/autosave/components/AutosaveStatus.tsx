import React, { useEffect, useState } from "react";
import type { AutosaveStatus } from "../types/autosave.types";

interface AutosaveStatusProps {
  status: AutosaveStatus;
  lastSavedAt: number | null;
  errorMessage?: string | null;
}

/**
 * Formats lastSavedAt timestamp into human relative string ("just now", "1m ago", etc.)
 */
function formatTimeAgo(timestamp: number | null): string {
  if (!timestamp) return "Saved";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return "Saved just now";
  if (seconds < 60) return `Saved ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Saved ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `Saved ${hours}h ago`;
}

export const AutosaveStatusIndicator: React.FC<AutosaveStatusProps> = ({
  status,
  lastSavedAt,
  errorMessage,
}) => {
  const [timeAgoText, setTimeAgoText] = useState<string>(formatTimeAgo(lastSavedAt));

  // Update relative time display periodically when saved
  useEffect(() => {
    if (status !== "saved" || !lastSavedAt) return;

    setTimeAgoText(formatTimeAgo(lastSavedAt));
    const interval = setInterval(() => {
      setTimeAgoText(formatTimeAgo(lastSavedAt));
    }, 10000);

    return () => clearInterval(interval);
  }, [status, lastSavedAt]);

  if (status === "saving") {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-900/40 border border-blue-700/60 text-blue-300 text-xs font-semibold animate-pulse"
        role="status"
        aria-live="polite"
      >
        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>Saving...</span>
      </div>
    );
  }

  if (status === "unsaved") {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-semibold"
        role="status"
        aria-live="polite"
      >
        <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
        <span>Unsaved changes</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/40 border border-red-800/60 text-red-300 text-xs font-semibold cursor-help"
        title={errorMessage || "Autosave failed. Your changes are safe in memory."}
        role="status"
        aria-live="assertive"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span>Save failed</span>
      </div>
    );
  }

  // Default: Saved state
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/30 border border-emerald-800/50 text-emerald-300 text-xs font-semibold"
      role="status"
      aria-live="polite"
    >
      <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span>{timeAgoText}</span>
    </div>
  );
};
